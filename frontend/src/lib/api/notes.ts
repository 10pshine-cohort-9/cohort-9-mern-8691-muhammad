import { buildQueryString, request } from './client';
import {
  noteListResponseSchema,
  noteSchema,
  voidResponseSchema,
  type CreateNoteInput,
  type Note,
  type NotesQueryInput,
  type PaginatedNotes,
  type UpdateNoteInput,
} from '../schemas';

export const notesApi = {
  list: (query: NotesQueryInput = {}): Promise<PaginatedNotes> =>
    request(`/notes${buildQueryString(query)}`, noteListResponseSchema),

  get: (id: string): Promise<Note> => request(`/notes/${id}`, noteSchema),

  create: (data: CreateNoteInput): Promise<Note> =>
    request('/notes', noteSchema, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateNoteInput): Promise<Note> =>
    request(`/notes/${id}`, noteSchema, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  remove: (id: string): Promise<void> =>
    request(`/notes/${id}`, voidResponseSchema, { method: 'DELETE' }),
};
