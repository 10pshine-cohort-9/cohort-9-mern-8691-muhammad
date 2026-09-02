"use client";

import { motion, AnimatePresence } from "motion/react";
import { IconBell } from "@/components/ui/icons";
import { useNotificationsStore } from "@/lib/store";

interface NotificationBellProps {
  unreadCount?: number;
  onClick: () => void;
}

export function NotificationBell({
  unreadCount: propUnreadCount,
  onClick,
}: Readonly<NotificationBellProps>) {
  const storeUnreadCount = useNotificationsStore((s) => s.unreadCount);
  const unreadCount = propUnreadCount ?? storeUnreadCount;
  const hasUnread = unreadCount > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        hasUnread ? `Notifications, ${unreadCount} unread` : "Notifications"
      }
      title="Notifications"
      className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary/80 hover:bg-secondary text-foreground transition-colors shadow-sm cursor-pointer"
    >
      <IconBell
        size={18}
        className={hasUnread ? "text-primary" : "text-muted-foreground"}
      />
      <AnimatePresence>
        {hasUnread && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground shadow-sm"
          >
            <span className="relative">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
