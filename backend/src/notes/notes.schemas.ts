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

export const CreateNoteSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters'),
  content: z.string().max(200000, 'Note content is too long'),
  isPinned: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  tags: z
    .array(z.string().max(50, 'Each tag must be at most 50 characters'))
    .max(20, 'A note can have at most 20 tags')
    .optional(),
});

export const UpdateNoteSchema = CreateNoteSchema.partial();

export const QueryNotesSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  search: z.string().max(200).optional(),
  sortBy: z.enum(NOTE_SORT_FIELDS).optional().default('updatedAt'),
  order: z.enum(SORT_ORDERS).optional().default('desc'),
  pinnedOnly: z.coerce.boolean().optional().default(false),
  favoritesOnly: z.coerce.boolean().optional().default(false),
  tags: z.string().max(500).optional(),
  dateFrom: dateStringSchema.optional(),
  dateTo: dateStringSchema.optional(),
});

export const NoteSchema = z.object({
  id: z.string(),
  ownerId: z.string().optional(),
  title: z.string(),
  content: z.string(),
  isPinned: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
  tags: z.any().optional(),
  owner: z.any().optional(),
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
