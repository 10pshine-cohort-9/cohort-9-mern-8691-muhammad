import * as z from 'zod';
import { CollaboratorPermission } from '../generated/prisma/enums.js';
import { userListItemSchema } from '../auth/auth.schemas.js';

export const NOTE_SORT_FIELDS = ['createdAt', 'updatedAt', 'title'] as const;
export const SORT_ORDERS = ['asc', 'desc'] as const;
export const NOTE_SCOPES = ['owned', 'shared'] as const;
export const BULK_ACTIONS = [
  'delete',
  'pin',
  'unpin',
  'favorite',
  'unfavorite',
] as const;
export const EXPORT_FORMATS = ['json', 'markdown'] as const;

export type NoteSortField = (typeof NOTE_SORT_FIELDS)[number];
export type SortOrder = (typeof SORT_ORDERS)[number];
export type BulkAction = (typeof BULK_ACTIONS)[number];
export type ExportFormat = (typeof EXPORT_FORMATS)[number];
export type NoteScope = (typeof NOTE_SCOPES)[number];

const dateStringSchema = z
  .string()
  .refine((val) => !Number.isNaN(Date.parse(val)), {
    message: 'must be a valid date string',
  });

export const TiptapDocSchema = z
  .object({
    type: z.literal('doc').default('doc'),
    content: z.array(z.record(z.string(), z.unknown())).optional().default([]),
  })
  .loose();

export const TiptapContentSchema = TiptapDocSchema;

export const CreateNoteSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters'),
  content: TiptapContentSchema.optional().default({ type: 'doc', content: [] }),
  isPinned: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  tags: z
    .array(z.string().max(50, 'Each tag must be at most 50 characters'))
    .max(20, 'A note can have at most 20 tags')
    .optional(),
});

export const UpdateNoteSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters')
    .optional(),
  content: TiptapContentSchema.optional(),
  isPinned: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  tags: z
    .array(z.string().max(50, 'Each tag must be at most 50 characters'))
    .max(20, 'A note can have at most 20 tags')
    .optional(),
});

export const QueryNotesSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  search: z.string().max(200).optional(),
  sortBy: z.enum(NOTE_SORT_FIELDS).optional().default('updatedAt'),
  order: z.enum(SORT_ORDERS).optional().default('desc'),
  pinnedOnly: z.stringbool().or(z.boolean()).optional().default(false),
  favoritesOnly: z.stringbool().or(z.boolean()).optional().default(false),
  scope: z.enum(NOTE_SCOPES).optional().default('owned'),
  tags: z.string().max(500).optional(),
  dateFrom: dateStringSchema.optional(),
  dateTo: dateStringSchema.optional(),
  hasCollaborators: z.stringbool().or(z.boolean()).optional(),
});

export const BulkActionSchema = z.object({
  noteIds: z
    .array(z.string())
    .min(1, 'Select at least one note')
    .max(200, 'At most 200 notes can be affected in one bulk operation'),
  action: z.enum(BULK_ACTIONS, {
    message:
      'action must be "delete", "pin", "unpin", "favorite", or "unfavorite"',
  }),
});

export const ExportNotesSchema = z.object({
  noteIds: z.array(z.string()).min(1).optional(),
  format: z.enum(EXPORT_FORMATS, {
    message: 'format must be "json" or "markdown"',
  }),
});

export const NoteSchema = z.object({
  id: z.string(),
  ownerId: z.string().optional(),
  title: z.string(),
  content: TiptapContentSchema,
  isPinned: z.boolean().default(false),
  isFavorite: z.boolean().default(false),
  ownerName: z.string().optional(),
  tags: z.array(z.string()).default([]),
  viewerRole: z.enum(['owner', 'write', 'read']).optional(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
});

export const NoteListMetaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export const NoteListResponseSchema = z.object({
  data: z.array(NoteSchema),
  meta: NoteListMetaSchema,
});

export const NoteVersionSchema = z.object({
  id: z.string(),
  noteId: z.string(),
  title: z.string(),
  content: TiptapContentSchema,
  tags: z.array(z.string()).default([]),
  editedById: z.string().optional(),
  editedByName: z.string().optional(),
  createdAt: z.union([z.string(), z.date()]),
});

export const InviteCollaboratorSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Please provide a valid email address or username')
    .transform((val) => val.replace(/^@/, '').trim()),
  permission: z
    .enum(CollaboratorPermission)
    .optional()
    .default(CollaboratorPermission.READ),
});

export const UpdateCollaboratorSchema = z.object({
  permission: z.enum(CollaboratorPermission),
});

export const CollaboratorSchema = z.object({
  id: z.string(),
  noteId: z.string(),
  userId: z.string(),
  permission: z.enum(CollaboratorPermission),
  invitedAt: z.union([z.string(), z.date()]),
  user: userListItemSchema.optional(),
});

export const BulkActionResponseSchema = z.object({
  affected: z.number(),
});
