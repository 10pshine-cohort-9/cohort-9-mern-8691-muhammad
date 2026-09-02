"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  IconClose,
  IconUpload,
  IconLoader,
  IconFileText,
  IconCheck,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { notesApi, ApiError } from "@/lib/api";
import { Modal } from "@/components/ui/modal";

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

interface ImportSummary {
  created: number;
  failed: { filename: string; error: string }[];
}

export function ImportModal({
  open,
  onClose,
  onImported,
}: Readonly<ImportModalProps>) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFiles([]);
    setError(null);
    setSummary(null);
    setDragActive(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const MAX_FILE_SIZE = 2 * 1024 * 1024;
  const addFiles = (fileList: FileList | File[]) => {
    const list = Array.from(fileList);
    const validExtensions = list.filter(
      (f) => f.name.endsWith(".json") || f.name.endsWith(".md"),
    );
    const oversized = validExtensions.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      setError(
        `Some files exceed the 2MB size limit: ${oversized.map((f) => f.name).join(", ")}`,
      );
    }
    const accepted = validExtensions.filter((f) => f.size <= MAX_FILE_SIZE);
    setFiles((prev) => [...prev, ...accepted]);
  };

  const removeFile = (name: string) =>
    setFiles((prev) => prev.filter((f) => f.name !== name));

  const handleImport = async () => {
    if (files.length === 0) return;
    setImporting(true);
    setError(null);

    try {
      const result = await notesApi.import(files);
      setSummary(result);

      if (result.created > 0) {
        onImported();
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not import notes. Please try again.",
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import notes"
      className="w-full max-w-md"
    >
      {summary ? (
        <div>
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            <IconCheck size={18} />
            {summary.created} note{summary.created === 1 ? "" : "s"} imported
            successfully.
          </div>

          {summary.failed.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-semibold text-destructive">
                {summary.failed.length} file
                {summary.failed.length === 1 ? "" : "s"} couldn&apos;t be
                imported:
              </p>

              <div className="space-y-1.5">
                {summary.failed.map((f) => (
                  <div
                    key={f.filename}
                    className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive"
                  >
                    <span>
                      <strong>{f.filename}</strong>: {f.error}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 flex justify-end">
            <Button
              type="button"
              onClick={handleClose}
              className="rounded-xl bg-primary text-primary-foreground"
            >
              Done
            </Button>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              addFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={`flex w-full cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
              dragActive
                ? "border-primary bg-primary/10"
                : "border-border hover:bg-secondary/40"
            }`}
          >
            <IconUpload size={28} className="text-muted-foreground" />

            <span className="text-sm font-bold text-foreground">
              Drop files here or click to browse
            </span>

            <span className="text-xs text-muted-foreground">
              .json (exported notes) or .md files, up to 2MB each
            </span>

            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".json,.md"
              aria-label="Choose files to import"
              className="hidden"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                if (e.target.files) {
                  addFiles(e.target.files);
                }
              }}
            />
          </button>

          {files.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {files.map((file) => (
                <li
                  key={file.name}
                  className="flex items-center justify-between rounded-xl border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground"
                >
                  <span className="flex items-center gap-2 truncate">
                    <IconFileText
                      size={14}
                      className="shrink-0 text-muted-foreground"
                    />
                    <span className="truncate">{file.name}</span>
                  </span>

                  <button
                    type="button"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => removeFile(file.name)}
                    className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <IconClose size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3"
              >
                <Alert variant="error">{error}</Alert>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="rounded-xl"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleImport}
              disabled={importing || files.length === 0}
              className="rounded-xl bg-primary text-primary-foreground"
            >
              {importing && (
                <IconLoader size={16} className="mr-1.5 animate-spin" />
              )}
              {importing ? "Importing…" : `Import ${files.length || ""}`.trim()}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
