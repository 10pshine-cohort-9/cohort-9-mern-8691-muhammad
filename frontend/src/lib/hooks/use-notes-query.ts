import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  type BulkActionInput,
  type CreateNoteInput,
  type Note,
  type NoteScope,
  notesApi,
  type NotesQueryInput,
  type PaginatedNotes,
  type UpdateNoteInput,
} from "@/lib/api";

export const notesQueryKeys = {
  all: ["notes"] as const,
  lists: () => [...notesQueryKeys.all, "list"] as const,
  list: (query: NotesQueryInput) => [...notesQueryKeys.lists(), query] as const,
  scope: (scope: NoteScope) =>
    [...notesQueryKeys.lists(), "scope", scope] as const,
  details: () => [...notesQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...notesQueryKeys.details(), id] as const,
};

export function useNotesQuery(query: NotesQueryInput) {
  return useQuery<PaginatedNotes>({
    queryKey: notesQueryKeys.list(query),
    queryFn: () => notesApi.list(query),
    staleTime: 1000 * 30,
    placeholderData: (previousData) => previousData,
  });
}

export function useScopeNotesQuery(scope: NoteScope) {
  return useQuery<PaginatedNotes>({
    queryKey: notesQueryKeys.scope(scope),
    queryFn: async () => {
      const firstPage = await notesApi.list({ scope, page: 1, limit: 50 });
      if (firstPage.meta.totalPages <= 1) {
        return firstPage;
      }
      const remainingPages = await Promise.all(
        Array.from({ length: firstPage.meta.totalPages - 1 }, (_, i) =>
          notesApi.list({ scope, page: i + 2, limit: 50 }),
        ),
      );
      const allData = [
        ...firstPage.data,
        ...remainingPages.flatMap((p) => p.data),
      ];
      return {
        data: allData,
        meta: {
          ...firstPage.meta,
          total: firstPage.meta.total,
          totalPages: 1,
          limit: allData.length,
        },
      };
    },
    staleTime: 1000 * 30,
  });
}

export function useTogglePinMutation(_scope: NoteScope = "owned") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isPinned }: { id: string; isPinned: boolean }) =>
      notesApi.update(id, { isPinned }),
    onMutate: async ({ id, isPinned }) => {
      await queryClient.cancelQueries({ queryKey: notesQueryKeys.lists() });
      const ownedKey = notesQueryKeys.scope("owned");
      const sharedKey = notesQueryKeys.scope("shared");

      const prevOwned = queryClient.getQueryData<PaginatedNotes>(ownedKey);
      const prevShared = queryClient.getQueryData<PaginatedNotes>(sharedKey);

      if (prevOwned) {
        queryClient.setQueryData<PaginatedNotes>(ownedKey, {
          ...prevOwned,
          data: prevOwned.data.map((note) =>
            note.id === id ? { ...note, isPinned } : note,
          ),
        });
      }
      if (prevShared) {
        queryClient.setQueryData<PaginatedNotes>(sharedKey, {
          ...prevShared,
          data: prevShared.data.map((note) =>
            note.id === id ? { ...note, isPinned } : note,
          ),
        });
      }

      return { prevOwned, prevShared };
    },
    onError: (_err, _variables, context) => {
      if (context?.prevOwned) {
        queryClient.setQueryData(
          notesQueryKeys.scope("owned"),
          context.prevOwned,
        );
      }
      if (context?.prevShared) {
        queryClient.setQueryData(
          notesQueryKeys.scope("shared"),
          context.prevShared,
        );
      }
      toast.error("Failed to update pin status.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.lists() });
    },
  });
}

export function useToggleFavoriteMutation(_scope: NoteScope = "owned") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      notesApi.update(id, { isFavorite }),
    onMutate: async ({ id, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: notesQueryKeys.lists() });
      const ownedKey = notesQueryKeys.scope("owned");
      const sharedKey = notesQueryKeys.scope("shared");

      const prevOwned = queryClient.getQueryData<PaginatedNotes>(ownedKey);
      const prevShared = queryClient.getQueryData<PaginatedNotes>(sharedKey);

      if (prevOwned) {
        queryClient.setQueryData<PaginatedNotes>(ownedKey, {
          ...prevOwned,
          data: prevOwned.data.map((note) =>
            note.id === id ? { ...note, isFavorite } : note,
          ),
        });
      }
      if (prevShared) {
        queryClient.setQueryData<PaginatedNotes>(sharedKey, {
          ...prevShared,
          data: prevShared.data.map((note) =>
            note.id === id ? { ...note, isFavorite } : note,
          ),
        });
      }

      return { prevOwned, prevShared };
    },
    onError: (_err, _variables, context) => {
      if (context?.prevOwned) {
        queryClient.setQueryData(
          notesQueryKeys.scope("owned"),
          context.prevOwned,
        );
      }
      if (context?.prevShared) {
        queryClient.setQueryData(
          notesQueryKeys.scope("shared"),
          context.prevShared,
        );
      }
      toast.error("Failed to update favorite status.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.lists() });
    },
  });
}

export function useDeleteNoteMutation(_scope: NoteScope = "owned") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notesApi.remove(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: notesQueryKeys.lists() });
      const ownedKey = notesQueryKeys.scope("owned");
      const sharedKey = notesQueryKeys.scope("shared");

      const prevOwned = queryClient.getQueryData<PaginatedNotes>(ownedKey);
      const prevShared = queryClient.getQueryData<PaginatedNotes>(sharedKey);

      if (prevOwned) {
        queryClient.setQueryData<PaginatedNotes>(ownedKey, {
          ...prevOwned,
          data: prevOwned.data.filter((note) => note.id !== id),
          meta: {
            ...prevOwned.meta,
            total: Math.max(0, prevOwned.meta.total - 1),
          },
        });
      }
      if (prevShared) {
        queryClient.setQueryData<PaginatedNotes>(sharedKey, {
          ...prevShared,
          data: prevShared.data.filter((note) => note.id !== id),
          meta: {
            ...prevShared.meta,
            total: Math.max(0, prevShared.meta.total - 1),
          },
        });
      }

      return { prevOwned, prevShared };
    },
    onSuccess: () => {
      toast.success("Note deleted.");
    },
    onError: (_err, _variables, context) => {
      if (context?.prevOwned) {
        queryClient.setQueryData(
          notesQueryKeys.scope("owned"),
          context.prevOwned,
        );
      }
      if (context?.prevShared) {
        queryClient.setQueryData(
          notesQueryKeys.scope("shared"),
          context.prevShared,
        );
      }
      toast.error("Failed to delete note.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.lists() });
    },
  });
}

export function useSaveNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id?: string;
      data: CreateNoteInput | UpdateNoteInput;
    }) =>
      id ? notesApi.update(id, data) : notesApi.create(data as CreateNoteInput),
    onSuccess: (savedNote: Note, variables) => {
      toast.success(variables.id ? "Memory updated" : "Memory created");
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.lists() });
      if (variables.id) {
        queryClient.invalidateQueries({
          queryKey: notesQueryKeys.detail(variables.id),
        });
      }
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Could not save note.";
      toast.error(msg);
    },
  });
}

export function useBulkActionMutation(_scope: NoteScope = "owned") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkActionInput) => notesApi.bulkAction(data),
    onMutate: async ({ noteIds, action }) => {
      await queryClient.cancelQueries({ queryKey: notesQueryKeys.lists() });
      const ownedKey = notesQueryKeys.scope("owned");
      const sharedKey = notesQueryKeys.scope("shared");

      const prevOwned = queryClient.getQueryData<PaginatedNotes>(ownedKey);
      const prevShared = queryClient.getQueryData<PaginatedNotes>(sharedKey);
      const idSet = new Set(noteIds);

      const applyAction = (notes: PaginatedNotes["data"]) => {
        if (action === "delete") {
          return notes.filter((n) => !idSet.has(n.id));
        } else if (action === "pin" || action === "unpin") {
          const isPinned = action === "pin";
          return notes.map((n) => (idSet.has(n.id) ? { ...n, isPinned } : n));
        } else if (action === "favorite" || action === "unfavorite") {
          const isFavorite = action === "favorite";
          return notes.map((n) => (idSet.has(n.id) ? { ...n, isFavorite } : n));
        }
        return notes;
      };

      if (prevOwned) {
        queryClient.setQueryData<PaginatedNotes>(ownedKey, {
          ...prevOwned,
          data: applyAction(prevOwned.data),
          meta:
            action === "delete"
              ? {
                  ...prevOwned.meta,
                  total: Math.max(
                    0,
                    prevOwned.meta.total -
                      prevOwned.data.filter((n) => idSet.has(n.id)).length,
                  ),
                }
              : prevOwned.meta,
        });
      }

      if (prevShared) {
        queryClient.setQueryData<PaginatedNotes>(sharedKey, {
          ...prevShared,
          data: applyAction(prevShared.data),
          meta:
            action === "delete"
              ? {
                  ...prevShared.meta,
                  total: Math.max(
                    0,
                    prevShared.meta.total -
                      prevShared.data.filter((n) => idSet.has(n.id)).length,
                  ),
                }
              : prevShared.meta,
        });
      }

      return { prevOwned, prevShared };
    },
    onSuccess: (res, { action }) => {
      const labels: Record<string, string> = {
        delete: "deleted",
        pin: "pinned",
        unpin: "unpinned",
        favorite: "added to favorites",
        unfavorite: "removed from favorites",
      };
      toast.success(`${res.affected} notes ${labels[action] || "updated"}`);
    },
    onError: (_err, _variables, context) => {
      if (context?.prevOwned) {
        queryClient.setQueryData(
          notesQueryKeys.scope("owned"),
          context.prevOwned,
        );
      }
      if (context?.prevShared) {
        queryClient.setQueryData(
          notesQueryKeys.scope("shared"),
          context.prevShared,
        );
      }
      toast.error("Bulk action failed.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.lists() });
    },
  });
}
