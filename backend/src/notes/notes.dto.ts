import { createZodDto } from 'nestjs-zod';
import {
  BulkActionResponseSchema,
  BulkActionSchema,
  CollaboratorListResponseSchema,
  CollaboratorSchema,
  CreateNoteSchema,
  ExportNotesSchema,
  InviteCollaboratorSchema,
  NoteListResponseSchema,
  NoteSchema,
  NoteVersionListResponseSchema,
  NoteVersionSchema,
  QueryNotesSchema,
  UpdateCollaboratorSchema,
  UpdateNoteSchema,
} from './notes.schemas.js';

export class CreateNoteDto extends createZodDto(CreateNoteSchema) {}
export class UpdateNoteDto extends createZodDto(UpdateNoteSchema) {}
export class QueryNotesDto extends createZodDto(QueryNotesSchema) {}
export class BulkActionDto extends createZodDto(BulkActionSchema) {}
export class InviteCollaboratorDto extends createZodDto(
  InviteCollaboratorSchema,
) {}
export class UpdateCollaboratorDto extends createZodDto(
  UpdateCollaboratorSchema,
) {}
export class ExportNotesDto extends createZodDto(ExportNotesSchema) {}

export class NoteResponseDto extends createZodDto(NoteSchema) {}
export class NoteListResponseDto extends createZodDto(NoteListResponseSchema) {}
export class NoteVersionResponseDto extends createZodDto(NoteVersionSchema) {}
export class CollaboratorResponseDto extends createZodDto(CollaboratorSchema) {}
export class BulkActionResponseDto extends createZodDto(
  BulkActionResponseSchema,
) {}
export class NoteVersionListResponseDto extends createZodDto(
  NoteVersionListResponseSchema,
) {}
export class CollaboratorListResponseDto extends createZodDto(
  CollaboratorListResponseSchema,
) {}
