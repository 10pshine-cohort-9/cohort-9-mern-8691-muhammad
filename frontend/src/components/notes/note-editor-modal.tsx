"use client";

import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MantineProvider } from "@mantine/core";
import { RichTextEditor } from "@mantine/tiptap";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import type { JSONContent } from "@tiptap/core";
import {
  IconLoader,
  IconPinFilled,
  IconPin,
  IconStar,
  IconStarFilled,
  IconClose,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { notesApi, ApiError, type Note } from "@/lib/api";
import { TagInput } from "./tag-input";
import { Modal } from "@/components/ui/modal";

interface NoteEditorModalProps {
  open: boolean;
  note: Note | null; // We used the logic as if this prop is null then new note creation is initiated
  onClose: () => void;
  onSaved: (note: Note) => void;
}

// This editor modal will be used for new note creation also
export function NoteEditorModal({
  open,
  note,
  onClose,
  onSaved,
}: Readonly<NoteEditorModalProps>) {
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
  const initialLoadedRef = useRef<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link,
      Superscript,
      Subscript,
      Highlight,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: note?.content ?? { type: "doc", content: [] },
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

    // if note or its id is null then we will create a new note
    const currentKey = note?.id ?? "new-note";
    if (initialLoadedRef.current === currentKey) {
      return;
    }

    initialLoadedRef.current = currentKey;
    const initialTitle = note?.title ?? "";
    setTitle(initialTitle);
    setIsPinned(note?.isPinned ?? false);
    setIsFavorite(note?.isFavorite ?? false);
    setTags(note?.tags ?? []);
    setCurrentNote(note);
    setError(null);

    if (note?.content) {
      editor.commands.setContent(note.content);
      setContent(editor.getJSON());
    } else {
      editor.commands.setContent({ type: "doc", content: [] });
      setContent({ type: "doc", content: [] });
    }
  }, [open, note, editor]);

  const handleSave = async () => {
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
    enabled: open,
  });

  const handleToggleFavorite = () => {
    setIsFavorite((prev) => !prev);
  };

  const handleTogglePin = () => {
    setIsPinned((prev) => !prev);
  };

  return (
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
          placeholder="Title your memory…"
          className="flex-1 bg-transparent text-xl sm:text-2xl font-black text-foreground outline-none placeholder:text-muted-foreground/60 pr-4"
          autoFocus
        />

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleToggleFavorite}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isFavorite
                ? "bg-rose-500/15 border-rose-500/30 text-rose-500"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
            title={isFavorite ? "Remove favorite" : "Add favorite"}
          >
            {isFavorite ? <IconStarFilled size={18} /> : <IconStar size={18} />}
          </button>

          <button
            type="button"
            onClick={handleTogglePin}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isPinned
                ? "bg-amber-500/15 border-amber-500/30 text-amber-500"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            aria-label={isPinned ? "Unpin note" : "Pin note"}
            title={isPinned ? "Unpin note" : "Pin note"}
          >
            {isPinned ? <IconPinFilled size={18} /> : <IconPin size={18} />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border cursor-pointer ml-1"
            aria-label="Close"
          >
            <IconClose size={18} />
          </button>
        </div>
      </div>

      <div className="shrink-0 px-6 py-3 border-b border-border/60 bg-muted/10">
        <TagInput tags={tags} onChange={setTags} />
      </div>

      <div className="flex-1 overflow-y-auto min-h-75 flex flex-col bg-card p-6">
        <MantineProvider defaultColorScheme="auto">
          <RichTextEditor
            editor={editor}
            className="flex-1 flex flex-col border-border! bg-transparent!"
          >
            <RichTextEditor.Toolbar
              sticky
              stickyOffset={0}
              className="border-border! bg-muted/40! backdrop-blur-md rounded-xl p-1 mb-4 flex flex-wrap gap-1"
            >
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

            <RichTextEditor.Content className="flex-1 min-h-55 text-foreground focus:outline-none" />
          </RichTextEditor>
        </MantineProvider>
      </div>

      <div className="shrink-0 flex items-center justify-between border-t border-border px-6 py-4 bg-muted/20">
        <div className="flex-1 pr-4">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Alert variant="error">{error}</Alert>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-primary text-primary-foreground shadow-md font-bold px-5"
          >
            {saving && <IconLoader size={16} className="animate-spin mr-1.5" />}
            <span>
              {saving
                ? "Saving…"
                : currentNote
                  ? "Save Changes"
                  : "Create Note"}
            </span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
