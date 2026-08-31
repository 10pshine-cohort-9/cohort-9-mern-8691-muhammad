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
  tags: z.string().max(500).optional(),
  dateFrom: dateStringSchema.optional(),
  dateTo: dateStringSchema.optional(),
});

export const noteSchema = z.object({
  id: z.string(),
  ownerId: z.string().optional(),
  title: z.string(),
  content: tiptapContentSchema,
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

export const CreateNoteSchema = createNoteSchema;
export const UpdateNoteSchema = updateNoteSchema;
export const QueryNotesSchema = queryNotesSchema;
export const NoteSchema = noteSchema;
export const NoteListMetaSchema = noteListMetaSchema;
export const NoteListResponseSchema = noteListResponseSchema;

export type CreateNoteInput = z.input<typeof createNoteSchema>;
export type UpdateNoteInput = z.input<typeof updateNoteSchema>;
export type NotesQueryInput = z.input<typeof queryNotesSchema>;
export type NotesQuery = z.infer<typeof queryNotesSchema>;
export type NoteFilters = z.infer<typeof noteFiltersSchema>;
export type Note = z.infer<typeof noteSchema>;
export type NoteListMeta = z.infer<typeof noteListMetaSchema>;
export type PaginatedNotes = z.infer<typeof noteListResponseSchema>;

export { type JSONContent } from "@tiptap/core";
