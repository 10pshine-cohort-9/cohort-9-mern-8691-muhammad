import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Note, NoteScope, NoteSortField, SortOrder } from "@/lib/schemas";

interface NotesState {
  scope: NoteScope;
  setScope: (scope: NoteScope) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedTags: string[];
  toggleTag: (tag: string) => void;
  clearTags: () => void;
  dateFrom: string;
  dateTo: string;
  setDateRange: (from: string, to: string) => void;
  hasCollaborators: boolean | undefined;
  setHasCollaborators: (val: boolean | undefined) => void;
  clearFilters: () => void;
  sortBy: NoteSortField;
  order: SortOrder;
  setSort: (sortBy: NoteSortField, order: SortOrder) => void;
  page: number;
  setPage: (page: number) => void;
  selectionMode: boolean;
  selectedIds: Set<string>;
  toggleSelectionMode: () => void;
  toggleSelectId: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  previewNote: Note | null;
  setPreviewNote: (note: Note | null) => void;
  editingNote: Note | null;
  setEditingNote: (note: Note | null) => void;
  isCreateOpen: boolean;
  setIsCreateOpen: (open: boolean) => void;
  shareNote: Note | null;
  setShareNote: (note: Note | null) => void;
  historyNote: Note | null;
  setHistoryNote: (note: Note | null) => void;
  isExportOpen: boolean;
  setIsExportOpen: (open: boolean) => void;
  isImportOpen: boolean;
  setIsImportOpen: (open: boolean) => void;
  isTemplateOpen: boolean;
  setIsTemplateOpen: (open: boolean) => void;
  isFilterDrawerOpen: boolean;
  setIsFilterDrawerOpen: (open: boolean) => void;
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set) => ({
      scope: "owned",
      setScope: (scope) => set({ scope, page: 1 }),

      searchQuery: "",
      setSearchQuery: (searchQuery) => set({ searchQuery }),

      selectedTags: [],
      toggleTag: (tag) =>
        set((state) => {
          const exists = state.selectedTags.includes(tag);
          return {
            selectedTags: exists
              ? state.selectedTags.filter((t) => t !== tag)
              : [...state.selectedTags, tag],
            page: 1,
          };
        }),
      clearTags: () => set({ selectedTags: [], page: 1 }),

      dateFrom: "",
      dateTo: "",
      setDateRange: (dateFrom, dateTo) => set({ dateFrom, dateTo, page: 1 }),

      hasCollaborators: undefined,
      setHasCollaborators: (hasCollaborators) =>
        set({ hasCollaborators, page: 1 }),

      clearFilters: () =>
        set({
          selectedTags: [],
          dateFrom: "",
          dateTo: "",
          hasCollaborators: undefined,
          page: 1,
        }),

      sortBy: "updatedAt",
      order: "desc",
      setSort: (sortBy, order) => set({ sortBy, order, page: 1 }),

      page: 1,
      setPage: (page) => set({ page }),

      selectionMode: false,
      selectedIds: new Set<string>(),
      toggleSelectionMode: () =>
        set((state) => ({
          selectionMode: !state.selectionMode,
          selectedIds: new Set<string>(),
        })),
      toggleSelectId: (id) =>
        set((state) => {
          const next = new Set(state.selectedIds);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return { selectedIds: next };
        }),
      selectAll: (ids) => set({ selectedIds: new Set(ids) }),
      clearSelection: () =>
        set({ selectionMode: false, selectedIds: new Set<string>() }),

      previewNote: null,
      setPreviewNote: (previewNote) => set({ previewNote }),

      editingNote: null,
      setEditingNote: (editingNote) => set({ editingNote }),

      isCreateOpen: false,
      setIsCreateOpen: (isCreateOpen) => set({ isCreateOpen }),

      shareNote: null,
      setShareNote: (shareNote) => set({ shareNote }),

      historyNote: null,
      setHistoryNote: (historyNote) => set({ historyNote }),

      isExportOpen: false,
      setIsExportOpen: (isExportOpen) => set({ isExportOpen }),

      isImportOpen: false,
      setIsImportOpen: (isImportOpen) => set({ isImportOpen }),

      isTemplateOpen: false,
      setIsTemplateOpen: (isTemplateOpen) => set({ isTemplateOpen }),

      isFilterDrawerOpen: false,
      setIsFilterDrawerOpen: (isFilterDrawerOpen) =>
        set({ isFilterDrawerOpen }),
    }),
    {
      name: "memories-view-preferences",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        scope: state.scope,
        sortBy: state.sortBy,
        order: state.order,
      }),
    },
  ),
);

export const useNotesScope = () => useNotesStore((s) => s.scope);
export const useNotesSearchQuery = () => useNotesStore((s) => s.searchQuery);
export const useNotesPage = () => useNotesStore((s) => s.page);
export const useNotesSelectionMode = () =>
  useNotesStore((s) => s.selectionMode);
export const useNotesSelectedIds = () => useNotesStore((s) => s.selectedIds);
