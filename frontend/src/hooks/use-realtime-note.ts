import { useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { useNotificationsStore } from "@/lib/store";
import type { Note } from "@/lib/api";

interface UseRealtimeNoteOptions {
  onUpdated?: (note: Note, editedByUserId: string) => void;
  onDeleted?: (noteId: string, deletedByUserId: string) => void;
}

export function useRealtimeNote(
  noteId: string | null,
  options: UseRealtimeNoteOptions,
) {
  const isConnected = useNotificationsStore((s) => s.isConnected);
  const onUpdatedRef = useRef(options.onUpdated);
  const onDeletedRef = useRef(options.onDeleted);

  useEffect(() => {
    onUpdatedRef.current = options.onUpdated;
    onDeletedRef.current = options.onDeleted;
  }, [options.onUpdated, options.onDeleted]);

  useEffect(() => {
    if (!noteId) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit("note:join", noteId);

    const handleUpdated = (payload: { note: Note; editedByUserId: string }) => {
      if (payload.note.id === noteId)
        onUpdatedRef.current?.(payload.note, payload.editedByUserId);
    };
    const handleDeleted = (payload: {
      noteId: string;
      deletedByUserId: string;
    }) => {
      if (payload.noteId === noteId)
        onDeletedRef.current?.(payload.noteId, payload.deletedByUserId);
    };

    socket.on("note:updated", handleUpdated);
    socket.on("note:deleted", handleDeleted);

    return () => {
      socket.emit("note:leave", noteId);
      socket.off("note:updated", handleUpdated);
      socket.off("note:deleted", handleDeleted);
    };
  }, [noteId, isConnected]);
}
