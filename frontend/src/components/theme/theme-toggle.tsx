"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "motion/react";
import { IconSun, IconMoon } from "@/components/ui/icons";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  useEffect(() => setLoading(true), []);
  if (!loading) return <div className="h-9 w-9" />;
  const isDark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      aria-label="Toggle theme"
      title={isDark ? "Switch to Light mode" : "Switch to Dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary/80 text-foreground shadow-sm transition-colors hover:bg-secondary"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? "moon" : "sun"}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 90, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute"
        >
          {isDark ? (
            <IconMoon size={18} className="text-amber-400" />
          ) : (
            <IconSun size={18} className="text-amber-500" />
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
