import * as z from "zod";

export const NOTE_SORT_FIELDS = ["createdAt", "updatedAt", "title"] as const;
export const SORT_ORDERS = ["asc", "desc"] as const;

export type NoteSortField = (typeof NOTE_SORT_FIELDS)[number];
export type SortOrder = (typeof SORT_ORDERS)[number];

const dateStringSchema = z
  .string()
  .refine((val) => !Number.isNaN(Date.parse(val)), {
    message: "must be a valid date string",
  });

export const createNoteSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters"),
  content: z.string().max(200000, "Note content is too long").default(""),
  isPinned: z.boolean().optional().default(false),
  isFavorite: z.boolean().optional().default(false),
  tags: z
    .array(z.string().max(50, "Each tag must be at most 50 characters"))
    .max(20, "A note can have at most 20 tags")
    .optional()
    .default([]),
});

export const updateNoteSchema = createNoteSchema.partial();

export const queryNotesSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(50).optional().default(10),
  search: z.string().max(200).optional(),
  sortBy: z.enum(NOTE_SORT_FIELDS).optional().default("updatedAt"),
  order: z.enum(SORT_ORDERS).optional().default("desc"),
  pinnedOnly: z.boolean().optional().default(false),
  favoritesOnly: z.boolean().optional().default(false),
  tags: z.string().max(500).optional(),
  dateFrom: dateStringSchema.optional(),
  dateTo: dateStringSchema.optional(),
});

export const noteSchema = z.object({
  id: z.string(),
  ownerId: z.string().optional(),
  title: z.string(),
  content: z.string(),
  isPinned: z.boolean().default(false),
  isFavorite: z.boolean().default(false),
  ownerName: z.string().optional(),
  tags: z.array(z.string()).default([]),
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

export const noteFiltersSchema = queryNotesSchema.pick({
  dateFrom: true,
  dateTo: true,
  tags: true,
});

// Inferred TypeScript Types
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type NotesQueryInput = z.input<typeof queryNotesSchema>;
export type NotesQuery = z.infer<typeof queryNotesSchema>;
export type NoteFilters = z.infer<typeof noteFiltersSchema>;
export type Note = z.infer<typeof noteSchema>;
export type NoteListMeta = z.infer<typeof noteListMetaSchema>;
export type PaginatedNotes = z.infer<typeof noteListResponseSchema>;
