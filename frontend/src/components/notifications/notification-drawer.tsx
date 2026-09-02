"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useShallow } from "zustand/react/shallow";
import { IconBell, IconCheck, IconClose } from "@/components/ui/icons";
import { useNotificationsStore } from "@/lib/store";
import type { AppNotification } from "@/lib/api";
import { NotificationItem } from "./notification-item";

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationDrawer({
  open,
  onClose,
}: Readonly<NotificationDrawerProps>) {
  const {
    notifications,
    unreadCount,
    isLoading,
    isConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotificationsStore(
    useShallow((s) => ({
      notifications: s.notifications,
      unreadCount: s.unreadCount,
      isLoading: s.isLoading,
      isConnected: s.isConnected,
      markAsRead: s.markAsRead,
      markAllAsRead: s.markAllAsRead,
      deleteNotification: s.deleteNotification,
    })),
  );
  const router = useRouter();

  const handleOpenNotification = (notification: AppNotification) => {
    if (!notification.readAt) markAsRead(notification.id);
    onClose();
    router.push("/dashboard");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="neo-card fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col shadow-2xl sm:m-4 sm:h-[calc(100%-2rem)] sm:rounded-3xl border border-border bg-card overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-muted/20">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Notifications
                </h2>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                  <span
                    className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`}
                  />
                  {isConnected ? "Live" : "Reconnecting…"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllAsRead()}
                    aria-label="Mark all as read"
                    title="Mark all as read"
                    className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
                  >
                    <IconCheck size={18} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close notifications"
                  className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <IconClose size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded-2xl bg-muted/60"
                    />
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2.5 py-16 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <IconBell size={24} />
                  </div>
                  <p className="text-sm font-bold text-foreground">
                    All Caught Up!
                  </p>
                  <p className="text-xs text-muted-foreground max-w-50">
                    You have no new collaboration or edit notifications right
                    now.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  <AnimatePresence initial={false}>
                    {notifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onOpen={handleOpenNotification}
                        onMarkRead={markAsRead}
                        onRemove={deleteNotification}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
