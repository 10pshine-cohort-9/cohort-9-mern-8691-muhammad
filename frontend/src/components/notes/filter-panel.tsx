"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IconClose, IconSparkles } from "@/components/ui/icons";
import type { NoteFilters } from "@/lib/schemas";

export type { NoteFilters };

interface FilterPanelProps {
  filters: NoteFilters;
  onChange: (filters: NoteFilters) => void;
}

function countActive(filters: NoteFilters): number {
  return Object.values(filters).filter((v) => v !== undefined && v !== "")
    .length;
}

export function FilterPanel({ filters, onChange }: Readonly<FilterPanelProps>) {
  const [open, setOpen] = useState(false);
  const activeCount = countActive(filters);

  const update = (patch: Partial<NoteFilters>) =>
    onChange({ ...filters, ...patch });
  const clear = () => onChange({});

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex h-10 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition-colors cursor-pointer ${
          activeCount > 0
            ? "border-primary/40 bg-primary/15 text-primary"
            : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <IconSparkles size={14} />
        <span>Filters</span>
        {activeCount > 0 && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {activeCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <button
              type="button"
              aria-label="Close filters"
              className="fixed inset-0 z-30 cursor-default"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="neo-card absolute right-0 z-40 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] rounded-2xl p-5 shadow-2xl border border-border bg-card"
            >
              <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                <p className="text-sm font-bold text-foreground">
                  Advanced Filters
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close filters"
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  <IconClose size={15} />
                </button>
              </div>

              <div className="space-y-4">
                <fieldset>
                  <legend className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Date Range
                  </legend>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="date-from"
                        className="mb-1 block text-[11px] text-muted-foreground"
                      >
                        From
                      </label>

                      <input
                        id="date-from"
                        type="date"
                        value={filters.dateFrom ?? ""}
                        onChange={(e) =>
                          update({ dateFrom: e.target.value || undefined })
                        }
                        className="h-9 w-full rounded-xl border border-border bg-secondary/60 px-2.5 text-xs text-foreground outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="date-to"
                        className="mb-1 block text-[11px] text-muted-foreground"
                      >
                        To
                      </label>

                      <input
                        id="date-to"
                        type="date"
                        value={filters.dateTo ?? ""}
                        onChange={(e) =>
                          update({ dateTo: e.target.value || undefined })
                        }
                        className="h-9 w-full rounded-xl border border-border bg-secondary/60 px-2.5 text-xs text-foreground outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </fieldset>
                <div>
                  <label
                    htmlFor="filter-tags"
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground"
                  >
                    Tags (comma-separated)
                  </label>

                  <input
                    id="filter-tags"
                    type="text"
                    value={filters.tags ?? ""}
                    onChange={(e) =>
                      update({ tags: e.target.value || undefined })
                    }
                    placeholder="work, urgent"
                    className="h-9 w-full rounded-xl border border-border bg-secondary/60 px-3 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
                  />
                </div>
              </div>

              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={clear}
                  className="mt-5 w-full rounded-xl border border-destructive/30 py-2 text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                >
                  Clear all filters
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
