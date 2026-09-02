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
        className={`flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition-colors ${
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
              className="neo-card absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card p-5 shadow-2xl sm:w-96"
            >
              <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                <p className="text-sm font-bold text-foreground">
                  Advanced Filters
                </p>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close filters"
                  className="cursor-pointer rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <IconClose size={15} />
                </button>
              </div>

              <div className="space-y-4">
                <fieldset>
                  <legend className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Date Range
                  </legend>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="filter-date-from"
                        className="mb-1 block text-[11px] text-muted-foreground"
                      >
                        From
                      </label>

                      <input
                        id="filter-date-from"
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
                        htmlFor="filter-date-to"
                        className="mb-1 block text-[11px] text-muted-foreground"
                      >
                        To
                      </label>

                      <input
                        id="filter-date-to"
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

                <fieldset>
                  <legend className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Collaboration
                  </legend>

                  <label htmlFor="filter-collaboration" className="sr-only">
                    Filter by collaboration
                  </label>

                  <select
                    id="filter-collaboration"
                    value={
                      filters.hasCollaborators === undefined
                        ? ""
                        : String(filters.hasCollaborators)
                    }
                    onChange={(e) =>
                      update({
                        hasCollaborators:
                          e.target.value === ""
                            ? undefined
                            : e.target.value === "true",
                      })
                    }
                    className="h-9 w-full rounded-xl border border-border bg-secondary/60 px-3 text-xs font-semibold text-foreground outline-none focus:border-primary"
                  >
                    <option value="">Any</option>
                    <option value="true">Shared with others</option>
                    <option value="false">Not shared</option>
                  </select>
                </fieldset>

                <fieldset>
                  <legend className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Tags
                  </legend>

                  <label
                    htmlFor="filter-tags"
                    className="mb-1 block text-[11px] text-muted-foreground"
                  >
                    Comma-separated
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
                </fieldset>
              </div>

              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={clear}
                  className="mt-5 w-full cursor-pointer rounded-xl border border-destructive/30 py-2 text-xs font-bold text-destructive transition-colors hover:bg-destructive/10"
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
