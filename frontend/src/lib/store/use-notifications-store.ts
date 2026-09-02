import { create } from "zustand";
import { notificationsApi } from "@/lib/api";
import type { AppNotification } from "@/lib/schemas";
import { connectSocket, disconnectSocket } from "@/lib/socket";

interface NotificationsState {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  setNotifications: (notifications: AppNotification[]) => void;
  setUnreadCount: (count: number) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsConnected: (isConnected: boolean) => void;
  setError: (error: string | null) => void;
  addNotification: (notification: AppNotification) => void;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  reset: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isConnected: false,
  error: null,

  setNotifications: (notifications) => set({ notifications }),
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsConnected: (isConnected) => set({ isConnected }),
  setError: (error) => set({ error }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    })),

  fetchNotifications: async () => {
    set({ isLoading: true, error: null });
    try {
      const [list, count] = await Promise.all([
        notificationsApi.list({ limit: 20 }),
        notificationsApi.unreadCount(),
      ]);
      const unread =
        (count as { count?: number; unreadCount?: number }).unreadCount ??
        (count as { count?: number }).count ??
        0;
      set((state) => {
        const fetchedMap = new Map(list.data.map((n) => [n.id, n]));
        const merged = [
          ...state.notifications.filter((n) => !fetchedMap.has(n.id)),
          ...list.data,
        ];
        return {
          notifications: merged,
          unreadCount: Math.max(state.unreadCount, unread),
          isLoading: false,
          error: null,
        };
      });
    } catch (err) {
      set({
        isLoading: false,
        error:
          err instanceof Error ? err.message : "Failed to fetch notifications",
      });
    }
  },

  markAsRead: async (id: string) => {
    try {
      const updated = await notificationsApi.markRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? updated : n,
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
        error: null,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to mark as read",
      });
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationsApi.markAllRead();
      const now = new Date().toISOString();
      set((state) => ({
        notifications: state.notifications.map((n) => ({
          ...n,
          readAt: n.readAt || now,
        })),
        unreadCount: 0,
        error: null,
      }));
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : "Failed to mark all as read",
      });
    }
  },

  deleteNotification: async (id: string) => {
    try {
      await notificationsApi.remove(id);
      const target = get().notifications.find((n) => n.id === id);
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount:
          target && !target.readAt
            ? Math.max(0, state.unreadCount - 1)
            : state.unreadCount,
        error: null,
      }));
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : "Failed to delete notification",
      });
    }
  },

  reset: () =>
    set({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      isConnected: false,
      error: null,
    }),
}));

export const useUnreadNotificationsCount = () =>
  useNotificationsStore((s) => s.unreadCount);
export const useNotificationsList = () =>
  useNotificationsStore((s) => s.notifications);
export const useNotificationsConnected = () =>
  useNotificationsStore((s) => s.isConnected);
export const useNotificationsLoading = () =>
  useNotificationsStore((s) => s.isLoading);

export function initNotificationsSocket(userId?: string) {
  if (!userId) {
    disconnectSocket();
    useNotificationsStore.getState().setIsConnected(false);
    return () => {};
  }

  const socket = connectSocket();
  void useNotificationsStore.getState().fetchNotifications();

  const handleConnect = () =>
    useNotificationsStore.getState().setIsConnected(true);
  const handleDisconnect = () =>
    useNotificationsStore.getState().setIsConnected(false);
  const handleNewNotification = ({
    notification,
  }: {
    notification: AppNotification;
  }) => {
    useNotificationsStore.getState().addNotification(notification);
  };

  socket.on("connect", handleConnect);
  socket.on("disconnect", handleDisconnect);
  socket.on("notification:new", handleNewNotification);

  if (socket.connected) {
    useNotificationsStore.getState().setIsConnected(true);
  }

  return () => {
    socket.off("connect", handleConnect);
    socket.off("disconnect", handleDisconnect);
    socket.off("notification:new", handleNewNotification);
  };
}

export function useNotifications() {
  const notifications = useNotificationsStore((s) => s.notifications);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const isLoading = useNotificationsStore((s) => s.isLoading);
  const isConnected = useNotificationsStore((s) => s.isConnected);
  const markAsRead = useNotificationsStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationsStore((s) => s.markAllAsRead);
  const deleteNotification = useNotificationsStore((s) => s.deleteNotification);
  const refresh = useNotificationsStore((s) => s.fetchNotifications);

  return {
    notifications,
    unreadCount,
    isLoading,
    isConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  };
}
