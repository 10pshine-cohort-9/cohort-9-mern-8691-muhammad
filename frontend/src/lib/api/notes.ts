import { z } from 'zod';
import { API_URL, ApiError, buildQueryString, request } from './client';
import {
  bulkActionResponseSchema,
  collaboratorSchema,
  importResponseSchema,
  noteListResponseSchema,
  noteSchema,
  noteVersionSchema,
  voidResponseSchema,
  type BulkActionInput,
  type BulkActionResponse,
  type Collaborator,
  type CollaboratorPermission,
  type CreateNoteInput,
  type ExportNotesInput,
  type ImportResponse,
  type InviteCollaboratorInput,
  type Note,
  type NoteVersion,
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

  inviteCollaborator: (
    id: string,
    data: InviteCollaboratorInput,
  ): Promise<Collaborator> =>
    request(`/notes/${id}/invite`, collaboratorSchema, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listCollaborators: (id: string): Promise<Collaborator[]> =>
    request(`/notes/${id}/collaborators`, z.array(collaboratorSchema)),

  updateCollaborator: (
    id: string,
    userId: string,
    permission: CollaboratorPermission,
  ): Promise<Collaborator> =>
    request(`/notes/${id}/invite/${userId}`, collaboratorSchema, {
      method: 'PATCH',
      body: JSON.stringify({ permission }),
    }),

  removeCollaborator: (id: string, userId: string): Promise<void> =>
    request(`/notes/${id}/invite/${userId}`, voidResponseSchema, {
      method: 'DELETE',
    }),

  export: async (
    data: ExportNotesInput,
  ): Promise<{ blob: Blob; filename: string }> => {
    const response = await fetch(`${API_URL}/notes/export`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const body = response.headers
        .get('content-type')
        ?.includes('application/json')
        ? await response.json()
        : undefined;
      throw new ApiError(
        response.status,
        body?.message || 'Could not export notes.',
        body,
      );
    }

    const disposition = response.headers.get('content-disposition') ?? '';
    const filenameMatch = disposition.match(/filename="([^"]+)"/);
    const filename =
      filenameMatch?.[1] ??
      `notes-export.${data.format === 'json' ? 'json' : 'md'}`;

    return { blob: await response.blob(), filename };
  },

  import: async (files: File[]): Promise<ImportResponse> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    return request('/notes/import', importResponseSchema, {
      method: 'POST',
      body: formData,
    });
  },

  bulkAction: (data: BulkActionInput): Promise<BulkActionResponse> =>
    request('/notes/bulk', bulkActionResponseSchema, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listVersions: (id: string): Promise<NoteVersion[]> =>
    request(`/notes/${id}/versions`, z.array(noteVersionSchema)),

  getVersion: (id: string, versionId: string): Promise<NoteVersion> =>
    request(`/notes/${id}/versions/${versionId}`, noteVersionSchema),

  restoreVersion: (id: string, versionId: string): Promise<Note> =>
    request(`/notes/${id}/versions/${versionId}/restore`, noteSchema, {
      method: 'POST',
    }),
};
