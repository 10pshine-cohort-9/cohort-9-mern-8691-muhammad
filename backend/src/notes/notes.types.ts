import * as z from 'zod';
import {
  CreateNoteSchema,
  NoteListMetaSchema,
  NoteListResponseSchema,
  NoteSchema,
  QueryNotesSchema,
  UpdateNoteSchema,
} from './notes.schemas.js';

export type CreateNoteInput = z.infer<typeof CreateNoteSchema>;
export type UpdateNoteInput = z.infer<typeof UpdateNoteSchema>;
export type QueryNotesInput = z.infer<typeof QueryNotesSchema>;
export type NoteResponse = z.infer<typeof NoteSchema>;
export type NoteListMeta = z.infer<typeof NoteListMetaSchema>;
export type NoteListResponse = z.infer<typeof NoteListResponseSchema>;
