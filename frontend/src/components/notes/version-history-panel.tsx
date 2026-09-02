"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  IconHistory,
  IconLoader,
  IconClock,
  IconCheck,
} from "@/components/ui/icons";
import { formatDistanceToNow } from "date-fns";
import { Alert } from "@/components/ui/alert";
import { toast } from "sonner";
import { notesApi, ApiError, type Note, type NoteVersion } from "@/lib/api";
import { getNoteExcerpt } from "@/lib/utils";
import { diffWords } from "diff";
import { Modal } from "@/components/ui/modal";
import type { JSONContent } from "@tiptap/core";

interface VersionHistoryPanelProps {
  open: boolean;
  noteId: string | null;
  currentContent?: JSONContent | string;
  canRestore: boolean;
  onClose: () => void;
  onRestored: (note: Note) => void;
}

export function VersionHistoryPanel({
  open,
  noteId,
  currentContent,
  canRestore,
  onClose,
  onRestored,
}: Readonly<VersionHistoryPanelProps>) {
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedDiffId, setExpandedDiffId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !noteId) return;

    let cancelled = false;

    setLoading(true);
    setError(null);

    notesApi
      .listVersions(noteId)
      .then((data) => {
        if (!cancelled) {
          setVersions(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not load version history.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, noteId]);

  const handleRestore = async (version: NoteVersion) => {
    if (!noteId) return;

    setRestoringId(version.id);
    setError(null);

    try {
      const restored = await notesApi.restoreVersion(noteId, version.id);

      const timeAgo = formatDistanceToNow(new Date(version.createdAt), {
        addSuffix: true,
      });

      toast.success(
        `Note restored to version from ${timeAgo}. Subsequent history pruned.`,
      );

      onRestored(restored);
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not restore this version.",
      );
    } finally {
      setRestoringId(null);
    }
  };

  const getDiffClassName = (
    added: boolean | undefined,
    removed: boolean | undefined,
  ) => {
    if (added) {
      return "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold px-0.5 rounded";
    }

    if (removed) {
      return "bg-rose-500/20 text-rose-600 dark:text-rose-400 line-through px-0.5 rounded";
    }

    return "text-muted-foreground";
  };

  let versionContent;

  if (loading) {
    versionContent = (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`version-loading-${index}`}
            className="neo-card h-16 animate-pulse p-4"
          />
        ))}
      </div>
    );
  } else if (versions.length === 0) {
    versionContent = (
      <div className="mt-10 flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
        <IconClock size={28} className="opacity-40" />

        <p className="font-semibold">No earlier versions yet.</p>

        <p className="text-xs">
          A snapshot is automatically saved each time you edit title, content,
          or tags.
        </p>
      </div>
    );
  } else {
    versionContent = (
      <ul className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {versions.map((version, index) => (
            <motion.li
              key={version.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ delay: Math.min(index, 6) * 0.03 }}
              className="neo-card flex flex-col gap-2 border border-border bg-card p-4"
            >
              <div className="flex items-center justify-between">
                <span className="line-clamp-1 text-sm font-bold text-foreground">
                  {version.title}
                </span>

                <span className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(version.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>

              <p className="line-clamp-2 text-xs text-muted-foreground">
                {getNoteExcerpt(version.content, 120) || "Empty note"}
              </p>

              {Boolean(currentContent) && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedDiffId(
                        expandedDiffId === version.id ? null : version.id,
                      )
                    }
                    className="cursor-pointer text-[11px] font-semibold text-primary hover:underline"
                  >
                    {expandedDiffId === version.id
                      ? "Hide Changes"
                      : "Compare with Current"}
                  </button>

                  {expandedDiffId === version.id && (
                    <div className="mt-2 max-h-40 space-x-1 overflow-y-auto rounded-xl border border-border/60 bg-muted/40 p-2.5 font-mono text-xs leading-relaxed">
                      {diffWords(
                        getNoteExcerpt(version.content, 1000),
                        getNoteExcerpt(currentContent ?? "", 1000),
                      ).map((part, partIndex) => (
                        <span
                          key={`${version.id}-diff-${partIndex}`}
                          className={getDiffClassName(part.added, part.removed)}
                        >
                          {part.value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-muted-foreground">
                  Edited by {version.editedByName}
                </span>

                {canRestore && (
                  <button
                    type="button"
                    onClick={() => handleRestore(version)}
                    disabled={restoringId !== null}
                    aria-label={`Restore version from ${version.editedByName}`}
                    className="flex cursor-pointer items-center gap-1 rounded-xl bg-primary/15 px-3 py-1 text-xs font-bold text-primary transition-colors hover:bg-primary/25 disabled:opacity-50"
                  >
                    {restoringId === version.id ? (
                      <IconLoader size={12} className="animate-spin" />
                    ) : (
                      <IconCheck size={12} />
                    )}
                    Restore
                  </button>
                )}
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      zIndex={60}
      title="Version history"
      className="flex max-h-[85vh] w-full max-w-sm flex-col sm:max-w-md"
    >
      <div className="mb-4 flex items-center justify-between border-b border-border pb-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <IconHistory size={14} className="text-primary" />
          Past snapshots & rollbacks
        </div>

        {versions.length > 0 && (
          <span className="font-mono text-[11px] font-semibold text-primary">
            {versions.length} snapshot{versions.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-1 py-1">
        {error && (
          <div>
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        {versions.length >= 20 && (
          <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-2.5 text-xs text-muted-foreground">
            <IconClock size={15} className="mt-0.5 shrink-0 text-primary" />

            <p>
              Version history is at the maximum limit (20 snapshots). Older
              snapshots are automatically recycled as new edits occur.
            </p>
          </div>
        )}

        {versionContent}

        {!canRestore && versions.length > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-600 dark:text-amber-400">
            View only — you don&apos;t have permission to restore versions on
            this shared note.
          </div>
        )}
      </div>
    </Modal>
  );
}
