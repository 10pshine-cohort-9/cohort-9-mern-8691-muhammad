import * as z from 'zod';
import {
  BulkActionResponseSchema,
  BulkActionSchema,
  CollaboratorSchema,
  CreateNoteSchema,
  ExportNotesSchema,
  InviteCollaboratorSchema,
  NoteListMetaSchema,
  NoteListResponseSchema,
  NoteSchema,
  NoteVersionSchema,
  QueryNotesSchema,
  UpdateCollaboratorSchema,
  UpdateNoteSchema,
} from './notes.schemas.js';

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UploadedFileLike {
  originalname: string;
  buffer: Buffer;
}

export interface ImportResult {
  created: number;
  failed: { filename: string; error: string }[];
}

export interface ExportResult {
  filename: string;
  contentType: string;
  content: string;
}

export type ViewerRole = 'owner' | 'write' | 'read';

export type CreateNoteInput = z.infer<typeof CreateNoteSchema>;
export type UpdateNoteInput = z.infer<typeof UpdateNoteSchema>;
export type QueryNotesInput = z.infer<typeof QueryNotesSchema>;
export type BulkActionInput = z.infer<typeof BulkActionSchema>;
export type InviteCollaboratorInput = z.infer<typeof InviteCollaboratorSchema>;
export type UpdateCollaboratorInput = z.infer<typeof UpdateCollaboratorSchema>;
export type ExportNotesInput = z.infer<typeof ExportNotesSchema>;

export type NoteResponse = z.infer<typeof NoteSchema>;
export type NoteListMeta = z.infer<typeof NoteListMetaSchema>;
export type NoteListResponse = z.infer<typeof NoteListResponseSchema>;
export type NoteVersionResponse = z.infer<typeof NoteVersionSchema>;
export type CollaboratorResponse = z.infer<typeof CollaboratorSchema>;
export type BulkActionResponse = z.infer<typeof BulkActionResponseSchema>;
