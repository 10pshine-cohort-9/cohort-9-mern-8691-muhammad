import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  BadRequestException,
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
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ZodSerializerDto } from 'nestjs-zod';
import { NotesService } from './notes.service.js';
import type {
  ExportResult,
  ImportResult,
  PaginatedResult,
  BulkActionResponse,
  CollaboratorResponse,
  NoteResponse,
  NoteVersionResponse,
} from './notes.types.js';
import {
  BulkActionDto,
  BulkActionResponseDto,
  CollaboratorResponseDto,
  CreateNoteDto,
  ExportNotesDto,
  InviteCollaboratorDto,
  NoteListResponseDto,
  NoteResponseDto,
  NoteVersionResponseDto,
  QueryNotesDto,
  UpdateCollaboratorDto,
  UpdateNoteDto,
} from './notes.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { SafeUser } from '../auth/auth.types.js';

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

  @Post('export')
  @HttpCode(HttpStatus.OK)
  async exportNotes(
    @CurrentUser() user: SafeUser,
    @Body() dto: ExportNotesDto,
    @Res() res: Response,
  ): Promise<void> {
    const result: ExportResult = await this.notesService.exportNotes(
      user.id,
      dto,
    );
    const contentType =
      result.contentType === 'application/json'
        ? 'application/json; charset=utf-8'
        : (result.contentType ?? 'text/markdown; charset=utf-8');
    const filename = result.filename ?? 'notes-export.json';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.send(result.content);
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FilesInterceptor('files', 10))
  async importNotes(
    @CurrentUser() user: SafeUser,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<ImportResult> {
    if (!files || files.length === 0) {
      throw new BadRequestException(
        'At least one file must be provided for import',
      );
    }

    const filePayloads = files.map((file) => ({
      originalname: file.originalname,
      buffer: file.buffer,
    }));

    return this.notesService.importNotes(user.id, filePayloads);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(BulkActionResponseDto)
  async bulkAction(
    @CurrentUser() user: SafeUser,
    @Body() dto: BulkActionDto,
  ): Promise<BulkActionResponse> {
    return this.notesService.bulkAction(user.id, dto);
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

  @Post(':id/invite')
  @HttpCode(HttpStatus.CREATED)
  @ZodSerializerDto(CollaboratorResponseDto)
  async invite(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
    @Body() dto: InviteCollaboratorDto,
  ): Promise<CollaboratorResponse> {
    return this.notesService.inviteCollaborator(user.id, id, dto);
  }

  @Get(':id/collaborators')
  async listCollaborators(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
  ): Promise<CollaboratorResponse[]> {
    return this.notesService.listCollaborators(user.id, id);
  }

  @Patch(':id/invite/:collaboratorId')
  @ZodSerializerDto(CollaboratorResponseDto)
  async updateCollaborator(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
    @Param('collaboratorId') collaboratorId: string,
    @Body() dto: UpdateCollaboratorDto,
  ): Promise<CollaboratorResponse> {
    return this.notesService.updateCollaboratorPermission(
      user.id,
      id,
      collaboratorId,
      dto,
    );
  }

  @Delete(':id/invite/:collaboratorId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeCollaborator(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
    @Param('collaboratorId') collaboratorId: string,
  ): Promise<void> {
    return this.notesService.removeCollaborator(user.id, id, collaboratorId);
  }

  @Get(':id/versions')
  async listVersions(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
  ): Promise<NoteVersionResponse[]> {
    return this.notesService.listVersions(user.id, id);
  }

  @Get(':id/versions/:versionId')
  @ZodSerializerDto(NoteVersionResponseDto)
  async getVersion(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ): Promise<NoteVersionResponse> {
    return this.notesService.getVersion(user.id, id, versionId);
  }

  @Post(':id/versions/:versionId/restore')
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(NoteResponseDto)
  async restoreVersion(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ): Promise<NoteResponse> {
    return this.notesService.restoreVersion(user.id, id, versionId);
  }
}
