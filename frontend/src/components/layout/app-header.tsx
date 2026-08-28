"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { IconUserCircle, IconLogout } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useAuthStore } from "@/lib/store";
import { ApiError } from "@/lib/api";
import { toast } from "sonner";

export function AppHeader() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="glass-panel sticky top-4 z-30 mx-4 mt-4 flex items-center justify-between rounded-2xl px-5 py-3.5 shadow-md md:mx-8 border border-border bg-card"
    >
      <Link href="/dashboard" className="flex items-center group">
        <div className="flex items-center text-2xl font-black tracking-tight select-none group-hover:opacity-90 transition-opacity">
          <span className="brand-title-mem">MEM</span>
          <span className="brand-title-ories">ORIES</span>
        </div>
      </Link>

      <div className="flex items-center gap-2.5">
        <ThemeToggle />
        {user && (
          <>
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-xl border border-border bg-secondary/70 hover:bg-secondary px-3.5 py-2 text-sm font-semibold text-foreground transition-colors shadow-sm"
            >
              <IconUserCircle size={18} className="text-primary" />
              <span className="hidden sm:inline">
                {user.name ? user.name : `@${user.username}`}
              </span>
            </Link>
            <button
              type="button"
              onClick={async () => {
                try {
                  await logout();
                } catch (err) {
                  toast.error(
                    err instanceof ApiError
                      ? err.message
                      : "Failed to log out.",
                  );
                }
              }}
              aria-label="Log out"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
              title="Log out"
            >
              <IconLogout size={18} />
            </button>
          </>
        )}
      </div>
    </motion.header>
  );
}
