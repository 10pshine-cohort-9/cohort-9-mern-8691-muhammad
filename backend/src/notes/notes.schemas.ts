import * as z from 'zod';

export const NOTE_SORT_FIELDS = ['createdAt', 'updatedAt', 'title'] as const;
export const SORT_ORDERS = ['asc', 'desc'] as const;

export type NoteSortField = (typeof NOTE_SORT_FIELDS)[number];
export type SortOrder = (typeof SORT_ORDERS)[number];

const dateStringSchema = z
  .string()
  .refine((val) => !Number.isNaN(Date.parse(val)), {
    message: 'must be a valid date string',
  });

export const TiptapDocSchema = z
  .object({
    type: z.string().default('doc'),
    content: z.array(z.record(z.string(), z.unknown())).optional().default([]),
  })
  .loose();

export const TiptapContentSchema = z.union([
  TiptapDocSchema,
  z.record(z.string(), z.unknown()),
  z.string(),
]);

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
  pinnedOnly: z.stringbool().optional().default(false),
  favoritesOnly: z.stringbool().optional().default(false),
  tags: z.string().max(500).optional(),
  dateFrom: dateStringSchema.optional(),
  dateTo: dateStringSchema.optional(),
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
