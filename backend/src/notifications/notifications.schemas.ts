import * as z from 'zod';
import { NotificationType } from '../generated/prisma/enums.js';

export const QueryNotificationsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  unreadOnly: z.stringbool().or(z.boolean()).optional().default(false),
});

export const CollaboratorInvitedPayloadSchema = z.object({
  noteId: z.string(),
  noteTitle: z.string(),
  inviterName: z.string(),
  permission: z.enum(['READ', 'WRITE']),
});

export const PermissionChangedPayloadSchema = z.object({
  noteId: z.string(),
  noteTitle: z.string(),
  permission: z.enum(['READ', 'WRITE']),
  changedByName: z.string(),
});

export const CollaboratorRemovedPayloadSchema = z.object({
  noteId: z.string(),
  noteTitle: z.string(),
  removedByName: z.string(),
});

export const NoteEditedPayloadSchema = z.object({
  noteId: z.string(),
  noteTitle: z.string(),
  editorName: z.string(),
});

export const NotificationPayloadSchema = z.union([
  CollaboratorInvitedPayloadSchema,
  PermissionChangedPayloadSchema,
  CollaboratorRemovedPayloadSchema,
  NoteEditedPayloadSchema,
  z.record(z.string(), z.unknown()),
]);

export const NotificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum(NotificationType).or(z.string()),
  payload: NotificationPayloadSchema,
  readAt: z.union([z.date(), z.string()]).nullable().optional(),
  createdAt: z.union([z.date(), z.string()]),
});

export const NotificationListResponseSchema = z.object({
  data: z.array(NotificationSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export const UnreadCountResponseSchema = z.object({
  count: z.number().optional(),
  unreadCount: z.number().optional(),
});
