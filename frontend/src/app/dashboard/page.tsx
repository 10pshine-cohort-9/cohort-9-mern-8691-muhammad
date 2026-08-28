"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useShallow } from "zustand/react/shallow";
import { NoteList } from "@/components/notes/note-list";
import { NotePreviewModal } from "@/components/notes/note-preview-modal";
import { NoteEditorModal } from "@/components/notes/note-editor-modal";
import { FilterPanel, type NoteFilters } from "@/components/notes/filter-panel";
import { Pagination } from "@/components/notes/pagination";
import { LineSidebar } from "@/components/ui/line-sidebar";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useAuthStore, useNotesStore, type NotesNavTab } from "@/lib/store";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { getUserInitials, getNoteExcerpt } from "@/lib/utils";
import {
  useNotesQuery,
  useTogglePinMutation,
  useToggleFavoriteMutation,
  useDeleteNoteMutation,
  notesQueryKeys,
} from "@/lib/hooks/use-notes-query";
import type { Note } from "@/lib/api";
import {
  IconSearch,
  IconClose,
  IconNotes,
  IconSparkles,
  IconPinFilled,
  IconStarFilled,
  IconTag,
  IconClock,
  IconPlus,
  IconUserCircle,
  IconLogout,
} from "@/components/ui/icons";

const NAV_ITEMS = ["My Memories", "Pinned Notes", "Favorites"];

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

// This is a tab navigated dashboard which provides dedicated view for just pinned and just favourite notes along with all respective filtering and searching
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

  const queryClient = useQueryClient();

  // Here we make use of useShallow capability of zustand for fast updates of ui avaoiding irrelevant rerenders of complete dashboard
  const {
    activeTab,
    setActiveTab,
    searchQuery: search,
    setSearchQuery: setSearch,
    sortBy,
    order,
    setSort,
    page,
    setPage,
    dateFrom,
    dateTo,
    setDateRange,
    previewNote,
    setPreviewNote,
    editingNote,
    setEditingNote,
    isCreateOpen,
    setIsCreateOpen,
  } = useNotesStore(
    useShallow((s) => ({
      activeTab: s.activeTab,
      setActiveTab: s.setActiveTab,
      searchQuery: s.searchQuery,
      setSearchQuery: s.setSearchQuery,
      sortBy: s.sortBy,
      order: s.order,
      setSort: s.setSort,
      page: s.page,
      setPage: s.setPage,
      dateFrom: s.dateFrom,
      dateTo: s.dateTo,
      setDateRange: s.setDateRange,
      previewNote: s.previewNote,
      setPreviewNote: s.setPreviewNote,
      editingNote: s.editingNote,
      setEditingNote: s.setEditingNote,
      isCreateOpen: s.isCreateOpen,
      setIsCreateOpen: s.setIsCreateOpen,
    })),
  );

  const [tagFilter, setTagFilter] = useState<string | undefined>(undefined);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const notesQuery = useNotesQuery({ page: 1, limit: 50 });

  const allNotes = useMemo(
    () => notesQuery.data?.data ?? [],
    [notesQuery.data?.data],
  );

  const isLoading = notesQuery.isLoading && !notesQuery.data;

  const stats = useMemo(() => {
    const total = allNotes.length;
    const pinned = allNotes.filter((n) => n.isPinned).length;
    const favorites = allNotes.filter((n) => n.isFavorite).length;
    const allTags = new Set<string>();
    allNotes.forEach((n) => n.tags?.forEach((t) => allTags.add(t)));

    return {
      total,
      pinned,
      favorites,
      tags: allTags.size,
    };
  }, [allNotes]);

  const navIndices: Record<NotesNavTab, number> = {
    all: 0,
    pinned: 1,
    favorites: 2,
  };
  const activeNavIndex = navIndices[activeTab] ?? 0;

  const handleNavClick = (index: number) => {
    setPage(1);
    if (index === 0) setActiveTab("all");
    else if (index === 1) setActiveTab("pinned");
    else if (index === 2) setActiveTab("favorites");
  };

  const togglePinMutation = useTogglePinMutation();
  const toggleFavoriteMutation = useToggleFavoriteMutation();
  const deleteNoteMutation = useDeleteNoteMutation();

  useKeyboardShortcut({
    key: "f",
    onTrigger: () => searchInputRef.current?.focus(),
    enabled: !isCreateOpen && !editingNote && !previewNote,
  });

  useKeyboardShortcut({
    key: "n",
    onTrigger: () => {
      setEditingNote(null);
      setIsCreateOpen(true);
    },
    enabled: !isCreateOpen && !editingNote && !previewNote,
  });

  const filteredNotes = useMemo(() => {
    let list = [...allNotes];

    if (activeTab === "pinned") {
      list = list.filter((n) => n.isPinned);
    } else if (activeTab === "favorites") {
      list = list.filter((n) => n.isFavorite);
    }

    if (tagFilter) {
      const tagQuery = tagFilter.toLowerCase().trim();
      list = list.filter((n) =>
        n.tags?.some((t) => t.toLowerCase().includes(tagQuery)),
      );
    }

    if (dateFrom) {
      const fromTime = new Date(dateFrom).getTime();
      list = list.filter((n) => new Date(n.createdAt).getTime() >= fromTime);
    }
    if (dateTo) {
      const toTime = new Date(dateTo).getTime() + 86400000;
      list = list.filter((n) => new Date(n.createdAt).getTime() <= toTime);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((n) => {
        const matchTitle = n.title?.toLowerCase().includes(q);
        const matchContent = getNoteExcerpt(n.content, 5000)
          .toLowerCase()
          .includes(q);
        const matchTags = n.tags?.some((t) => t.toLowerCase().includes(q));
        return matchTitle || matchContent || matchTags;
      });
    }

    list.sort((a, b) => {
      if (sortBy === "title") {
        return order === "asc"
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      }
      if (sortBy === "createdAt") {
        const diff =
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return order === "asc" ? -diff : diff;
      }
      const diff =
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      return order === "asc" ? -diff : diff;
    });

    return list;
  }, [allNotes, activeTab, tagFilter, dateFrom, dateTo, search, sortBy, order]);

  const pageSize = 12;
  const totalItems = filteredNotes.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedNotes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredNotes.slice(start, start + pageSize);
  }, [filteredNotes, currentPage, pageSize]);

  const openCreate = () => {
    setEditingNote(null);
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

  const handleFilterChange = (f: NoteFilters) => {
    setDateRange(f.dateFrom ?? "", f.dateTo ?? "");
    setTagFilter(f.tags);
  };

  const activeSortKey = `${sortBy}-${order}`;
  const activeSort =
    sortOptions.find((o) => o.value === activeSortKey) || sortOptions[0];
  const ActiveSortIcon = activeSort.icon;

  const activeSectionTitle = NAV_ITEMS[activeNavIndex] || "My Memories";

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden lg:flex w-72 flex-col justify-between border-r border-border bg-card/60 backdrop-blur-md p-5 shrink-0 select-none">
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

          <div className="p-3.5 rounded-2xl border border-border bg-secondary/50 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-extrabold text-sm shadow-sm shrink-0">
                {getUserInitials(user?.name, user?.username)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">
                  {user?.name || `@${user?.username}`}
                </p>
                <p className="truncate text-xs text-muted-foreground font-mono">
                  @{user?.username}
                </p>
              </div>
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
                1: stats.pinned,
                2: stats.favorites,
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

        <div className="pt-4 border-t border-border flex items-center justify-between">
          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-xl p-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <IconUserCircle size={18} className="text-primary" />
            <span>Profile</span>
          </Link>

          <button
            type="button"
            onClick={async () => {
              await logout();
              router.push("/login");
            }}
            aria-label="Log out"
            title="Log out"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
          >
            <IconLogout size={16} />
          </button>
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
            <ThemeToggle />

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
                    ? "Pinned notes pinned to the top"
                    : "Favorited notes and highlights"}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
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
                  tags: tagFilter,
                }}
                onChange={handleFilterChange}
              />
            </div>
          </div>

          <div>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeTab}-${activeNavIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                <NoteList
                  notes={paginatedNotes}
                  isLoading={isLoading}
                  hasActiveSearch={search.trim().length > 0}
                  emptyMessage={
                    activeNavIndex === 1
                      ? "No pinned notes yet. Pin important memories to find them quickly."
                      : activeNavIndex === 2
                        ? "No favorites yet. Star memories to add them to your favorites."
                        : undefined
                  }
                  onOpen={handleOpenPreview}
                  onEdit={handleOpenEdit}
                  onTogglePin={handleTogglePin}
                  onToggleFavorite={handleToggleFavorite}
                  onDelete={handleDelete}
                  onCreateNote={openCreate}
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
        onDelete={handleDelete}
      />

      <NoteEditorModal
        open={isCreateOpen || !!editingNote}
        note={editingNote}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingNote(null);
        }}
        onSaved={handleSaved}
      />
    </div>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}
