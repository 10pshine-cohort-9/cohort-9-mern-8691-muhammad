import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Editor, type AnyExtension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import equal from 'fast-deep-equal';
import { CollaboratorPermission } from '../generated/prisma/enums.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TiptapDocSchema } from './notes.schemas.js';
import type {
  BulkActionInput,
  BulkActionResponse,
  CollaboratorResponse,
  CreateNoteInput,
  ExportNotesInput,
  ExportResult,
  ImportResult,
  InviteCollaboratorInput,
  NoteResponse,
  NoteVersionResponse,
  PaginatedResult,
  QueryNotesInput,
  UpdateCollaboratorInput,
  UpdateNoteInput,
  UploadedFileLike,
  ViewerRole,
} from './notes.types.js';

type NoteWithCollaborators = Prisma.NoteGetPayload<{
  include: {
    collaborators: true;
    tags: true;
    owner: { select: { username: true; name: true } };
  };
}>;

/**
 * This service handles our core business logic of notes handling and filtering.
 */
@Injectable()
export class NotesService {
  private static readonly MAX_VERSIONS_PER_NOTE = 20;

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    @InjectPinoLogger(NotesService.name) private readonly logger: PinoLogger,
  ) {}

  async create(ownerId: string, input: CreateNoteInput): Promise<NoteResponse> {
    if (!input.title?.trim()) {
      throw new UnprocessableEntityException('Title is required');
    }
    const content = this.ensureTiptapJson(input.content);
    const note = await this.prisma.note.create({
      data: {
        title: input.title.trim(),
        content: content as Prisma.InputJsonValue,
        isPinned: input.isPinned ?? false,
        isFavorite: input.isFavorite ?? false,
        ownerId,
      },
    });

    if (input.tags !== undefined) {
      await this.syncTags(note.id, input.tags);
    }

    this.logger.info(
      { userId: ownerId, noteId: note.id, tagCount: input.tags?.length ?? 0 },
      'Note created',
    );
    return {
      ...note,
      tags: input.tags ? this.normalizeTagNames(input.tags) : [],
    } as NoteResponse;
  }

  async findAll(
    userId: string,
    input: Partial<QueryNotesInput>,
  ): Promise<PaginatedResult<NoteResponse>> {
    const page = Number(input.page) || 1;
    const limit = Number(input.limit) || 10;
    const sortBy = input.sortBy ?? 'updatedAt';
    const order = input.order ?? 'desc';
    const scope = input.scope ?? 'owned';
    const isSharedScope = scope === 'shared';

    // Here we are checking the details of ownership and making the inner usable object accordingly for where clause
    const ownershipFilter: Prisma.NoteWhereInput = isSharedScope
      ? {
          collaborators: {
            some: {
              userId,
              ...(input.pinnedOnly ? { isPinned: true } : {}),
              ...(input.favoritesOnly ? { isFavorite: true } : {}),
            },
          },
        }
      : {
          ownerId: userId,
          ...(input.pinnedOnly ? { isPinned: true } : {}),
          ...(input.favoritesOnly ? { isFavorite: true } : {}),
        };

    const tagNames = input.tags
      ? Array.from<string>(
          new Set(
            input.tags
              .split(',')
              .map((t: string) => t.trim().toLowerCase())
              .filter(Boolean),
          ),
        )
      : undefined;

    const where: Prisma.NoteWhereInput = {
      ...ownershipFilter,
      ...(input.hasCollaborators === true
        ? { collaborators: { some: {} } }
        : {}),
      ...(input.hasCollaborators === false
        ? { collaborators: { none: {} } }
        : {}),
      ...(input.dateFrom || input.dateTo
        ? {
            createdAt: {
              ...(input.dateFrom ? { gte: new Date(input.dateFrom) } : {}),
              ...(input.dateTo ? { lte: new Date(input.dateTo) } : {}),
            },
          }
        : {}),
      ...(tagNames && tagNames.length > 0
        ? { tags: { some: { name: { in: tagNames } } } }
        : {}),
      ...(input.search
        ? {
            OR: [
              { title: { contains: input.search, mode: 'insensitive' } },
              { content: { string_contains: input.search } },
              {
                tags: {
                  some: {
                    name: { contains: input.search, mode: 'insensitive' },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [rawData, total] = await this.prisma.$transaction([
      this.prisma.note.findMany({
        where,
        orderBy: [{ isPinned: 'desc' }, { [sortBy]: order }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          tags: true,
          ...(isSharedScope
            ? {
                owner: { select: { username: true, name: true } },
                collaborators: { where: { userId } },
              }
            : {}),
        },
      }),
      this.prisma.note.count({ where }),
    ]);

    const data = (
      isSharedScope
        ? rawData.map((n: Record<string, unknown>) =>
            this.toSharedListItem(
              n as Parameters<typeof this.toSharedListItem>[0],
              userId,
            ),
          )
        : rawData.map((n: Record<string, unknown>) => ({
            ...this.withTagNames(n),
            viewerRole: 'owner' as const,
          }))
    ) as NoteResponse[];

    this.logger.info(
      {
        userId,
        scope,
        page,
        limit,
        total,
        search: input.search ?? null,
        tags: tagNames ?? null,
      },
      'Notes list fetched',
    );

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findOne(userId: string, noteId: string): Promise<NoteResponse> {
    const note = await this.getNoteWithCollaborators(noteId);
    const role = this.resolveViewerRole(note, userId);
    if (!note || !role) {
      this.logger.warn({ userId, noteId }, 'Note access denied');
      throw new NotFoundException('Note not found');
    }
    const { collaborators, owner, ...rest } = note;
    const myCollab = collaborators.find((c) => c.userId === userId);
    const ownerName = owner ? owner.name || owner.username : undefined;
    return {
      ...this.withTagNames(rest),
      ...(role !== 'owner'
        ? {
            isPinned: myCollab?.isPinned ?? false,
            isFavorite: myCollab?.isFavorite ?? false,
            ownerName,
          }
        : {}),
      viewerRole: role,
    } as NoteResponse;
  }

  async update(
    userId: string,
    noteId: string,
    input: UpdateNoteInput,
  ): Promise<NoteResponse> {
    const note = await this.getNoteWithCollaborators(noteId);
    const role = this.resolveViewerRole(note, userId);
    if (!note || !role) {
      this.logger.warn(
        { userId, noteId },
        'Note update denied: read-only or no access',
      );
      throw new NotFoundException('Note not found');
    }

    // From here we are first checking the collaborator roles and taking action according to the role
    if (role === 'read') {
      const isContentEdit =
        input.title !== undefined ||
        input.content !== undefined ||
        input.tags !== undefined;
      if (isContentEdit) {
        this.logger.warn(
          { userId, noteId },
          'Note update denied: read-only collaborator tried to edit content',
        );
        throw new NotFoundException('Note not found');
      }

      if (input.isPinned !== undefined || input.isFavorite !== undefined) {
        await this.prisma.noteCollaborator.update({
          where: { noteId_userId: { noteId, userId } },
          data: {
            ...(input.isPinned !== undefined
              ? { isPinned: input.isPinned }
              : {}),
            ...(input.isFavorite !== undefined
              ? { isFavorite: input.isFavorite }
              : {}),
          },
        });
      }
      return this.findOne(userId, noteId);
    }

    if (role === 'write') {
      if (input.isPinned !== undefined || input.isFavorite !== undefined) {
        await this.prisma.noteCollaborator.update({
          where: { noteId_userId: { noteId, userId } },
          data: {
            ...(input.isPinned !== undefined
              ? { isPinned: input.isPinned }
              : {}),
            ...(input.isFavorite !== undefined
              ? { isFavorite: input.isFavorite }
              : {}),
          },
        });
      }
      return this.applyMeaningfulEdit(note, noteId, userId, input, role);
    }

    // If we get here that means the updater is the owner itself
    return this.applyMeaningfulEdit(note, noteId, userId, input, role);
  }

  // Here we are checking whether is there is even a need to save a snapshot or update of note by comparing the title, tags and deepequal check for the content tiptap json
  private async applyMeaningfulEdit(
    note: NoteWithCollaborators,
    noteId: string,
    userId: string,
    input: UpdateNoteInput,
    role: ViewerRole,
  ): Promise<NoteResponse> {
    const currentTags = note.tags
      .map((t) => (typeof t === 'string' ? t : t.name))
      .sort((a, b) => a.localeCompare(b));
    const newTags =
      input.tags !== undefined
        ? this.normalizeTagNames(input.tags).sort((a, b) => a.localeCompare(b))
        : currentTags;
    const tagsChanged =
      input.tags !== undefined && !equal(newTags, currentTags);
    const titleChanged =
      input.title !== undefined && input.title.trim() !== note.title;
    const contentChanged =
      input.content !== undefined &&
      !equal(
        this.ensureTiptapJson(input.content),
        this.ensureTiptapJson(note.content),
      );

    const isMeaningfulEdit = titleChanged || contentChanged || tagsChanged;

    if (isMeaningfulEdit) {
      await this.snapshotVersion(note, userId);
    }

    const updated = await this.prisma.note.update({
      where: { id: noteId },
      data: {
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.content !== undefined
          ? {
              content: this.ensureTiptapJson(
                input.content,
              ) as Prisma.InputJsonValue,
            }
          : {}),
        ...(role === 'owner' && input.isPinned !== undefined
          ? { isPinned: input.isPinned }
          : {}),
        ...(role === 'owner' && input.isFavorite !== undefined
          ? { isFavorite: input.isFavorite }
          : {}),
      },
    });

    if (input.tags !== undefined) {
      await this.syncTags(noteId, input.tags);
    }

    const tags =
      input.tags !== undefined
        ? this.normalizeTagNames(input.tags)
        : note.tags.map((t) => t.name);

    this.logger.info(
      { userId, noteId, role, versioned: isMeaningfulEdit },
      'Note updated',
    );

    const broadcastNote = { ...updated, tags };
    this.events.emit('note.updated', {
      note: broadcastNote,
      editedByUserId: userId,
    });

    if (isMeaningfulEdit) {
      const recipientUserIds = [
        note.ownerId,
        ...note.collaborators.map((c) => c.userId),
      ].filter((id) => id !== userId);

      if (recipientUserIds.length > 0) {
        this.events.emit('note.edited-by-collaborator', {
          noteId,
          noteTitle: updated.title,
          ownerId: note.ownerId,
          editorUserId: userId,
          recipientUserIds,
        });
      }
    }

    return this.findOne(userId, noteId);
  }

  async remove(ownerId: string, noteId: string): Promise<void> {
    const note = await this.prisma.note.findUnique({ where: { id: noteId } });
    this.assertOwner(note, ownerId, noteId);

    await this.prisma.note.delete({ where: { id: noteId } });
    this.logger.info({ userId: ownerId, noteId }, 'Note deleted');
    this.events.emit('note.deleted', { noteId, deletedByUserId: ownerId });
  }

  async inviteCollaborator(
    ownerId: string,
    noteId: string,
    input: InviteCollaboratorInput,
  ): Promise<CollaboratorResponse> {
    const note = await this.prisma.note.findUnique({ where: { id: noteId } });
    this.assertOwner(note, ownerId, noteId);

    const identifier = input.identifier.replace(/^@/, '').trim();

    const invitee = identifier.includes('@')
      ? await this.prisma.user.findUnique({
          where: { email: identifier.toLowerCase() },
        })
      : await this.prisma.user.findUnique({
          where: { username: identifier },
        });

    if (!invitee) {
      throw new NotFoundException(
        'No user found with that email address or username',
      );
    }
    if (invitee.id === ownerId) {
      throw new ConflictException('You already own this note');
    }

    const existing = await this.prisma.noteCollaborator.findUnique({
      where: { noteId_userId: { noteId, userId: invitee.id } },
    });
    if (existing) {
      throw new ConflictException(
        'This user is already a collaborator on this note',
      );
    }

    const collaborator = await this.prisma.noteCollaborator.create({
      data: {
        noteId,
        userId: invitee.id,
        permission: input.permission ?? CollaboratorPermission.READ,
      },
      include: { user: true },
    });

    this.logger.info(
      {
        userId: ownerId,
        noteId,
        invitedUserId: invitee.id,
        permission: collaborator.permission,
      },
      'Collaborator invited',
    );

    this.events.emit('collaborator.invited', {
      noteId,
      noteTitle: note.title,
      inviterId: ownerId,
      inviteeId: invitee.id,
      permission: collaborator.permission,
    });

    return this.toSafeCollaborator(collaborator) as CollaboratorResponse;
  }

  async listCollaborators(
    userId: string,
    noteId: string,
  ): Promise<CollaboratorResponse[]> {
    const note = await this.getNoteWithCollaborators(noteId);
    const role = this.resolveViewerRole(note, userId);
    if (!role) {
      throw new NotFoundException('Note not found');
    }

    const collaborators = await this.prisma.noteCollaborator.findMany({
      where: { noteId },
      include: { user: true },
      orderBy: { invitedAt: 'asc' },
    });

    return collaborators.map(
      (c) => this.toSafeCollaborator(c) as CollaboratorResponse,
    );
  }

  async updateCollaboratorPermission(
    ownerId: string,
    noteId: string,
    collaboratorUserId: string,
    input: UpdateCollaboratorInput,
  ): Promise<CollaboratorResponse> {
    const note = await this.prisma.note.findUnique({ where: { id: noteId } });
    this.assertOwner(note, ownerId, noteId);

    const existing = await this.prisma.noteCollaborator.findUnique({
      where: { noteId_userId: { noteId, userId: collaboratorUserId } },
    });
    if (!existing) {
      throw new NotFoundException(
        'This user is not a collaborator on this note',
      );
    }

    const updated = await this.prisma.noteCollaborator.update({
      where: { noteId_userId: { noteId, userId: collaboratorUserId } },
      data: { permission: input.permission },
      include: { user: true },
    });

    this.logger.info(
      {
        userId: ownerId,
        noteId,
        collaboratorUserId,
        permission: input.permission,
      },
      'Collaborator permission updated',
    );

    this.events.emit('collaborator.permission-changed', {
      noteId,
      noteTitle: note.title,
      collaboratorUserId,
      permission: input.permission,
      changedByUserId: ownerId,
    });

    return this.toSafeCollaborator(updated) as CollaboratorResponse;
  }

  async removeCollaborator(
    ownerId: string,
    noteId: string,
    collaboratorUserId: string,
  ): Promise<void> {
    const note = await this.prisma.note.findUnique({ where: { id: noteId } });
    this.assertOwner(note, ownerId, noteId);

    const existing = await this.prisma.noteCollaborator.findUnique({
      where: { noteId_userId: { noteId, userId: collaboratorUserId } },
    });
    if (!existing) {
      throw new NotFoundException(
        'This user is not a collaborator on this note',
      );
    }

    await this.prisma.noteCollaborator.delete({
      where: { noteId_userId: { noteId, userId: collaboratorUserId } },
    });
    this.logger.info(
      { userId: ownerId, noteId, collaboratorUserId },
      'Collaborator removed',
    );

    this.events.emit('collaborator.removed', {
      noteId,
      noteTitle: note.title,
      collaboratorUserId,
      removedByUserId: ownerId,
    });
  }

  async listVersions(
    userId: string,
    noteId: string,
  ): Promise<NoteVersionResponse[]> {
    const note = await this.getNoteWithCollaborators(noteId);
    const role = this.resolveViewerRole(note, userId);
    if (!role) {
      throw new NotFoundException('Note not found');
    }

    const versions = await this.prisma.noteVersion.findMany({
      where: { noteId },
      orderBy: { createdAt: 'desc' },
    });

    this.logger.info(
      { userId, noteId, count: versions.length },
      'Note version history fetched',
    );
    return versions as NoteVersionResponse[];
  }

  async getVersion(
    userId: string,
    noteId: string,
    versionId: string,
  ): Promise<NoteVersionResponse> {
    const note = await this.getNoteWithCollaborators(noteId);
    const role = this.resolveViewerRole(note, userId);
    if (!role) {
      throw new NotFoundException('Note not found');
    }

    const version = await this.prisma.noteVersion.findUnique({
      where: { id: versionId },
    });
    if (version?.noteId !== noteId) {
      throw new NotFoundException('Version not found');
    }
    return version as NoteVersionResponse;
  }

  async restoreVersion(
    userId: string,
    noteId: string,
    versionId: string,
  ): Promise<NoteResponse> {
    const note = await this.getNoteWithCollaborators(noteId);
    const role = this.resolveViewerRole(note, userId);
    if (!role || role === 'read') {
      this.logger.warn(
        { userId, noteId, versionId },
        'Version restore denied: read-only or no access',
      );
      throw new NotFoundException('Note not found');
    }

    const version = await this.prisma.noteVersion.findUnique({
      where: { id: versionId },
    });
    if (version?.noteId !== noteId) {
      throw new NotFoundException('Version not found');
    }

    const updated = await this.prisma.note.update({
      where: { id: noteId },
      data: {
        title: version.title,
        content: (version.content ?? undefined) as Prisma.InputJsonValue,
      },
    });
    await this.syncTags(noteId, version.tags);

    await this.prisma.noteVersion.deleteMany({
      where: {
        noteId,
        createdAt: { gte: version.createdAt },
      },
    });

    this.logger.info(
      { userId, noteId, versionId },
      'Note restored from version and newer history pruned',
    );

    const broadcastNote = { ...updated, tags: version.tags };
    this.events.emit('note.updated', {
      note: broadcastNote,
      editedByUserId: userId,
    });

    return { ...broadcastNote, viewerRole: role } as NoteResponse;
  }

  private async snapshotVersion(
    note: NoteWithCollaborators,
    editedById: string,
  ): Promise<void> {
    const latestVersion = await this.prisma.noteVersion.findFirst({
      where: { noteId: note.id },
      orderBy: { createdAt: 'desc' },
    });

    // Debounce rapid bursts of snapshots within 60 seconds by the same editor (bypassed in test environment)
    if (
      process.env.NODE_ENV !== 'test' &&
      latestVersion?.editedById === editedById &&
      Date.now() - new Date(latestVersion.createdAt).getTime() < 60_000
    ) {
      return;
    }

    const editor = await this.prisma.user.findUnique({
      where: { id: editedById },
    });
    const editedByName = editor
      ? editor.name || editor.username
      : 'Unknown user';

    await this.prisma.noteVersion.create({
      data: {
        noteId: note.id,
        title: note.title,
        content: (note.content ?? undefined) as Prisma.InputJsonValue,
        tags: note.tags.map((t) => (typeof t === 'string' ? t : t.name)),
        editedById,
        editedByName,
      },
    });

    const surplus = await this.prisma.noteVersion.findMany({
      where: { noteId: note.id },
      orderBy: { createdAt: 'desc' },
      skip: NotesService.MAX_VERSIONS_PER_NOTE,
      select: { id: true },
    });
    if (surplus.length > 0) {
      await this.prisma.noteVersion.deleteMany({
        where: { id: { in: surplus.map((v) => v.id) } },
      });
    }
  }

  async exportNotes(
    userId: string,
    input: ExportNotesInput,
  ): Promise<ExportResult> {
    const notes = await this.prisma.note.findMany({
      where: {
        ownerId: userId,
        ...(input.noteIds ? { id: { in: input.noteIds } } : {}),
      },
      include: { tags: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (notes.length === 0) {
      throw new NotFoundException('No matching notes found to export');
    }

    const shaped = notes.map((n) => ({
      title: n.title,
      content: n.content,
      tags: n.tags.map((t) => t.name),
    }));

    this.logger.info(
      { userId, count: shaped.length, format: input.format },
      'Notes exported',
    );

    return input.format === 'json'
      ? this.toJsonExport(shaped)
      : this.toMarkdownExport(notes);
  }

  async importNotes(
    userId: string,
    files: UploadedFileLike[],
  ): Promise<ImportResult> {
    let created = 0;
    const failed: ImportResult['failed'] = [];

    for (const file of files) {
      try {
        const text = file.buffer.toString('utf-8');
        if (file.originalname.toLowerCase().endsWith('.json')) {
          const count = await this.importJsonFile(userId, text);
          created += count;
        } else {
          const count = await this.importMarkdownFile(
            userId,
            file.originalname,
            text,
          );
          created += count;
        }
      } catch (err) {
        failed.push({
          filename: file.originalname,
          error:
            err instanceof Error ? err.message : 'Could not read this file',
        });
      }
    }

    this.logger.info(
      { userId, created, failedCount: failed.length },
      'Notes imported',
    );
    return { created, failed };
  }

  async bulkAction(
    userId: string,
    input: BulkActionInput,
  ): Promise<BulkActionResponse> {
    if (input.action === 'delete') {
      const owned = await this.prisma.note.findMany({
        where: { id: { in: input.noteIds }, ownerId: userId },
        select: { id: true },
      });
      const ids = owned.map((n) => n.id);

      if (ids.length === 0) {
        this.logger.info(
          { userId, action: input.action, affected: 0 },
          'Bulk action matched no owned notes',
        );
        return { affected: 0 };
      }

      await this.prisma.note.deleteMany({ where: { id: { in: ids } } });
      ids.forEach((id) =>
        this.events.emit('note.deleted', {
          noteId: id,
          deletedByUserId: userId,
        }),
      );
      this.logger.info(
        { userId, action: input.action, affected: ids.length },
        'Bulk action applied',
      );
      return { affected: ids.length };
    }

    const owned =
      (await this.prisma.note.findMany({
        where: { id: { in: input.noteIds }, ownerId: userId },
        select: { id: true },
      })) ?? [];
    const ownedIds = owned.map((n) => n.id);

    const collabs =
      (await this.prisma.noteCollaborator.findMany({
        where: { noteId: { in: input.noteIds }, userId },
        select: { noteId: true },
      })) ?? [];
    const collabIds = collabs.map((c) => c.noteId);

    if (ownedIds.length === 0 && collabIds.length === 0) {
      this.logger.info(
        { userId, action: input.action, affected: 0 },
        'Bulk action matched no notes',
      );
      return { affected: 0 };
    }

    const data =
      input.action === 'pin' || input.action === 'unpin'
        ? { isPinned: input.action === 'pin' }
        : { isFavorite: input.action === 'favorite' };

    let affected = 0;
    if (ownedIds.length > 0) {
      await this.prisma.note.updateMany({
        where: { id: { in: ownedIds } },
        data,
      });
      affected += ownedIds.length;
      const updatedNotes = await this.prisma.note.findMany({
        where: { id: { in: ownedIds } },
        include: { tags: true },
      });
      updatedNotes.forEach((n) =>
        this.events.emit('note.updated', {
          note: this.withTagNames(n),
          editedByUserId: userId,
        }),
      );
    }

    if (collabIds.length > 0) {
      await this.prisma.noteCollaborator.updateMany({
        where: { noteId: { in: collabIds }, userId },
        data,
      });
      affected += collabIds.length;
    }

    this.logger.info(
      { userId, action: input.action, affected },
      'Bulk action applied',
    );
    return { affected };
  }

  private async getNoteWithCollaborators(
    noteId: string,
  ): Promise<NoteWithCollaborators | null> {
    return this.prisma.note.findUnique({
      where: { id: noteId },
      include: {
        collaborators: true,
        tags: true,
        owner: { select: { username: true, name: true } },
      },
    });
  }

  private resolveViewerRole(
    note: NoteWithCollaborators | null,
    userId: string,
  ): ViewerRole | null {
    if (!note) return null;
    if (note.ownerId === userId) return 'owner';

    const collaborator = note.collaborators.find((c) => c.userId === userId);
    if (collaborator) {
      return collaborator.permission === 'WRITE' ? 'write' : 'read';
    }

    return null;
  }

  private assertOwner(
    note: { ownerId: string } | null,
    userId: string,
    noteId: string,
  ): asserts note is NonNullable<typeof note> {
    if (!note) {
      this.logger.warn({ userId, noteId }, 'Note not found');
      throw new NotFoundException('Note not found');
    }
    if (note.ownerId !== userId) {
      this.logger.warn({ userId, noteId }, 'Note action denied: not the owner');
      throw new NotFoundException('Note not found');
    }
  }

  private toSafeCollaborator(
    collaborator: Prisma.NoteCollaboratorGetPayload<{
      include: { user: true };
    }>,
  ): Record<string, unknown> {
    return {
      id: collaborator.id,
      noteId: collaborator.noteId,
      userId: collaborator.userId,
      permission: collaborator.permission,
      invitedAt: collaborator.invitedAt,
      user: collaborator.user
        ? this.prisma.sanitizeUser(collaborator.user)
        : undefined,
    };
  }

  private toSharedListItem(
    note: {
      collaborators: {
        userId?: string;
        permission: CollaboratorPermission;
        isPinned?: boolean;
        isFavorite?: boolean;
      }[];
      owner?: { username: string; name?: string | null };
      [key: string]: unknown;
    },
    userId?: string,
  ): Record<string, unknown> {
    const { collaborators, owner, ...rest } = note;
    const myCollab =
      (userId ? collaborators?.find((c) => c.userId === userId) : undefined) ??
      collaborators?.[0];
    const permission = myCollab?.permission ?? 'READ';
    const ownerName = owner ? owner.name || owner.username : undefined;
    return {
      ...this.withTagNames(rest),
      isPinned: myCollab?.isPinned ?? false,
      isFavorite: myCollab?.isFavorite ?? false,
      viewerRole:
        permission === 'WRITE' ? ('write' as const) : ('read' as const),
      ownerName,
    };
  }

  private normalizeTagNames(tags: string[]): string[] {
    return Array.from(
      new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean)),
    );
  }

  private async syncTags(noteId: string, tags: string[]): Promise<void> {
    const normalized = this.normalizeTagNames(tags);
    await Promise.all(
      normalized.map((name) =>
        this.prisma.tag.upsert({
          where: { name },
          update: {},
          create: { name },
        }),
      ),
    );
    await this.prisma.note.update({
      where: { id: noteId },
      data: {
        tags: {
          set: [],
          connectOrCreate: normalized.map((name) => ({
            where: { name },
            create: { name },
          })),
        },
      },
    });
  }

  private withTagNames(note: Record<string, unknown>): Record<string, unknown> {
    const { tags, ...rest } = note;
    const tagList = Array.isArray(tags)
      ? tags.map((t: unknown) =>
          typeof t === 'string'
            ? t
            : ((t as { name?: string })?.name ?? String(t)),
        )
      : [];
    return { ...rest, tags: tagList };
  }

  private markdownToTiptapJson(markdown: string): Prisma.InputJsonValue {
    if (!markdown?.trim()) {
      return { type: 'doc', content: [] };
    }
    try {
      const editor = new Editor({
        extensions: [
          StarterKit as unknown as AnyExtension,
          Markdown as unknown as AnyExtension,
        ],
        content: markdown,
        contentType: 'markdown',
      });
      const json = editor.getJSON();
      editor.destroy();
      return json as Prisma.InputJsonValue;
    } catch {
      return {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: markdown }],
          },
        ],
      };
    }
  }

  private tiptapJsonToMarkdown(json: unknown): string {
    if (!json) return '';
    if (typeof json === 'string') {
      return json;
    }
    if (typeof json === 'object') {
      try {
        const editor = new Editor({
          extensions: [
            StarterKit as unknown as AnyExtension,
            Markdown as unknown as AnyExtension,
          ],
          content: json as Record<string, unknown>,
        });
        const md = editor.getMarkdown();
        editor.destroy();
        return md;
      } catch {
        return '';
      }
    }
    return '';
  }

  private ensureTiptapJson(content: unknown): Prisma.InputJsonValue {
    if (!content) {
      return { type: 'doc', content: [] };
    }
    if (typeof content === 'object' && content !== null) {
      const parsed = TiptapDocSchema.safeParse(content);
      if (parsed.success) return parsed.data as Prisma.InputJsonValue;
      return { type: 'doc', content: [] };
    }
    if (typeof content === 'string') {
      const trimmed = content.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          const validated = TiptapDocSchema.safeParse(parsed);
          if (validated.success) {
            return validated.data as Prisma.InputJsonValue;
          }
        } catch {
          // Non-JSON string, convert as markdown
        }
      }
      return this.markdownToTiptapJson(trimmed);
    }
    return { type: 'doc', content: [] };
  }

  private toJsonExport(notes: unknown[]): ExportResult {
    return {
      filename: `notes-export-${Date.now()}.json`,
      contentType: 'application/json',
      content: JSON.stringify(notes, null, 2),
    };
  }

  private toMarkdownExport(
    notes: {
      title: string;
      content: unknown;
      tags: (string | { name: string })[];
      updatedAt: Date;
    }[],
  ): ExportResult {
    const sections = notes.map((n) => {
      const tagNames = (n.tags || []).map((t) =>
        typeof t === 'string' ? t : (t as { name: string }).name,
      );
      const markdownBody = this.tiptapJsonToMarkdown(n.content);
      const header = `# ${n.title}`;
      const tagLine =
        tagNames.length > 0 ? `\n\nTags: ${tagNames.join(', ')}` : '';
      return `${header}${tagLine}\n\n${markdownBody}`.trim();
    });

    return {
      filename: `notes-export-${Date.now()}.md`,
      contentType: 'text/markdown',
      content: sections.join('\n\n---\n\n'),
    };
  }

  private async importJsonFile(userId: string, text: string): Promise<number> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new BadRequestException('Invalid JSON file format');
    }

    const items: unknown[] = Array.isArray(parsed)
      ? parsed
      : parsed &&
          typeof parsed === 'object' &&
          Array.isArray((parsed as Record<string, unknown>).notes)
        ? ((parsed as Record<string, unknown>).notes as unknown[])
        : [parsed];

    let created = 0;
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const raw = item as Record<string, unknown>;

      const title =
        typeof raw.title === 'string' && raw.title.trim()
          ? raw.title.trim()
          : 'Imported Note';

      const content = this.ensureTiptapJson(raw.content ?? raw);
      const tags = Array.isArray(raw.tags)
        ? raw.tags.map(String).filter(Boolean)
        : undefined;

      await this.create(userId, {
        title: title.slice(0, 200),
        content: content as CreateNoteInput['content'],
        tags,
      });
      created += 1;
    }

    return created;
  }

  private async importMarkdownFile(
    userId: string,
    filename: string,
    content: string,
  ): Promise<number> {
    const lines = content.split('\n');
    let title = '';
    let tags: string[] | undefined;
    let bodyStartIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed) continue;
      const headingMatch = trimmed.match(/^#\s+(.+)/);
      if (headingMatch) {
        title = headingMatch[1].trim();
        bodyStartIndex = i + 1;
        break;
      }
      break;
    }

    for (let i = bodyStartIndex; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed) continue;
      const tagsMatch = new RegExp(/^Tags:\s*(.+)/i).exec(trimmed);
      if (tagsMatch) {
        tags = tagsMatch[1]
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
        bodyStartIndex = i + 1;
      }
      break;
    }

    if (!title) {
      title = filename.replace(/\.[^/.]+$/, '').trim() || 'Imported Note';
    }

    const body = lines.slice(bodyStartIndex).join('\n').trim();
    const contentJson = this.markdownToTiptapJson(body);

    await this.create(userId, {
      title: title.slice(0, 200),
      content: contentJson as CreateNoteInput['content'],
      tags,
    });

    return 1;
  }
}
