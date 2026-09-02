"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  IconNotes,
  IconLoader,
  IconSparkles,
  IconArrowRight,
} from "@/components/ui/icons";
import { Alert } from "@/components/ui/alert";
import { templatesApi, ApiError, type NoteTemplate } from "@/lib/api";
import { Modal } from "@/components/ui/modal";

interface TemplateGalleryModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: NoteTemplate) => void;
}

export function TemplateGalleryModal({
  open,
  onClose,
  onSelect,
}: Readonly<TemplateGalleryModalProps>) {
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    templatesApi
      .list()
      .then((data) => {
        if (!cancelled) setTemplates(data);
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            err instanceof ApiError ? err.message : "Could not load templates.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New from template"
      className="flex max-h-[85vh] w-full max-w-2xl flex-col"
    >
      <div className="mb-4 border-b border-border pb-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconSparkles size={14} className="text-primary" /> Pick a starting
          layout for your new memory
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-1 py-1">
        {error && (
          <div className="mb-4">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <IconLoader size={24} className="animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {templates.map((template, index) => {
              return (
                <motion.button
                  key={template.id}
                  type="button"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index, 8) * 0.04 }}
                  whileHover={{ y: -3 }}
                  onClick={() => onSelect(template)}
                  className="neo-card group flex flex-col items-start gap-2 p-4 text-left border border-border bg-card hover:border-primary/50 transition-all cursor-pointer"
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <IconNotes size={18} />
                    </span>
                    <IconArrowRight
                      size={16}
                      className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </div>
                  <span className="text-sm font-bold text-foreground">
                    {template.name}
                  </span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {template.description}
                  </span>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
