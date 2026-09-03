"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import type { Note } from "@/lib/api";
import { NoteCard } from "./note-card";
import { IconPlus, IconSearch } from "@/components/ui/icons";

interface NoteListProps {
  notes: Note[];
  isLoading: boolean;
  hasActiveSearch: boolean;
  onOpen: (note: Note) => void;
  onEdit?: (note: Note) => void;
  onTogglePin: (note: Note) => void;
  onToggleFavorite: (note: Note) => void;
  onDelete: (note: Note) => Promise<void>;
  onCreateNote?: () => void;
  emptyMessage?: string;
  recentlyUpdatedIds?: Set<string>;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (note: Note) => void;
}

export function NoteList({
  notes,
  isLoading,
  hasActiveSearch,
  onOpen,
  onEdit,
  onTogglePin,
  onToggleFavorite,
  onDelete,
  onCreateNote,
  emptyMessage,
  recentlyUpdatedIds,
  selectionMode,
  selectedIds,
  onToggleSelect,
}: Readonly<NoteListProps>) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="neo-card h-44 animate-pulse p-5">
            <div className="h-5 w-2/3 rounded-lg bg-muted" />
            <div className="mt-4 h-3.5 w-full rounded bg-muted/80" />
            <div className="mt-2.5 h-3.5 w-4/5 rounded bg-muted/80" />
            <div className="mt-8 flex justify-between">
              <div className="h-3 w-16 rounded bg-muted/60" />
              <div className="h-4 w-12 rounded bg-muted/60" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="neo-card mx-auto mt-6 flex max-w-lg flex-col items-center p-8 sm:p-12 text-center border border-border bg-card"
      >
        {hasActiveSearch ? (
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-4">
            <IconSearch size={28} />
          </div>
        ) : (
          <div className="relative w-40 h-40 sm:w-48 sm:h-48 mb-4 drop-shadow-md">
            <Image
              src="/notes-sticker.png"
              alt="No memories yet"
              fill
              className="object-contain"
              priority
              unoptimized
            />
          </div>
        )}

        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {hasActiveSearch ? "No notes match your search" : "No notes yet"}
        </h3>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-sm">
          {hasActiveSearch
            ? "Try changing your search term or clearing active filters."
            : (emptyMessage ??
              "Capture your ideas, thoughts, and memories in rich formatted notes.")}
        </p>

        {!hasActiveSearch && onCreateNote && (
          <button
            type="button"
            onClick={onCreateNote}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:shadow-primary/25 hover:-translate-y-0.5 transition-all"
          >
            <IconPlus size={18} />
            <span>Create Your First Note</span>
          </button>
        )}
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr items-stretch">
      <AnimatePresence mode="popLayout">
        {notes.map((note, index) => (
          <NoteCard
            key={note.id}
            note={note}
            index={index}
            onOpen={onOpen}
            onEdit={onEdit}
            onTogglePin={onTogglePin}
            onToggleFavorite={onToggleFavorite}
            onDelete={onDelete}
            isRecentlyUpdated={recentlyUpdatedIds?.has(note.id)}
            selectable={selectionMode}
            selected={selectedIds?.has(note.id)}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
