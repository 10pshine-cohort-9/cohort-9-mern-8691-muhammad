import * as z from 'zod';
import { COLLABORATOR_PERMISSIONS } from './notes.schema';

export const NOTIFICATION_TYPES = [
  'COLLABORATOR_INVITED',
  'PERMISSION_CHANGED',
  'COLLABORATOR_REMOVED',
  'NOTE_EDITED',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const queryNotificationsSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(50).optional().default(20),
  unreadOnly: z.boolean().optional().default(false),
});

export const collaboratorInvitedPayloadSchema = z.object({
  noteId: z.string(),
  noteTitle: z.string(),
  inviterName: z.string(),
  permission: z.enum(COLLABORATOR_PERMISSIONS),
});

export const permissionChangedPayloadSchema = z.object({
  noteId: z.string(),
  noteTitle: z.string(),
  permission: z.enum(COLLABORATOR_PERMISSIONS),
  changedByName: z.string(),
});

export const collaboratorRemovedPayloadSchema = z.object({
  noteId: z.string(),
  noteTitle: z.string(),
  removedByName: z.string(),
});

export const noteEditedPayloadSchema = z.object({
  noteId: z.string(),
  noteTitle: z.string(),
  editorName: z.string(),
});

export const notificationPayloadSchema = z.union([
  collaboratorInvitedPayloadSchema,
  permissionChangedPayloadSchema,
  collaboratorRemovedPayloadSchema,
  noteEditedPayloadSchema,
  z.record(z.string(), z.unknown()),
]);

export const notificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum(NOTIFICATION_TYPES),
  payload: notificationPayloadSchema,
  readAt: z.union([z.date(), z.string()]).nullable().optional(),
  createdAt: z.union([z.date(), z.string()]),
});

export const notificationListResponseSchema = z.object({
  data: z.array(notificationSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export const unreadCountResponseSchema = z.object({
  count: z.number().optional(),
  unreadCount: z.number().optional(),
});

export const markAllReadResponseSchema = z.object({
  updated: z.number(),
});

// Inferred TypeScript Types
export type QueryNotificationsInput = z.input<typeof queryNotificationsSchema>;
export type QueryNotifications = z.infer<typeof queryNotificationsSchema>;
export type CollaboratorInvitedPayload = z.infer<
  typeof collaboratorInvitedPayloadSchema
>;
export type PermissionChangedPayload = z.infer<
  typeof permissionChangedPayloadSchema
>;
export type CollaboratorRemovedPayload = z.infer<
  typeof collaboratorRemovedPayloadSchema
>;
export type NoteEditedPayload = z.infer<typeof noteEditedPayloadSchema>;
export type NotificationPayload = z.infer<typeof notificationPayloadSchema>;
export type AppNotification = z.infer<typeof notificationSchema>;
export type PaginatedNotifications = z.infer<
  typeof notificationListResponseSchema
>;
export type UnreadCountResponse = z.infer<typeof unreadCountResponseSchema>;
export type MarkAllReadResponse = z.infer<typeof markAllReadResponseSchema>;
