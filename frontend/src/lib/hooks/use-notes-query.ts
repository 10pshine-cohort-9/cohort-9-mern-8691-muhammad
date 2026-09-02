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
    staleTime: 1000 * 30, // 30s cache
  });
}

export function useScopeNotesQuery(scope: NoteScope) {
  return useQuery<PaginatedNotes>({
    queryKey: notesQueryKeys.scope(scope),
    queryFn: () => notesApi.list({ scope, page: 1, limit: 50 }),
    staleTime: 1000 * 60,
  });
}

export function useTogglePinMutation(_scope: NoteScope = "owned") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isPinned }: { id: string; isPinned: boolean }) =>
      notesApi.update(id, { isPinned }),
    onMutate: async ({ id, isPinned }) => {
      await queryClient.cancelQueries({ queryKey: notesQueryKeys.all });
      const previousQueries = queryClient.getQueriesData<PaginatedNotes>({
        queryKey: notesQueryKeys.lists(),
      });

      queryClient.setQueriesData<PaginatedNotes>(
        { queryKey: notesQueryKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((note) =>
              note.id === id ? { ...note, isPinned } : note,
            ),
          };
        },
      );

      return { previousQueries };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
      toast.error("Failed to update pin status.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.all });
    },
  });
}

export function useToggleFavoriteMutation(_scope: NoteScope = "owned") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      notesApi.update(id, { isFavorite }),
    onMutate: async ({ id, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: notesQueryKeys.all });
      const previousQueries = queryClient.getQueriesData<PaginatedNotes>({
        queryKey: notesQueryKeys.lists(),
      });

      queryClient.setQueriesData<PaginatedNotes>(
        { queryKey: notesQueryKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((note) =>
              note.id === id ? { ...note, isFavorite } : note,
            ),
          };
        },
      );

      return { previousQueries };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
      toast.error("Failed to update favorite status.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.all });
    },
  });
}

export function useDeleteNoteMutation(_scope: NoteScope = "owned") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notesApi.remove(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: notesQueryKeys.all });
      const previousQueries = queryClient.getQueriesData<PaginatedNotes>({
        queryKey: notesQueryKeys.lists(),
      });

      queryClient.setQueriesData<PaginatedNotes>(
        { queryKey: notesQueryKeys.lists() },
        (old) => {
          if (!old) return old;
          const hadNote = old.data.some((n) => n.id === id);
          return {
            ...old,
            data: old.data.filter((note) => note.id !== id),
            meta: {
              ...old.meta,
              total: hadNote ? Math.max(0, old.meta.total - 1) : old.meta.total,
            },
          };
        },
      );

      return { previousQueries };
    },
    onSuccess: () => {
      toast.success("Note deleted.");
    },
    onError: (_err, _variables, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
      toast.error("Failed to delete note.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.all });
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
      queryClient.setQueriesData<PaginatedNotes>(
        { queryKey: notesQueryKeys.lists() },
        (old) => {
          if (!old) return old;
          const exists = old.data.some((n) => n.id === savedNote.id);
          if (exists) {
            return {
              ...old,
              data: old.data.map((n) =>
                n.id === savedNote.id ? savedNote : n,
              ),
            };
          } else {
            return {
              ...old,
              data: [savedNote, ...old.data],
              meta: {
                ...old.meta,
                total: old.meta.total + 1,
              },
            };
          }
        },
      );
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.all });
      if (variables.id) {
        queryClient.setQueryData(
          notesQueryKeys.detail(variables.id),
          savedNote,
        );
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
      await queryClient.cancelQueries({ queryKey: notesQueryKeys.all });
      const previousQueries = queryClient.getQueriesData<PaginatedNotes>({
        queryKey: notesQueryKeys.lists(),
      });
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

      queryClient.setQueriesData<PaginatedNotes>(
        { queryKey: notesQueryKeys.lists() },
        (old) => {
          if (!old) return old;
          const removedCount = old.data.filter((n) => idSet.has(n.id)).length;
          return {
            ...old,
            data: applyAction(old.data),
            meta:
              action === "delete"
                ? {
                    ...old.meta,
                    total: Math.max(0, old.meta.total - removedCount),
                  }
                : old.meta,
          };
        },
      );

      return { previousQueries };
    },
    onSuccess: (result, { action, noteIds }) => {
      const count = result.affected ?? noteIds.length;
      const countText = `${count} note${count === 1 ? "" : "s"}`;
      if (action === "delete") toast.success(`Deleted ${countText}`);
      else if (action === "pin") toast.success(`Pinned ${countText}`);
      else if (action === "unpin") toast.success(`Unpinned ${countText}`);
      else if (action === "favorite") toast.success(`Favorited ${countText}`);
      else if (action === "unfavorite")
        toast.success(`Unfavorited ${countText}`);
    },
    onError: (_err, _variables, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
      toast.error("Bulk action failed.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.all });
    },
  });
}
