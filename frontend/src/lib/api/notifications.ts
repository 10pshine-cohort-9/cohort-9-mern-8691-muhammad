import { buildQueryString, request } from './client';
import {
  markAllReadResponseSchema,
  notificationListResponseSchema,
  notificationSchema,
  unreadCountResponseSchema,
  voidResponseSchema,
  type AppNotification,
  type MarkAllReadResponse,
  type PaginatedNotifications,
  type QueryNotificationsInput,
  type UnreadCountResponse,
} from '../schemas';

export const notificationsApi = {
  list: (query: QueryNotificationsInput = {}): Promise<PaginatedNotifications> =>
    request(
      `/notifications${buildQueryString(query)}`,
      notificationListResponseSchema,
    ),

  unreadCount: (): Promise<UnreadCountResponse> =>
    request('/notifications/unread-count', unreadCountResponseSchema),

  markRead: (id: string): Promise<AppNotification> =>
    request(`/notifications/${id}/read`, notificationSchema, {
      method: 'PATCH',
    }),

  markAllRead: (): Promise<MarkAllReadResponse> =>
    request('/notifications/read-all', markAllReadResponseSchema, {
      method: 'PATCH',
    }),

  remove: (id: string): Promise<void> =>
    request(`/notifications/${id}`, voidResponseSchema, { method: 'DELETE' }),
};
