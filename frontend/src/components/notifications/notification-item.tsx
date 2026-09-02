"use client";

import { motion } from "motion/react";
import { IconCheck, IconClose } from "@/components/ui/icons";
import { formatDistanceToNow } from "date-fns";
import type { AppNotification } from "@/lib/api";
import { presentNotification } from "./present-notification";

interface NotificationItemProps {
  notification: AppNotification;
  onOpen: (notification: AppNotification) => void;
  onMarkRead: (id: string) => void;
  onRemove: (id: string) => void;
}

export function NotificationItem({
  notification,
  onOpen,
  onMarkRead,
  onRemove,
}: Readonly<NotificationItemProps>) {
  const {
    icon: Icon,
    iconColorClass,
    message,
  } = presentNotification(notification);
  const isUnread = !notification.readAt;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16, height: 0 }}
      transition={{ duration: 0.25 }}
      onClick={() => onOpen(notification)}
      className={`group relative flex cursor-pointer gap-3 rounded-2xl border px-3.5 py-3 transition-colors ${
        isUnread
          ? "border-primary/30 bg-primary/5 hover:bg-primary/10"
          : "border-border bg-card hover:bg-muted/50"
      }`}
    >
      {isUnread && (
        <span className="absolute left-1.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary" />
      )}

      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${iconColorClass}`}
      >
        <Icon size={16} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-xs sm:text-sm font-medium leading-snug text-foreground">
          {message}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground font-mono">
          {formatDistanceToNow(new Date(notification.createdAt), {
            addSuffix: true,
          })}
        </p>
      </div>

      <div className="flex shrink-0 items-start gap-1 opacity-80 sm:opacity-0 transition-opacity group-hover:opacity-100">
        {isUnread && (
          <button
            type="button"
            aria-label="Mark as read"
            title="Mark as read"
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(notification.id);
            }}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <IconCheck size={14} />
          </button>
        )}
        <button
          type="button"
          aria-label="Dismiss notification"
          title="Dismiss"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(notification.id);
          }}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <IconClose size={14} />
        </button>
      </div>
    </motion.li>
  );
}
