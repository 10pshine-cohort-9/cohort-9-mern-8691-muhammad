'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { IconNotes } from '@/components/ui/icons';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { NotificationDrawer } from '@/components/notifications/notification-drawer';
import { useAuthStore, useNotificationsStore } from '@/lib/store';

export function AppHeader() {
  const user = useAuthStore((s) => s.user);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <>
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
              <NotificationBell
                unreadCount={unreadCount}
                onClick={() => setNotificationsOpen(true)}
              />
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-xl border border-border bg-secondary/70 hover:bg-secondary px-3.5 py-2 text-sm font-semibold text-foreground transition-colors shadow-sm"
              >
                <IconNotes size={18} className="text-primary" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            </>
          )}
        </div>
      </motion.header>

      <NotificationDrawer
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </>
  );
}
