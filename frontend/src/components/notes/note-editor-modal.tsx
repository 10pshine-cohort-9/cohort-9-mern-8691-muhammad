"use client";

import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MantineProvider } from "@mantine/core";
import { RichTextEditor } from "@mantine/tiptap";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import type { JSONContent } from "@tiptap/core";
import Highlight from "@tiptap/extension-highlight";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import TextAlign from "@tiptap/extension-text-align";
import {
  IconLoader,
  IconPinFilled,
  IconPin,
  IconStar,
  IconStarFilled,
  IconHistory,
  IconUsers,
  IconPencil,
  IconClose,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { useRealtimeNote } from "@/hooks/use-realtime-note";
import { notesApi, ApiError, type Note } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { ShareModal } from "./share-modal";
import { TagInput } from "./tag-input";
import { VersionHistoryPanel } from "./version-history-panel";
import { Modal } from "@/components/ui/modal";

interface NoteEditorModalProps {
  open: boolean;
  note: Note | null; // We used the logic as if this prop is null then new note creation is initiated
  onClose: () => void;
  onSaved: (note: Note) => void;
  template?: { title: string; content: JSONContent; tags: string[] } | null;
}

export function NoteEditorModal({
  open,
  note,
  onClose,
  onSaved,
  template,
}: Readonly<NoteEditorModalProps>) {
  const user = useAuthStore((s) => s.user);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<JSONContent>({
    type: "doc",
    content: [],
  });
  const [isPinned, setIsPinned] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(note);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [remoteUpdateAvailable, setRemoteUpdateAvailable] = useState(false);
  const [remoteDeleted, setRemoteDeleted] = useState(false);
  const initialLoadedRef = useRef<string | null>(null);

  const isOwner = currentNote ? currentNote.viewerRole === "owner" : true;
  const isReadOnly = currentNote?.viewerRole === "read";
  const canRestore =
    currentNote?.viewerRole === "owner" || currentNote?.viewerRole === "write";

  const editor = useEditor({
    immediatelyRender: false,
    editable: !isReadOnly && !remoteDeleted,
    extensions: [
      StarterKit,
      Markdown,
      Superscript,
      Subscript,
      Highlight,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: note?.content ?? template?.content ?? { type: "doc", content: [] },
    onUpdate: ({ editor }) => {
      setContent(editor.getJSON());
    },
  });

  useEffect(() => {
    if (!open) {
      initialLoadedRef.current = null;
      return;
    }

    if (!editor) return;

    const currentKey =
      note?.id ?? (template ? `template-${template.title}` : "new-note");
    if (initialLoadedRef.current === currentKey) {
      return;
    }

    initialLoadedRef.current = currentKey;
    const initialTitle = note?.title ?? template?.title ?? "";
    setTitle(initialTitle);
    setIsPinned(note?.isPinned ?? false);
    setIsFavorite(note?.isFavorite ?? false);
    setTags(note?.tags ?? template?.tags ?? []);
    setCurrentNote(note);
    setError(null);
    setRemoteUpdateAvailable(false);
    setRemoteDeleted(false);

    if (note?.content) {
      editor.commands.setContent(note.content);
      setContent(editor.getJSON());
    } else if (template?.content) {
      editor.commands.setContent(template.content);
      setContent(editor.getJSON());
    } else {
      editor.commands.setContent({ type: "doc", content: [] });
      setContent({ type: "doc", content: [] });
    }
  }, [open, note, template, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!isReadOnly && !remoteDeleted);
    }
  }, [editor, isReadOnly, remoteDeleted]);

  useRealtimeNote(open && currentNote ? currentNote.id : null, {
    onUpdated: (updatedNote, editedByUserId) => {
      if (editedByUserId === user?.id) return;
      setRemoteUpdateAvailable(true);
      setCurrentNote((prev) =>
        prev ? { ...updatedNote, viewerRole: prev.viewerRole } : prev,
      );
    },
    onDeleted: () => setRemoteDeleted(true),
  });

  const handleReloadFromServer = () => {
    if (!currentNote) return;
    setTitle(currentNote.title);
    setContent(currentNote.content);
    setIsPinned(currentNote.isPinned);
    setIsFavorite(currentNote.isFavorite);
    setTags(currentNote.tags ?? []);
    setRemoteUpdateAvailable(false);
    if (editor && currentNote.content) {
      editor.commands.setContent(currentNote.content);
    }
  };

  const handleSave = async () => {
    if (isReadOnly || remoteDeleted) return;
    if (!title.trim()) {
      setError("Give your note a title before saving.");
      return;
    }
    const currentContent = editor ? editor.getJSON() : content;
    const contentPayload = currentContent;
    setSaving(true);
    setError(null);
    try {
      const saved = currentNote
        ? await notesApi.update(currentNote.id, {
            title: title.trim(),
            content: contentPayload,
            isPinned,
            isFavorite,
            tags,
          })
        : await notesApi.create({
            title: title.trim(),
            content: contentPayload,
            isPinned,
            isFavorite,
            tags,
          });
      setCurrentNote(saved);
      initialLoadedRef.current = saved.id;
      toast.success(
        currentNote ? "Note saved successfully" : "Note created successfully",
      );
      onSaved(saved);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not save the note. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  useKeyboardShortcut({
    key: "s",
    onTrigger: handleSave,
    enabled: open && !isReadOnly && !remoteDeleted,
  });

  const handleRestored = (restored: Note) => {
    setCurrentNote((prev) =>
      prev ? { ...restored, viewerRole: prev.viewerRole } : restored,
    );
    setTitle(restored.title);
    setContent(restored.content);
    setTags(restored.tags ?? []);
    if (editor) {
      editor.commands.setContent(restored.content);
    }
    onSaved(restored);
  };

  const handleToggleFavorite = async () => {
    const next = !isFavorite;
    setIsFavorite(next);
    if (isReadOnly && currentNote) {
      try {
        const updated = await notesApi.update(currentNote.id, {
          isFavorite: next,
        });
        onSaved(updated);
      } catch {
        setIsFavorite(!next);
        toast.error("Failed to update favorite preference");
      }
    }
  };

  const handleTogglePin = async () => {
    const next = !isPinned;
    setIsPinned(next);
    if (isReadOnly && currentNote) {
      try {
        const updated = await notesApi.update(currentNote.id, {
          isPinned: next,
        });
        onSaved(updated);
      } catch {
        setIsPinned(!next);
        toast.error("Failed to update pin preference");
      }
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        hideHeader={true}
        noPadding={true}
        title={currentNote ? "Edit note" : "Create note"}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col bg-card border border-border overflow-hidden"
      >
        <div className="shrink-0 flex items-center justify-between border-b border-border px-6 py-4 bg-muted/25">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled note"
            aria-label="Note title"
            readOnly={isReadOnly}
            className="w-full bg-transparent text-xl font-extrabold tracking-tight text-foreground outline-none placeholder:text-muted-foreground pr-4"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            {isOwner && currentNote && (
              <button
                type="button"
                aria-label="Share note"
                title="Share note"
                onClick={() => setShareOpen(true)}
                className="flex items-center gap-1 rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-primary transition-colors cursor-pointer"
              >
                <IconUsers size={18} />
              </button>
            )}
            {(isOwner || currentNote?.viewerRole === "write") &&
              currentNote && (
                <button
                  type="button"
                  aria-label="Version history"
                  title="Version history"
                  onClick={() => setHistoryOpen(true)}
                  className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-primary transition-colors cursor-pointer"
                >
                  <IconHistory size={18} />
                </button>
              )}
            <button
              type="button"
              aria-label={
                isFavorite ? "Remove from favorites" : "Add to favorites"
              }
              onClick={handleToggleFavorite}
              className={`rounded-xl p-2 transition-colors cursor-pointer ${
                isFavorite
                  ? "text-rose-500"
                  : "text-muted-foreground hover:text-rose-500"
              }`}
            >
              {isFavorite ? (
                <IconStarFilled size={18} />
              ) : (
                <IconStar size={18} />
              )}
            </button>
            <button
              type="button"
              aria-label={isPinned ? "Unpin note" : "Pin note"}
              onClick={handleTogglePin}
              className={`rounded-xl p-2 transition-colors cursor-pointer ${
                isPinned
                  ? "text-amber-500"
                  : "text-muted-foreground hover:text-amber-500"
              }`}
            >
              {isPinned ? <IconPinFilled size={18} /> : <IconPin size={18} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close editor"
              className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer ml-1"
            >
              <IconClose size={18} />
            </button>
          </div>
        </div>

        {remoteDeleted && (
          <div className="shrink-0 flex items-center gap-2 border-b border-destructive/20 bg-destructive/10 px-6 py-2 text-xs font-semibold text-destructive">
            This note was deleted by its owner. Your changes can no longer be
            saved.
          </div>
        )}
        {!remoteDeleted && remoteUpdateAvailable && (
          <div className="shrink-0 flex items-center justify-between gap-2 border-b border-blue-500/20 bg-blue-500/10 px-6 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <span>This note was updated elsewhere.</span>
            <button
              type="button"
              onClick={handleReloadFromServer}
              className="rounded-lg bg-blue-500/20 px-2.5 py-1 font-bold hover:bg-blue-500/30 transition-colors cursor-pointer"
            >
              Reload
            </button>
          </div>
        )}
        {isReadOnly && (
          <div className="shrink-0 flex items-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-6 py-2 text-xs font-medium text-amber-600 dark:text-amber-400">
            Read-only mode — you don&apos;t have edit permission on this note.
          </div>
        )}
        {!isReadOnly && currentNote && currentNote.viewerRole !== "owner" && (
          <div className="shrink-0 flex items-center gap-2 border-b border-emerald-500/20 bg-emerald-500/10 px-6 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <IconPencil size={14} /> Shared with you — you have edit
            permissions.
          </div>
        )}

        <div className="shrink-0 border-b border-border px-6 py-3 bg-card">
          <TagInput
            tags={tags}
            onChange={setTags}
            disabled={isReadOnly || remoteDeleted}
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-65 p-6 bg-card">
          <MantineProvider>
            <RichTextEditor editor={editor} style={{ border: "none" }}>
              {!isReadOnly && !remoteDeleted && (
                <RichTextEditor.Toolbar sticky stickyOffset={0}>
                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.Bold />
                    <RichTextEditor.Italic />
                    <RichTextEditor.Underline />
                    <RichTextEditor.Strikethrough />
                    <RichTextEditor.ClearFormatting />
                    <RichTextEditor.Highlight />
                    <RichTextEditor.Code />
                  </RichTextEditor.ControlsGroup>

                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.H1 />
                    <RichTextEditor.H2 />
                    <RichTextEditor.H3 />
                    <RichTextEditor.H4 />
                  </RichTextEditor.ControlsGroup>

                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.Blockquote />
                    <RichTextEditor.Hr />
                    <RichTextEditor.BulletList />
                    <RichTextEditor.OrderedList />
                    <RichTextEditor.Subscript />
                    <RichTextEditor.Superscript />
                  </RichTextEditor.ControlsGroup>

                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.Link />
                    <RichTextEditor.Unlink />
                  </RichTextEditor.ControlsGroup>

                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.AlignLeft />
                    <RichTextEditor.AlignCenter />
                    <RichTextEditor.AlignJustify />
                    <RichTextEditor.AlignRight />
                  </RichTextEditor.ControlsGroup>

                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.Undo />
                    <RichTextEditor.Redo />
                  </RichTextEditor.ControlsGroup>
                </RichTextEditor.Toolbar>
              )}

              <RichTextEditor.Content
                aria-label="Note content"
                style={{ minHeight: "220px", padding: "8px 2px" }}
              />
            </RichTextEditor>
          </MantineProvider>
        </div>

        <div className="shrink-0 border-t border-border px-6 py-4 bg-card shadow-md">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3"
              >
                <Alert variant="error">{error}</Alert>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-muted-foreground">
              {remoteDeleted
                ? "Note deleted"
                : isReadOnly
                  ? "Read-only"
                  : "Ctrl+S to save"}
            </span>
            <div className="flex gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="rounded-xl"
              >
                {isReadOnly || remoteDeleted ? "Close" : "Cancel"}
              </Button>
              {!isReadOnly && !remoteDeleted && (
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-xl bg-primary text-primary-foreground font-bold shadow-sm"
                >
                  {saving && (
                    <IconLoader size={16} className="animate-spin mr-1.5" />
                  )}
                  {saving
                    ? "Saving…"
                    : currentNote
                      ? "Save Changes"
                      : "Create Note"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <ShareModal
        open={shareOpen}
        note={currentNote}
        onClose={() => setShareOpen(false)}
      />

      <VersionHistoryPanel
        open={historyOpen}
        noteId={currentNote?.id ?? null}
        currentContent={currentNote?.content ?? content}
        canRestore={canRestore}
        onClose={() => setHistoryOpen(false)}
        onRestored={handleRestored}
      />
    </>
  );
}
