import { createZodDto } from 'nestjs-zod';
import {
  CreateNoteSchema,
  NoteListResponseSchema,
  NoteSchema,
  QueryNotesSchema,
  UpdateNoteSchema,
} from './notes.schemas.js';

export class CreateNoteDto extends createZodDto(CreateNoteSchema) {}
export class UpdateNoteDto extends createZodDto(UpdateNoteSchema) {}
export class QueryNotesDto extends createZodDto(QueryNotesSchema) {}
export class NoteResponseDto extends createZodDto(NoteSchema) {}
export class NoteListResponseDto extends createZodDto(NoteListResponseSchema) {}
