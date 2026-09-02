"use client";

import { useEffect } from "react";
import { useAuthStore, initNotificationsSocket } from "@/lib/store";

export function ClientSync() {
  const userId = useAuthStore((s) => s.user?.id);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  useEffect(() => {
    if (!isInitialized) {
      void useAuthStore.getState().fetchUser();
    }
  }, [isInitialized]);

  useEffect(() => {
    const cleanup = initNotificationsSocket(userId);
    return () => {
      cleanup();
    };
  }, [userId]);

  return null;
}
