import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  type CreateNoteInput,
  type Note,
  notesApi,
  type NotesQueryInput,
  type PaginatedNotes,
  type UpdateNoteInput,
} from "@/lib/api";

export const notesQueryKeys = {
  all: ["notes"] as const,
  lists: () => [...notesQueryKeys.all, "list"] as const,
  list: (query: NotesQueryInput) => [...notesQueryKeys.lists(), query] as const,
  details: () => [...notesQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...notesQueryKeys.details(), id] as const,
};

export function useNotesQuery(query: NotesQueryInput) {
  return useQuery<PaginatedNotes>({
    queryKey: notesQueryKeys.list(query),
    queryFn: () => notesApi.list(query),
    staleTime: 1000 * 30,
  });
}

/**
 * All these mutations are made for optimistic ui updates while the backend keep updating sideways
 */

export function useTogglePinMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isPinned }: { id: string; isPinned: boolean }) =>
      notesApi.update(id, { isPinned }),
    onMutate: async ({ id, isPinned }) => {
      await queryClient.cancelQueries({ queryKey: notesQueryKeys.lists() });
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
    },
    onError: () => {
      toast.error("Failed to update pin status.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.lists() });
    },
  });
}

export function useToggleFavoriteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      notesApi.update(id, { isFavorite }),
    onMutate: async ({ id, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: notesQueryKeys.lists() });
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
    },
    onError: () => {
      toast.error("Failed to update favorite status.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.lists() });
    },
  });
}

export function useDeleteNoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notesApi.remove(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: notesQueryKeys.lists() });
      queryClient.setQueriesData<PaginatedNotes>(
        { queryKey: notesQueryKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.filter((note) => note.id !== id),
            meta: {
              ...old.meta,
              total: Math.max(0, old.meta.total - 1),
            },
          };
        },
      );
    },
    onSuccess: () => {
      toast.success("Note deleted.");
    },
    onError: () => {
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
    onSuccess: (_savedNote: Note, variables) => {
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
