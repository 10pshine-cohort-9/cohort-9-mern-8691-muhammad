"use client";

import { useState, type KeyboardEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { IconTag, IconClose } from "@/components/ui/icons";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
  maxTags?: number;
}

export function TagInput({
  tags,
  onChange,
  disabled,
  maxTags = 20,
}: Readonly<TagInputProps>) {
  const [draft, setDraft] = useState("");

  const commitDraft = () => {
    const normalized = draft.trim().toLowerCase();
    if (!normalized) return;
    if (tags.includes(normalized)) {
      setDraft("");
      return;
    }
    if (tags.length >= maxTags) {
      setDraft("");
      return;
    }
    onChange([...tags, normalized]);
    setDraft("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitDraft();
    } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (tag: string) => onChange(tags.filter((t) => t !== tag));

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 rounded-xl border px-3 py-1.5 ${
        disabled
          ? "border-border bg-muted/40"
          : "border-border bg-secondary/50 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20"
      }`}
    >
      <IconTag
        size={14}
        className="ml-0.5 shrink-0 text-muted-foreground mr-1"
      />
      <AnimatePresence initial={false}>
        {tags.map((tag) => (
          <motion.span
            key={tag}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                aria-label={`Remove tag ${tag}`}
                onClick={() => removeTag(tag)}
                className="rounded-full hover:bg-emerald-500/30 p-0.5"
              >
                <IconClose size={10} />
              </button>
            )}
          </motion.span>
        ))}
      </AnimatePresence>
      {!disabled && (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitDraft}
          placeholder={
            tags.length === 0 ? "Type tag and press Enter or comma…" : ""
          }
          aria-label="Add a tag"
          className="min-w-30 flex-1 bg-transparent py-1 text-xs text-foreground outline-none placeholder:text-muted-foreground"
        />
      )}
    </div>
  );
}
