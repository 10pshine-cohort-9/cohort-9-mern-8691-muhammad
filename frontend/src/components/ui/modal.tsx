"use client";

import { AnimatePresence, motion } from "motion/react";
import { IconClose } from "@/components/ui/icons";
import { useEffect, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Extra classes for the dialog panel */
  className?: string;
  bodyClassName?: string;
  zIndex?: number;
  hideHeader?: boolean;
  noPadding?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  className = "",
  bodyClassName = "",
  zIndex = 50,
  hideHeader = false,
  noPadding = false,
}: Readonly<ModalProps>) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, handleEscape]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-[3px]"
            style={{ zIndex }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{ zIndex: zIndex + 1 }}
            className={cn(
              "neo-card fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-3xl shadow-2xl border border-border bg-card overflow-hidden flex flex-col max-h-[90vh]",
              className,
            )}
          >
            {!hideHeader && title && (
              <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4 bg-muted/20">
                <h2 className="text-base sm:text-lg font-bold text-foreground">
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={`Close ${title.toLowerCase()}`}
                  className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  <IconClose size={18} />
                </button>
              </div>
            )}
            <div
              className={cn(
                "flex-1 overflow-y-auto min-h-0",
                noPadding ? "p-0" : "p-6",
                bodyClassName,
              )}
            >
              {children}
            </div>
            {footer && (
              <div className="shrink-0 border-t border-border bg-card px-6 py-4">
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
