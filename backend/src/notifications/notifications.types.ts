import * as z from 'zod';
import {
  NotificationListResponseSchema,
  NotificationSchema,
  QueryNotificationsSchema,
  UnreadCountResponseSchema,
} from './notifications.schemas.js';

export type QueryNotificationsInput = z.infer<typeof QueryNotificationsSchema>;
export type NotificationResponse = z.infer<typeof NotificationSchema>;
export type Notification = NotificationResponse;
export type NotificationPayload = Record<string, unknown>;
export type NotificationListResponse = z.infer<
  typeof NotificationListResponseSchema
>;
export type UnreadCountResponse = z.infer<typeof UnreadCountResponseSchema>;
