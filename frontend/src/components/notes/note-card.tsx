"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { formatDistanceToNow } from "date-fns";
import type { Note } from "@/lib/api";
import { getNoteExcerpt } from "@/lib/utils";
import { CardContainer, CardBody, CardItem } from "@/components/ui/3d-card";
import {
  IconPin,
  IconPinFilled,
  IconStar,
  IconStarFilled,
  IconTrash,
  IconPencil,
  IconLoader,
} from "@/components/ui/icons";

interface NoteCardProps {
  note: Note;
  index: number;
  onOpen: (note: Note) => void;
  onEdit?: (note: Note) => void;
  onTogglePin: (note: Note) => void;
  onToggleFavorite: (note: Note) => void;
  onDelete: (note: Note) => Promise<void>;
}

export function NoteCard({
  note,
  index,
  onOpen,
  onEdit,
  onTogglePin,
  onToggleFavorite,
  onDelete,
}: Readonly<NoteCardProps>) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await onDelete(note);
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };

  const excerpt = getNoteExcerpt(note.content, 140) || "Empty note...";

  return (
    <CardContainer containerClassName="w-full h-full">
      <CardBody className="w-full h-full">
        <motion.article
          layout
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25, delay: Math.min(index, 8) * 0.03 }}
          onClick={() => onOpen(note)}
          className="neo-card group relative cursor-pointer overflow-hidden p-5 flex flex-col justify-between h-full w-full border border-border"
        >
          {note.isPinned && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          )}
          {!note.isPinned && note.isFavorite && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
          )}

          <div className="absolute right-3.5 top-3.5 flex items-center gap-1.5 z-10">
            {note.isPinned && (
              <span title="Pinned" className="text-amber-500">
                <IconPinFilled size={15} />
              </span>
            )}
            {note.isFavorite && (
              <span title="Favorite" className="text-rose-500">
                <IconStarFilled size={15} />
              </span>
            )}
          </div>

          <div>
            <CardItem translateZ={30} className="w-full">
              <h3 className="font-bold text-base sm:text-lg text-foreground line-clamp-1 pr-16 tracking-tight">
                {note.title || "Untitled Note"}
              </h3>
            </CardItem>

            <CardItem translateZ={20} className="w-full">
              <p className="mt-2.5 text-xs sm:text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                {excerpt}
              </p>
            </CardItem>

            {note.tags.length > 0 && (
              <CardItem translateZ={25} className="mt-3 flex flex-wrap gap-1">
                {note.tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold border border-primary/15"
                  >
                    {tag}
                  </span>
                ))}
                {note.tags.length > 4 && (
                  <span className="rounded-full bg-muted text-muted-foreground px-1.5 py-0.5 text-[10px] font-medium border border-border">
                    +{note.tags.length - 4}
                  </span>
                )}
              </CardItem>
            )}
          </div>

          <CardItem
            translateZ={35}
            className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between w-full"
          >
            <span className="text-[11px] font-medium text-muted-foreground">
              {formatDistanceToNow(new Date(note.updatedAt), {
                addSuffix: true,
              })}
            </span>

            <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              {onEdit && (
                <button
                  type="button"
                  aria-label="Edit note"
                  title="Edit note"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(note);
                  }}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  <IconPencil size={15} />
                </button>
              )}

              <button
                type="button"
                aria-label={
                  note.isFavorite ? "Remove from favorites" : "Add to favorites"
                }
                title={
                  note.isFavorite ? "Remove from favorites" : "Add to favorites"
                }
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(note);
                }}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-rose-500 transition-colors cursor-pointer"
              >
                {note.isFavorite ? (
                  <IconStarFilled size={15} className="text-rose-500" />
                ) : (
                  <IconStar size={15} />
                )}
              </button>

              <button
                type="button"
                aria-label={note.isPinned ? "Unpin note" : "Pin note"}
                title={note.isPinned ? "Unpin note" : "Pin note"}
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(note);
                }}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-amber-500 transition-colors cursor-pointer"
              >
                {note.isPinned ? (
                  <IconPinFilled size={15} />
                ) : (
                  <IconPin size={15} />
                )}
              </button>

              <button
                type="button"
                aria-label={
                  confirmingDelete ? "Confirm delete note" : "Delete note"
                }
                title={confirmingDelete ? "Confirm delete note" : "Delete note"}
                onClick={handleDeleteClick}
                disabled={deleting}
                className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                  confirmingDelete
                    ? "bg-destructive text-destructive-foreground"
                    : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                }`}
              >
                {deleting ? (
                  <IconLoader size={15} className="animate-spin" />
                ) : (
                  <IconTrash size={15} />
                )}
              </button>
            </div>
          </CardItem>

          {confirmingDelete && !deleting && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-2 text-right text-[11px] font-semibold text-destructive"
            >
              Click delete again to confirm
            </motion.p>
          )}
        </motion.article>
      </CardBody>
    </CardContainer>
  );
}
