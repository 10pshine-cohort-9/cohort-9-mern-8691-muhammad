"use client";

import { motion, AnimatePresence } from "motion/react";
import {
  IconPin,
  IconPinOff,
  IconStar,
  IconTrash,
  IconClose,
  IconDownload,
  IconLoader,
} from "@/components/ui/icons";

interface SelectionBarProps {
  count: number;
  onPin: () => void;
  onUnpin: () => void;
  onFavorite: () => void;
  onUnfavorite: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  onClear: () => void;
  busy?: boolean;
  canExport?: boolean;
  canDelete?: boolean;
}

export function SelectionBar({
  count,
  onPin,
  onUnpin,
  onFavorite,
  onUnfavorite,
  onDelete,
  onExport,
  onClear,
  busy,
  canExport = true,
  canDelete = true,
}: Readonly<SelectionBarProps>) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: "spring", stiffness: 340, damping: 30 }}
          className="neo-card fixed bottom-6 left-1/2 z-40 flex max-w-[calc(100vw-2rem)] flex-wrap -translate-x-1/2 items-center justify-center gap-2 rounded-2xl px-4 py-2.5 shadow-2xl border border-border bg-card"
        >
          <span className="mr-1.5 text-xs font-bold text-foreground">
            {count} selected
          </span>

          <button
            type="button"
            onClick={onPin}
            disabled={busy}
            className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 transition-colors"
          >
            <IconPin size={14} /> Pin
          </button>
          <button
            type="button"
            onClick={onUnpin}
            disabled={busy}
            className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 transition-colors"
          >
            <IconPinOff size={14} /> Unpin
          </button>
          <button
            type="button"
            onClick={onFavorite}
            disabled={busy}
            className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-rose-500 disabled:opacity-50 transition-colors"
          >
            <IconStar size={14} /> Favorite
          </button>
          <button
            type="button"
            onClick={onUnfavorite}
            disabled={busy}
            className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 transition-colors"
          >
            <IconStar size={14} /> Unfavorite
          </button>
          {canExport && onExport && (
            <button
              type="button"
              onClick={onExport}
              disabled={busy}
              className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 transition-colors"
            >
              <IconDownload size={14} /> Export
            </button>
          )}
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
            >
              <IconTrash size={14} /> Delete
            </button>
          )}

          <div className="mx-1 h-5 w-px bg-border" />

          <button
            type="button"
            onClick={onClear}
            aria-label="Clear selection"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {busy ? (
              <IconLoader size={14} className="animate-spin" />
            ) : (
              <IconClose size={14} />
            )}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
