"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useShallow } from "zustand/react/shallow";
import { NoteList } from "@/components/notes/note-list";
import { NotePreviewModal } from "@/components/notes/note-preview-modal";
import { NoteEditorModal } from "@/components/notes/note-editor-modal";
import { TemplateGalleryModal } from "@/components/notes/template-gallery-modal";
import { FilterPanel, type NoteFilters } from "@/components/notes/filter-panel";
import { SelectionBar } from "@/components/notes/selection-bar";
import { ExportModal } from "@/components/notes/export-modal";
import { ImportModal } from "@/components/notes/import-modal";
import { ShareModal } from "@/components/notes/share-modal";
import { VersionHistoryPanel } from "@/components/notes/version-history-panel";
import { Pagination } from "@/components/notes/pagination";
import { LineSidebar } from "@/components/ui/line-sidebar";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { NotificationDrawer } from "@/components/notifications/notification-drawer";
import {
  useAuthStore,
  useNotificationsStore,
  useNotesStore,
} from "@/lib/store";
import { getSocket } from "@/lib/socket";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getUserInitials, getNoteExcerpt } from "@/lib/utils";
import {
  useNotesQuery,
  useScopeNotesQuery,
  useTogglePinMutation,
  useToggleFavoriteMutation,
  useDeleteNoteMutation,
  useBulkActionMutation,
  notesQueryKeys,
} from "@/lib/hooks/use-notes-query";
import type { Note, NoteTemplate, PaginatedNotes } from "@/lib/api";
import {
  IconSearch,
  IconClose,
  IconUpload,
  IconDownload,
  IconNotes,
  IconSparkles,
  IconCheck,
  IconPinFilled,
  IconStarFilled,
  IconTag,
  IconClock,
  IconPlus,
  IconUserCircle,
  IconLogout,
} from "@/components/ui/icons";

const NAV_ITEMS = [
  "My Memories",
  "Shared with Me",
  "Pinned Notes",
  "Favorites",
];

const sortOptions = [
  {
    value: "updatedAt-desc",
    label: "Recently updated",
    sortBy: "updatedAt" as const,
    order: "desc" as const,
    icon: IconClock,
  },
  {
    value: "createdAt-desc",
    label: "Newest first",
    sortBy: "createdAt" as const,
    order: "desc" as const,
    icon: IconSparkles,
  },
  {
    value: "title-asc",
    label: "Title (A-Z)",
    sortBy: "title" as const,
    order: "asc" as const,
    icon: IconNotes,
  },
];

function DashboardContent() {
  const user = useAuthStore((s) => s.user);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  useEffect(() => {
    if (isInitialized && !isAuthLoading && !user) {
      router.replace("/login");
    }
  }, [isInitialized, isAuthLoading, user, router]);

  const isConnected = useNotificationsStore((s) => s.isConnected);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const queryClient = useQueryClient();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const {
    scope,
    setScope,
    searchQuery: search,
    setSearchQuery: setSearch,
    sortBy,
    order,
    setSort,
    page,
    setPage,
    dateFrom,
    dateTo,
    hasCollaborators,
    setDateRange,
    setHasCollaborators,
    selectionMode,
    selectedIds,
    toggleSelectionMode,
    toggleSelectId,
    clearSelection,
    previewNote,
    setPreviewNote,
    editingNote,
    setEditingNote,
    isCreateOpen,
    setIsCreateOpen,
    shareNote,
    setShareNote,
    historyNote,
    setHistoryNote,
    isExportOpen,
    setIsExportOpen,
    isImportOpen,
    setIsImportOpen,
    isTemplateOpen,
    setIsTemplateOpen,
  } = useNotesStore(
    useShallow((s) => ({
      scope: s.scope,
      setScope: s.setScope,
      searchQuery: s.searchQuery,
      setSearchQuery: s.setSearchQuery,
      sortBy: s.sortBy,
      order: s.order,
      setSort: s.setSort,
      page: s.page,
      setPage: s.setPage,
      dateFrom: s.dateFrom,
      dateTo: s.dateTo,
      hasCollaborators: s.hasCollaborators,
      setDateRange: s.setDateRange,
      setHasCollaborators: s.setHasCollaborators,
      selectionMode: s.selectionMode,
      selectedIds: s.selectedIds,
      toggleSelectionMode: s.toggleSelectionMode,
      toggleSelectId: s.toggleSelectId,
      clearSelection: s.clearSelection,
      previewNote: s.previewNote,
      setPreviewNote: s.setPreviewNote,
      editingNote: s.editingNote,
      setEditingNote: s.setEditingNote,
      isCreateOpen: s.isCreateOpen,
      setIsCreateOpen: s.setIsCreateOpen,
      shareNote: s.shareNote,
      setShareNote: s.setShareNote,
      historyNote: s.historyNote,
      setHistoryNote: s.setHistoryNote,
      isExportOpen: s.isExportOpen,
      setIsExportOpen: s.setIsExportOpen,
      isImportOpen: s.isImportOpen,
      setIsImportOpen: s.setIsImportOpen,
      isTemplateOpen: s.isTemplateOpen,
      setIsTemplateOpen: s.setIsTemplateOpen,
    })),
  );

  const [activeNavIndex, setActiveNavIndex] = useState(0);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [tagFilter, setTagFilter] = useState<string | undefined>(undefined);
  const [pendingTemplate, setPendingTemplate] = useState<NoteTemplate | null>(
    null,
  );
  const [exportIds, setExportIds] = useState<string[] | undefined>(undefined);
  const [recentlyUpdatedIds, setRecentlyUpdatedIds] = useState<Set<string>>(
    new Set(),
  );

  const searchInputRef = useRef<HTMLInputElement>(null);

  const ownedNotesQuery = useScopeNotesQuery("owned");
  const sharedNotesQuery = useScopeNotesQuery("shared");

  const ownedNotes = useMemo(
    () => ownedNotesQuery.data?.data ?? [],
    [ownedNotesQuery.data?.data],
  );
  const sharedNotes = useMemo(
    () => sharedNotesQuery.data?.data ?? [],
    [sharedNotesQuery.data?.data],
  );

  const searchParams = useSearchParams();
  const noteIdParam = searchParams.get("preview") || searchParams.get("noteId");
  useEffect(() => {
    if (noteIdParam) {
      const match = [...ownedNotes, ...sharedNotes].find(
        (n) => n.id === noteIdParam,
      );
      if (match) {
        setPreviewNote(match);
      }
    }
  }, [noteIdParam, ownedNotes, sharedNotes, setPreviewNote]);

  const stats = useMemo(() => {
    const totalOwned = ownedNotes.length;
    const pinnedCount =
      ownedNotes.filter((n) => n.isPinned).length +
      sharedNotes.filter((n) => n.isPinned).length;
    const favoritesCount =
      ownedNotes.filter((n) => n.isFavorite).length +
      sharedNotes.filter((n) => n.isFavorite).length;
    const collaboratedCount = sharedNotes.length;
    const allTags = new Set<string>();
    ownedNotes.forEach((n) => n.tags?.forEach((t) => allTags.add(t)));
    sharedNotes.forEach((n) => n.tags?.forEach((t) => allTags.add(t)));

    return {
      total: totalOwned,
      pinned: pinnedCount,
      favorites: favoritesCount,
      collaborated: collaboratedCount,
      tags: allTags.size,
    };
  }, [ownedNotes, sharedNotes]);

  const handleNavClick = (index: number) => {
    setActiveNavIndex(index);
    setPage(1);
    clearSelection();
    if (index === 0) {
      setScope("owned");
      setPinnedOnly(false);
      setFavoritesOnly(false);
    } else if (index === 1) {
      setScope("shared");
      setPinnedOnly(false);
      setFavoritesOnly(false);
    } else if (index === 2) {
      setScope("owned");
      setPinnedOnly(true);
      setFavoritesOnly(false);
    } else if (index === 3) {
      setScope("owned");
      setPinnedOnly(false);
      setFavoritesOnly(true);
    }
  };

  const togglePinMutation = useTogglePinMutation(scope);
  const toggleFavoriteMutation = useToggleFavoriteMutation(scope);
  const deleteNoteMutation = useDeleteNoteMutation(scope);
  const bulkActionMutation = useBulkActionMutation(scope);

  useKeyboardShortcut({
    key: "f",
    onTrigger: () => searchInputRef.current?.focus(),
    enabled: !isCreateOpen && !editingNote && !previewNote,
  });

  useKeyboardShortcut({
    key: "n",
    onTrigger: () => {
      setPendingTemplate(null);
      setEditingNote(null);
      setIsCreateOpen(true);
    },
    enabled: !isCreateOpen && !editingNote && !isTemplateOpen && !previewNote,
  });

  const debouncedSearch = useDebouncedValue(search, 300);

  const activeScope = activeNavIndex === 1 ? "shared" : scope;
  const isPinnedFilter = activeNavIndex === 2 ? true : pinnedOnly;
  const isFavoritesFilter = activeNavIndex === 3 ? true : favoritesOnly;

  const serverNotesQuery = useNotesQuery({
    scope: activeScope,
    page,
    limit: 12,
    search: debouncedSearch.trim() || undefined,
    sortBy,
    order,
    tags: tagFilter || undefined,
    pinnedOnly: isPinnedFilter,
    favoritesOnly: isFavoritesFilter,
    hasCollaborators,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const serverNotes = useMemo(
    () => serverNotesQuery.data?.data ?? [],
    [serverNotesQuery.data?.data],
  );

  const displayNotes = useMemo(() => {
    let list = serverNotes;

    if (search.trim() && search.trim() !== debouncedSearch.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((n) => {
        const matchTitle = n.title?.toLowerCase().includes(q);
        const matchContent = getNoteExcerpt(n.content, 5000)
          .toLowerCase()
          .includes(q);
        const matchTags = n.tags?.some((t) => t.toLowerCase().includes(q));
        return matchTitle || matchContent || matchTags;
      });
    }

    return list;
  }, [serverNotes, search, debouncedSearch]);

  const joinedRoomsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !isConnected) return;
    const currentNoteIds = new Set(displayNotes.map((n) => n.id));
    currentNoteIds.forEach((id) => {
      if (!joinedRoomsRef.current.has(id)) {
        socket.emit("note:join", id);
        joinedRoomsRef.current.add(id);
      }
    });
    joinedRoomsRef.current.forEach((id) => {
      if (!currentNoteIds.has(id)) {
        socket.emit("note:leave", id);
        joinedRoomsRef.current.delete(id);
      }
    });
  }, [displayNotes, isConnected]);
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !isConnected) return;
    const flashUpdated = (id: string) => {
      setRecentlyUpdatedIds((prev) => new Set(prev).add(id));
      setTimeout(() => {
        setRecentlyUpdatedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 2500);
    };
    const handleUpdated = ({
      note: updatedNote,
      editedByUserId,
    }: {
      note: Note;
      editedByUserId: string;
    }) => {
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.lists() });
      if (editedByUserId !== user?.id) flashUpdated(updatedNote.id);
    };
    const handleDeleted = () => {
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.lists() });
    };
    socket.on("note:updated", handleUpdated);
    socket.on("note:deleted", handleDeleted);
    return () => {
      socket.off("note:updated", handleUpdated);
      socket.off("note:deleted", handleDeleted);
    };
  }, [user?.id, isConnected, queryClient]);

  const totalItems = serverNotesQuery.data?.meta.total ?? displayNotes.length;
  const totalPages = serverNotesQuery.data?.meta.totalPages ?? 1;
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const isLoading = serverNotesQuery.isLoading && !serverNotesQuery.data;

  const openCreate = () => {
    setPendingTemplate(null);
    setEditingNote(null);
    setIsCreateOpen(true);
  };

  const openCreateFromTemplate = (template: NoteTemplate) => {
    setPendingTemplate(template);
    setEditingNote(null);
    setIsTemplateOpen(false);
    setIsCreateOpen(true);
  };

  const handleOpenPreview = (note: Note) => {
    setPreviewNote(note);
  };

  const handleOpenEdit = (note: Note) => {
    setEditingNote(note);
  };

  const handleSaved = async () => {
    setIsCreateOpen(false);
    setEditingNote(null);
    queryClient.invalidateQueries({ queryKey: notesQueryKeys.lists() });
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/login");
    } catch {
      router.replace("/login");
    }
  };

  const handleTogglePin = (note: Note) => {
    togglePinMutation.mutate({ id: note.id, isPinned: !note.isPinned });
    if (previewNote?.id === note.id) {
      setPreviewNote({ ...previewNote, isPinned: !previewNote.isPinned });
    }
  };

  const handleToggleFavorite = (note: Note) => {
    toggleFavoriteMutation.mutate({
      id: note.id,
      isFavorite: !note.isFavorite,
    });
    if (previewNote?.id === note.id) {
      setPreviewNote({ ...previewNote, isFavorite: !previewNote.isFavorite });
    }
  };

  const handleDelete = async (note: Note) => {
    deleteNoteMutation.mutate(note.id);
    if (previewNote?.id === note.id) {
      setPreviewNote(null);
    }
  };

  const handleOpenShare = (note: Note) => {
    setShareNote(note);
  };

  const handleOpenHistory = (note: Note) => {
    setHistoryNote(note);
  };

  const handleExportSingle = (note: Note) => {
    setExportIds([note.id]);
    setIsExportOpen(true);
  };

  const runBulk = async (
    action: "pin" | "unpin" | "delete" | "favorite" | "unfavorite",
  ) => {
    if (selectedIds.size === 0) return;
    bulkActionMutation.mutate(
      { noteIds: Array.from(selectedIds), action },
      {
        onSuccess: () => {
          clearSelection();
        },
      },
    );
  };

  const handleFilterChange = (f: NoteFilters) => {
    setDateRange(f.dateFrom ?? "", f.dateTo ?? "");
    setHasCollaborators(f.hasCollaborators);
    setTagFilter(f.tags);
  };

  const activeSortKey = `${sortBy}-${order}`;
  const activeSort =
    sortOptions.find((o) => o.value === activeSortKey) || sortOptions[0];
  const ActiveSortIcon = activeSort.icon;

  const activeSectionTitle = NAV_ITEMS[activeNavIndex] || "My Memories";

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden lg:flex w-72 flex-col border-r border-border bg-card/60 backdrop-blur-md p-5 shrink-0 select-none">
        <div className="space-y-6">
          <div>
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <div className="flex items-center text-2xl font-black tracking-tight">
                <span className="brand-title-mem">MEM</span>
                <span className="brand-title-ories">ORIES</span>
              </div>
            </Link>
            <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
              Personal Workspace
            </p>
          </div>

          <div className="p-3.5 rounded-2xl border border-border bg-secondary/50">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-extrabold text-sm shadow-sm shrink-0">
                  {getUserInitials(user?.name, user?.username)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">
                    {user?.name ||
                      (user?.username ? `@${user.username}` : "Loading...")}
                  </p>
                  <p className="truncate text-xs text-muted-foreground font-mono">
                    {user?.username ? `@${user.username}` : ""}
                  </p>
                </div>
              </div>
              <div
                className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                  isConnected
                    ? "bg-emerald-500 shadow-sm shadow-emerald-500/50"
                    : "bg-amber-500"
                }`}
                title={
                  isConnected ? "Real-time Live Sync Active" : "Connecting..."
                }
              />
            </div>
            <div className="flex items-center gap-2 pt-2.5 border-t border-border/60">
              <Link
                href="/profile"
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-semibold text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
              >
                <IconUserCircle size={14} className="text-primary" />
                Profile
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Log out"
                title="Log out"
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-semibold text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <IconLogout size={14} />
                Log out
              </button>
            </div>
          </div>

          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Workspace Views
            </p>
            <LineSidebar
              items={NAV_ITEMS}
              active={activeNavIndex}
              onItemClick={handleNavClick}
              accentColor="var(--primary)"
              showMarker={true}
              showIndex={true}
              proximityRadius={80}
              maxShift={14}
              markerLength={28}
              itemGap={8}
              itemBadges={{
                0: stats.total,
                1: stats.collaborated,
                2: stats.pinned,
                3: stats.favorites,
              }}
            />
          </div>

          <div className="rounded-2xl border border-border bg-card p-3.5 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                <IconNotes size={14} className="text-primary" /> Total Memories
              </span>
              <span className="font-mono font-bold text-foreground">
                {stats.total}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                <IconPinFilled size={14} className="text-amber-500" /> Pinned
              </span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                {stats.pinned}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                <IconStarFilled size={14} className="text-rose-500" /> Favorites
              </span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                {stats.favorites}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                <IconTag size={14} className="text-blue-500" /> Tags
              </span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                {stats.tags}
              </span>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <IconSearch
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search memories… (Ctrl+F)"
              aria-label="Search notes"
              className="h-10 w-full rounded-xl border border-border bg-secondary/50 pl-9 pr-8 text-xs sm:text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/30"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
              >
                <IconClose size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            {scope === "owned" && (
              <>
                <button
                  type="button"
                  onClick={() => setIsTemplateOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 h-9 rounded-xl border border-border bg-secondary/60 hover:bg-secondary px-3 text-xs font-semibold text-foreground transition-colors cursor-pointer"
                >
                  <IconSparkles size={14} className="text-primary" />
                  <span>Templates</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsImportOpen(true)}
                  className="hidden md:inline-flex items-center gap-1.5 h-9 rounded-xl border border-border bg-secondary/60 hover:bg-secondary px-3 text-xs font-semibold text-foreground transition-colors cursor-pointer"
                >
                  <IconUpload size={14} />
                  <span>Import</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExportIds(undefined);
                    setIsExportOpen(true);
                  }}
                  className="hidden md:inline-flex items-center gap-1.5 h-9 rounded-xl border border-border bg-secondary/60 hover:bg-secondary px-3 text-xs font-semibold text-foreground transition-colors cursor-pointer"
                >
                  <IconDownload size={14} />
                  <span>Export</span>
                </button>
              </>
            )}

            <ThemeToggle />

            <NotificationBell
              unreadCount={unreadCount}
              onClick={() => setNotificationsOpen(true)}
            />

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 h-9 rounded-xl bg-primary text-primary-foreground font-bold px-3.5 text-xs sm:text-sm shadow-md hover:bg-primary/90 transition-all hover:scale-102 cursor-pointer shrink-0"
            >
              <IconPlus size={16} />
              <span>New Note</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                  {activeSectionTitle}
                </h1>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border">
                  {totalItems} {totalItems === 1 ? "item" : "items"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeNavIndex === 0
                  ? "All personal notes in your workspace"
                  : activeNavIndex === 1
                    ? "Notes and collaborative documents shared with you"
                    : activeNavIndex === 2
                      ? "Pinned notes pinned to the top"
                      : "Favorited notes and highlights"}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {scope === "owned" && (
                <button
                  type="button"
                  onClick={toggleSelectionMode}
                  className={`flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors cursor-pointer ${
                    selectionMode
                      ? "border-primary bg-primary text-primary-foreground font-bold"
                      : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <IconCheck size={14} />
                  <span>{selectionMode ? "Done Selecting" : "Select"}</span>
                </button>
              )}

              <div className="relative flex h-9 items-center gap-1.5 rounded-xl border border-border bg-secondary/60 hover:bg-secondary px-2.5 text-xs font-semibold text-foreground transition-colors">
                <ActiveSortIcon
                  size={13}
                  className="text-primary pointer-events-none shrink-0"
                />
                <select
                  aria-label="Sort notes"
                  value={activeSortKey}
                  onChange={(e) => {
                    const opt = sortOptions.find(
                      (o) => o.value === e.target.value,
                    );
                    if (opt) setSort(opt.sortBy, opt.order);
                  }}
                  className="cursor-pointer appearance-none bg-transparent pr-2 outline-none font-semibold text-foreground text-xs"
                >
                  {sortOptions.map((opt) => (
                    <option
                      key={opt.value}
                      value={opt.value}
                      className="bg-card text-foreground py-1 font-medium"
                    >
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <FilterPanel
                filters={{
                  dateFrom: dateFrom || undefined,
                  dateTo: dateTo || undefined,
                  hasCollaborators,
                  tags: tagFilter,
                }}
                onChange={handleFilterChange}
              />
            </div>
          </div>

          <div>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${scope}-${pinnedOnly}-${favoritesOnly}-${activeNavIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                <NoteList
                  notes={displayNotes}
                  isLoading={isLoading}
                  hasActiveSearch={search.trim().length > 0}
                  emptyMessage={
                    scope === "shared"
                      ? "No memories have been shared with you yet."
                      : activeNavIndex === 2
                        ? "No pinned notes yet. Pin important memories to find them quickly."
                        : activeNavIndex === 3
                          ? "No favorites yet. Star memories to add them to your favorites."
                          : undefined
                  }
                  recentlyUpdatedIds={recentlyUpdatedIds}
                  onOpen={handleOpenPreview}
                  onEdit={handleOpenEdit}
                  onTogglePin={handleTogglePin}
                  onToggleFavorite={handleToggleFavorite}
                  onDelete={handleDelete}
                  onCreateNote={openCreate}
                  selectionMode={selectionMode}
                  selectedIds={selectedIds}
                  onToggleSelect={(n) => toggleSelectId(n.id)}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </main>
      </div>

      <NotePreviewModal
        note={previewNote}
        opened={!!previewNote}
        onClose={() => setPreviewNote(null)}
        onEdit={(note) => {
          setPreviewNote(null);
          handleOpenEdit(note);
        }}
        onTogglePin={handleTogglePin}
        onToggleFavorite={handleToggleFavorite}
        onShare={handleOpenShare}
        onViewHistory={handleOpenHistory}
        onExport={handleExportSingle}
        onDelete={handleDelete}
      />

      <NoteEditorModal
        open={isCreateOpen || !!editingNote}
        note={editingNote}
        template={pendingTemplate}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingNote(null);
        }}
        onSaved={handleSaved}
      />

      <TemplateGalleryModal
        open={isTemplateOpen}
        onClose={() => setIsTemplateOpen(false)}
        onSelect={openCreateFromTemplate}
      />

      <ShareModal
        open={!!shareNote}
        note={shareNote}
        onClose={() => setShareNote(null)}
      />

      <VersionHistoryPanel
        open={!!historyNote}
        noteId={historyNote?.id ?? null}
        currentContent={historyNote?.content}
        canRestore={
          historyNote?.viewerRole === "owner" ||
          historyNote?.viewerRole === "write" ||
          historyNote?.viewerRole === undefined
        }
        onClose={() => setHistoryNote(null)}
        onRestored={(restored) => {
          if (previewNote && previewNote.id === restored.id) {
            setPreviewNote(restored);
          }
          if (editingNote && editingNote.id === restored.id) {
            setEditingNote(restored);
          }
          queryClient.setQueriesData<PaginatedNotes>(
            { queryKey: notesQueryKeys.lists() },
            (old) => {
              if (!old) return old;
              return {
                ...old,
                data: old.data.map((n) =>
                  n.id === restored.id ? restored : n,
                ),
              };
            },
          );
          queryClient.invalidateQueries({ queryKey: notesQueryKeys.all });
        }}
      />

      <ExportModal
        open={isExportOpen}
        noteIds={exportIds}
        onClose={() => {
          setIsExportOpen(false);
          setExportIds(undefined);
        }}
      />

      <ImportModal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImported={() => {
          queryClient.invalidateQueries({ queryKey: notesQueryKeys.lists() });
        }}
      />

      <NotificationDrawer
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />

      <SelectionBar
        count={selectedIds.size}
        busy={bulkActionMutation.isPending}
        canExport={scope !== "shared" && activeNavIndex !== 1}
        canDelete={scope !== "shared" && activeNavIndex !== 1}
        onPin={() => runBulk("pin")}
        onUnpin={() => runBulk("unpin")}
        onFavorite={() => runBulk("favorite")}
        onUnfavorite={() => runBulk("unfavorite")}
        onDelete={() => runBulk("delete")}
        onExport={() => {
          setExportIds(Array.from(selectedIds));
          setIsExportOpen(true);
        }}
        onClear={clearSelection}
      />
    </div>
  );
}

export default function DashboardPage(): React.ReactElement {
  return <DashboardContent />;
}
