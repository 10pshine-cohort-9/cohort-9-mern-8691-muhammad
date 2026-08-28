import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Note, NoteSortField, SortOrder } from "@/lib/schemas";

export type NotesNavTab = "all" | "pinned" | "favorites";

interface NotesState {
  activeTab: NotesNavTab;
  setActiveTab: (tab: NotesNavTab) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedTags: string[];
  toggleTag: (tag: string) => void;
  clearTags: () => void;
  dateFrom: string;
  dateTo: string;
  setDateRange: (from: string, to: string) => void;
  clearFilters: () => void;
  sortBy: NoteSortField;
  order: SortOrder;
  setSort: (sortBy: NoteSortField, order: SortOrder) => void;
  page: number;
  setPage: (page: number) => void;
  previewNote: Note | null;
  setPreviewNote: (note: Note | null) => void;
  editingNote: Note | null;
  setEditingNote: (note: Note | null) => void;
  isCreateOpen: boolean;
  setIsCreateOpen: (open: boolean) => void;
  isFilterDrawerOpen: boolean;
  setIsFilterDrawerOpen: (open: boolean) => void;
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set) => ({
      activeTab: "all",
      setActiveTab: (activeTab) => set({ activeTab, page: 1 }),
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
      clearFilters: () =>
        set({
          selectedTags: [],
          dateFrom: "",
          dateTo: "",
          page: 1,
        }),
      sortBy: "updatedAt",
      order: "desc",
      setSort: (sortBy, order) => set({ sortBy, order, page: 1 }),
      page: 1,
      setPage: (page) => set({ page }),
      previewNote: null,
      setPreviewNote: (previewNote) => set({ previewNote }),
      editingNote: null,
      setEditingNote: (editingNote) => set({ editingNote }),
      isCreateOpen: false,
      setIsCreateOpen: (isCreateOpen) => set({ isCreateOpen }),
      isFilterDrawerOpen: false,
      setIsFilterDrawerOpen: (isFilterDrawerOpen) =>
        set({ isFilterDrawerOpen }),
    }),
    {
      name: "memories-view-preferences",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeTab: state.activeTab,
        sortBy: state.sortBy,
        order: state.order,
      }),
    },
  ),
);

export const useNotesActiveTab = () => useNotesStore((s) => s.activeTab);
export const useNotesSearchQuery = () => useNotesStore((s) => s.searchQuery);
export const useNotesPage = () => useNotesStore((s) => s.page);
export const useNotesSelectedTags = () => useNotesStore((s) => s.selectedTags);
export const useNotesSortBy = () => useNotesStore((s) => s.sortBy);
export const useNotesOrder = () => useNotesStore((s) => s.order);
export const useNotesPreviewNote = () => useNotesStore((s) => s.previewNote);
export const useNotesEditingNote = () => useNotesStore((s) => s.editingNote);
export const useNotesIsCreateOpen = () => useNotesStore((s) => s.isCreateOpen);
export const useNotesIsFilterDrawerOpen = () =>
  useNotesStore((s) => s.isFilterDrawerOpen);
