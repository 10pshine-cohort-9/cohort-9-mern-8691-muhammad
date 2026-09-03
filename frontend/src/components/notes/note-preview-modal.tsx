"use client";

import React from "react";
import { formatDistanceToNow, format } from "date-fns";
import { MantineProvider } from "@mantine/core";
import { RichTextEditor } from "@mantine/tiptap";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import TextAlign from "@tiptap/extension-text-align";
import { Markdown } from "@tiptap/markdown";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";
import type { Note } from "@/lib/api";
import { sanitizeTiptapDoc } from "@/lib/utils";
import {
  IconPencil,
  IconStar,
  IconStarFilled,
  IconPin,
  IconPinFilled,
  IconShare,
  IconDownload,
  IconTrash,
  IconClock,
  IconTag,
  IconUsers,
  IconHistory,
  IconClose,
} from "@/components/ui/icons";

interface NotePreviewModalProps {
  note: Note | null;
  opened: boolean;
  onClose: () => void;
  onEdit: (note: Note) => void;
  onTogglePin: (note: Note) => void;
  onToggleFavorite: (note: Note) => void;
  onShare: (note: Note) => void;
  onViewHistory?: (note: Note) => void;
  onExport: (note: Note) => void;
  onDelete: (note: Note) => Promise<void>;
}

export function NotePreviewModal({
  note,
  opened,
  onClose,
  onEdit,
  onTogglePin,
  onToggleFavorite,
  onShare,
  onViewHistory,
  onExport,
  onDelete,
}: Readonly<NotePreviewModalProps>) {
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const previewEditor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: [
      StarterKit,
      Markdown,
      Superscript,
      Subscript,
      Highlight,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: note?.content
      ? sanitizeTiptapDoc(note.content)
      : { type: "doc", content: [] },
  });

  React.useEffect(() => {
    if (opened && note && previewEditor) {
      previewEditor.commands.setContent(
        note.content
          ? sanitizeTiptapDoc(note.content)
          : { type: "doc", content: [] },
      );
    }
  }, [opened, note, note?.content, note?.updatedAt, previewEditor]);

  if (!note) return null;

  const isOwner = note.viewerRole === "owner" || note.viewerRole === undefined;
  const canEdit = isOwner || note.viewerRole === "write";
  const canDelete = isOwner;

  const handleDelete = async () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await onDelete(note);
      setConfirmingDelete(false);
      onClose();
    } catch {
      toast.error("Failed to delete note");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      open={opened}
      onClose={onClose}
      zIndex={50}
      hideHeader={true}
      noPadding={true}
      className="flex max-h-[90vh] w-full max-w-2xl flex-col bg-card border border-border overflow-hidden"
    >
      <div className="shrink-0 p-6 sm:p-7 border-b border-border bg-muted/25">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1 pr-4">
            <div className="flex flex-wrap items-center gap-2">
              {note.isPinned && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <IconPinFilled size={12} /> Pinned
                </span>
              )}
              {note.isFavorite && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  <IconStarFilled size={12} /> Favorite
                </span>
              )}
              {note.ownerName && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border border-border">
                  <IconUsers size={12} /> Shared by {note.ownerName}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground wrap-break-word">
              {note.title || "Untitled Note"}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1">
                <IconClock size={13} />
                Updated{" "}
                {formatDistanceToNow(new Date(note.updatedAt), {
                  addSuffix: true,
                })}
              </span>
              <span>•</span>
              <span>
                {format(new Date(note.createdAt), "MMM d, yyyy h:mm a")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(note);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:bg-primary/90 transition-all hover:scale-102 cursor-pointer"
              >
                <IconPencil size={15} />
                <span>Edit Note</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border cursor-pointer"
              aria-label="Close"
            >
              <IconClose size={18} />
            </button>
          </div>
        </div>

        {note.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5 pt-3 border-t border-border/50">
            <IconTag size={14} className="text-muted-foreground mr-1" />
            {note.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-45 p-6 sm:p-7 bg-card">
        <MantineProvider defaultColorScheme="auto">
          <RichTextEditor
            editor={previewEditor}
            className="border-none! bg-transparent! p-0!"
          >
            <RichTextEditor.Content className="p-0! bg-transparent! text-foreground" />
          </RichTextEditor>
        </MantineProvider>
      </div>

      <div className="shrink-0 p-4 sm:p-5 border-t border-border bg-muted/30 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleFavorite(note)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors cursor-pointer"
          >
            {note.isFavorite ? (
              <IconStarFilled size={15} className="text-rose-500" />
            ) : (
              <IconStar size={15} />
            )}
            <span>{note.isFavorite ? "Favorited" : "Favorite"}</span>
          </button>

          <button
            type="button"
            onClick={() => onTogglePin(note)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors cursor-pointer"
          >
            {note.isPinned ? (
              <IconPinFilled size={15} className="text-amber-500" />
            ) : (
              <IconPin size={15} />
            )}
            <span>{note.isPinned ? "Pinned" : "Pin"}</span>
          </button>

          {isOwner && (
            <button
              type="button"
              onClick={() => onShare(note)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors cursor-pointer"
            >
              <IconShare size={15} />
              <span>Share & Collaborators</span>
            </button>
          )}

          {(isOwner || note.viewerRole === "write") && onViewHistory && (
            <button
              type="button"
              onClick={() => onViewHistory(note)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors cursor-pointer"
            >
              <IconHistory size={15} />
              <span>History</span>
            </button>
          )}

          {isOwner && (
            <button
              type="button"
              onClick={() => onExport(note)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors cursor-pointer"
            >
              <IconDownload size={15} />
              <span>Export</span>
            </button>
          )}
        </div>

        {canDelete && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                confirmingDelete
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20"
              }`}
            >
              <IconTrash size={15} />
              <span>
                {confirmingDelete ? "Click to confirm delete" : "Delete"}
              </span>
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
