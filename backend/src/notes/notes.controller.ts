import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';
import { NotesService } from './notes.service.js';
import type { PaginatedResult } from './notes.service.js';
import {
  CreateNoteDto,
  NoteListResponseDto,
  NoteResponseDto,
  QueryNotesDto,
  UpdateNoteDto,
} from './notes.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { SafeUser } from '../auth/auth.types.js';
import type { NoteResponse } from './notes.types.js';

@ApiTags('notes')
@ApiBearerAuth()
@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ZodSerializerDto(NoteResponseDto)
  async create(
    @CurrentUser() user: SafeUser,
    @Body() dto: CreateNoteDto,
  ): Promise<NoteResponse> {
    return this.notesService.create(user.id, dto);
  }

  @Get()
  @ZodSerializerDto(NoteListResponseDto)
  async findAll(
    @CurrentUser() user: SafeUser,
    @Query() query: QueryNotesDto,
  ): Promise<PaginatedResult<NoteResponse>> {
    return this.notesService.findAll(user.id, query);
  }

  @Get(':id')
  @ZodSerializerDto(NoteResponseDto)
  async findOne(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
  ): Promise<NoteResponse> {
    return this.notesService.findOne(user.id, id);
  }

  @Patch(':id')
  @ZodSerializerDto(NoteResponseDto)
  async update(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
    @Body() dto: UpdateNoteDto,
  ): Promise<NoteResponse> {
    return this.notesService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.notesService.remove(user.id, id);
  }
}
