import * as z from "zod";

import { userListItemSchema } from "./auth.schema";

export const NOTE_SORT_FIELDS = ["createdAt", "updatedAt", "title"] as const;
export const SORT_ORDERS = ["asc", "desc"] as const;
export const NOTE_SCOPES = ["owned", "shared"] as const;
export const BULK_ACTIONS = [
  "delete",
  "pin",
  "unpin",
  "favorite",
  "unfavorite",
] as const;
export const EXPORT_FORMATS = ["json", "markdown"] as const;
export const COLLABORATOR_PERMISSIONS = ["READ", "WRITE"] as const;
export const VIEWER_ROLES = ["owner", "write", "read"] as const;

export type NoteSortField = (typeof NOTE_SORT_FIELDS)[number];
export type SortOrder = (typeof SORT_ORDERS)[number];
export type NoteScope = (typeof NOTE_SCOPES)[number];
export type BulkAction = (typeof BULK_ACTIONS)[number];
export type ExportFormat = (typeof EXPORT_FORMATS)[number];
export type CollaboratorPermission = (typeof COLLABORATOR_PERMISSIONS)[number];
export type ViewerRole = (typeof VIEWER_ROLES)[number];

const dateStringSchema = z
  .string()
  .refine((val) => !Number.isNaN(Date.parse(val)), {
    message: "must be a valid date string",
  });

export const tiptapDocSchema = z
  .object({
    type: z.string().optional().default("doc"),
    content: z.array(z.record(z.string(), z.unknown())).optional().default([]),
  })
  .loose();

export const tiptapContentSchema = tiptapDocSchema;

export const createNoteSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters"),
  content: tiptapContentSchema.optional().default({ type: "doc", content: [] }),
  isPinned: z.boolean().optional().default(false),
  isFavorite: z.boolean().optional().default(false),
  tags: z
    .array(z.string().max(50, "Each tag must be at most 50 characters"))
    .max(20, "A note can have at most 20 tags")
    .optional()
    .default([]),
});

export const updateNoteSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters")
    .optional(),
  content: tiptapContentSchema.optional(),
  isPinned: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  tags: z
    .array(z.string().max(50, "Each tag must be at most 50 characters"))
    .max(20, "A note can have at most 20 tags")
    .optional(),
});

export const queryNotesSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(50).optional().default(10),
  search: z.string().max(200).optional(),
  sortBy: z.enum(NOTE_SORT_FIELDS).optional().default("updatedAt"),
  order: z.enum(SORT_ORDERS).optional().default("desc"),
  pinnedOnly: z.boolean().optional().default(false),
  favoritesOnly: z.boolean().optional().default(false),
  scope: z.enum(NOTE_SCOPES).optional().default("owned"),
  tags: z.string().max(500).optional(),
  dateFrom: dateStringSchema.optional(),
  dateTo: dateStringSchema.optional(),
  hasCollaborators: z.boolean().optional(),
});

export const bulkActionSchema = z.object({
  noteIds: z
    .array(z.string())
    .min(1, "Select at least one note")
    .max(200, "At most 200 notes can be affected in one bulk operation"),
  action: z.enum(BULK_ACTIONS, {
    message:
      'action must be "delete", "pin", "unpin", "favorite", or "unfavorite"',
  }),
});

export const inviteCollaboratorSchema = z.object({
  identifier: z
    .string()
    .min(1, "Please enter an email or username")
    .transform((val) => val.trim().replace(/^@/, ""))
    .pipe(z.string().min(1, "Please enter an email or username")),
  permission: z.enum(COLLABORATOR_PERMISSIONS),
});

export const updateCollaboratorSchema = z.object({
  permission: z.enum(COLLABORATOR_PERMISSIONS),
});

export const exportNotesSchema = z.object({
  noteIds: z.array(z.string()).min(1).optional(),
  format: z.enum(EXPORT_FORMATS, {
    message: 'format must be "json" or "markdown"',
  }),
});

export const noteSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: tiptapContentSchema,
  isPinned: z.boolean().default(false),
  isFavorite: z.boolean().default(false),
  ownerId: z.string().optional(),
  ownerName: z.string().optional(),
  tags: z.array(z.string()).default([]),
  viewerRole: z.enum(VIEWER_ROLES).optional(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
});

export const noteListMetaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export const noteListResponseSchema = z.object({
  data: z.array(noteSchema),
  meta: noteListMetaSchema,
});

export const noteVersionSchema = z.object({
  id: z.string(),
  noteId: z.string(),
  title: z.string(),
  content: tiptapContentSchema,
  tags: z.array(z.string()).default([]),
  editedById: z.string().nullable().optional(),
  editedByName: z.string().optional(),
  createdAt: z.union([z.string(), z.date()]),
});

export const collaboratorSchema = z.object({
  id: z.string(),
  noteId: z.string(),
  userId: z.string(),
  permission: z.enum(COLLABORATOR_PERMISSIONS),
  invitedAt: z.union([z.string(), z.date()]),
  user: userListItemSchema.optional(),
});

export const bulkActionResponseSchema = z.object({
  affected: z.number(),
});

export const importFailedItemSchema = z.object({
  filename: z.string(),
  error: z.string(),
});

export const importResponseSchema = z.object({
  created: z.number(),
  failed: z.array(importFailedItemSchema),
});

export const noteFiltersSchema = queryNotesSchema.pick({
  dateFrom: true,
  dateTo: true,
  hasCollaborators: true,
  tags: true,
});

export type CreateNoteInput = z.input<typeof createNoteSchema>;
export type UpdateNoteInput = z.input<typeof updateNoteSchema>;
export type NotesQueryInput = z.input<typeof queryNotesSchema>;
export type NotesQuery = z.infer<typeof queryNotesSchema>;
export type NoteFilters = z.infer<typeof noteFiltersSchema>;
export type BulkActionInput = z.infer<typeof bulkActionSchema>;
export type InviteCollaboratorInput = z.infer<typeof inviteCollaboratorSchema>;
export type UpdateCollaboratorInput = z.infer<typeof updateCollaboratorSchema>;
export type ExportNotesInput = z.infer<typeof exportNotesSchema>;
export type Note = z.infer<typeof noteSchema>;
export type NoteListMeta = z.infer<typeof noteListMetaSchema>;
export type PaginatedNotes = z.infer<typeof noteListResponseSchema>;
export type NoteVersion = z.infer<typeof noteVersionSchema>;
export type Collaborator = z.infer<typeof collaboratorSchema>;
export type BulkActionResponse = z.infer<typeof bulkActionResponseSchema>;
export type ImportFailedItem = z.infer<typeof importFailedItemSchema>;
export type ImportResponse = z.infer<typeof importResponseSchema>;

export { type JSONContent } from "@tiptap/core";
