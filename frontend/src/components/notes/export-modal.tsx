"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconDownload,
  IconFileText,
  IconLoader,
  IconNotes,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ApiError, notesApi } from "@/lib/api";
import { downloadBlob } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { type ExportNotesInput, exportNotesSchema } from "@/lib/schemas";

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  noteIds?: string[];
}

export function ExportModal({
  open,
  onClose,
  noteIds,
}: Readonly<ExportModalProps>) {
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<ExportNotesInput>({
    resolver: zodResolver(exportNotesSchema),
    defaultValues: {
      format: "json",
      noteIds,
    },
  });

  const selectedFormat = useWatch({ control, name: "format" }) || "json";

  const onExportSubmit = async (data: ExportNotesInput) => {
    setError(null);
    try {
      const { blob, filename } = await notesApi.export({
        format: data.format,
        noteIds,
      });
      downloadBlob(blob, filename);
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not export notes. Please try again.",
      );
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Export notes"
      className="w-full max-w-sm"
    >
      <p className="mb-4 text-xs text-muted-foreground">
        {noteIds
          ? `Exporting ${noteIds.length} selected note${noteIds.length === 1 ? "" : "s"}.`
          : "Exporting all of your notes."}
      </p>

      <form onSubmit={handleSubmit(onExportSubmit)} noValidate>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setValue("format", "json")}
            className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all cursor-pointer ${
              selectedFormat === "json"
                ? "border-emerald-glow bg-primary/10 shadow-sm"
                : "border-border bg-secondary/40 hover:bg-secondary"
            }`}
          >
            <IconNotes
              size={26}
              className={
                selectedFormat === "json"
                  ? "text-primary"
                  : "text-muted-foreground"
              }
            />
            <span className="text-xs font-bold text-foreground">JSON</span>
          </button>

          <button
            type="button"
            onClick={() => setValue("format", "markdown")}
            className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all cursor-pointer ${
              selectedFormat === "markdown"
                ? "border-primary bg-primary/10 shadow-sm"
                : "border-border bg-secondary/40 hover:bg-secondary"
            }`}
          >
            <IconFileText
              size={26}
              className={
                selectedFormat === "markdown"
                  ? "text-primary"
                  : "text-muted-foreground"
              }
            />
            <span className="text-xs font-bold text-foreground">Markdown</span>
          </button>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4"
            >
              <Alert variant="error">{error}</Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-primary text-primary-foreground"
          >
            {isSubmitting ? (
              <IconLoader size={16} className="animate-spin mr-1.5" />
            ) : (
              <IconDownload size={16} className="mr-1.5" />
            )}
            {isSubmitting ? "Exporting…" : "Download"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
