import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
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
  CreateNoteInput,
  NoteResponse,
  PaginatedResult,
  QueryNotesInput,
  UpdateNoteInput,
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
    @InjectPinoLogger(NotesService.name) private readonly logger: PinoLogger,
  ) {}

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
      // Here we are making BARE mantine editor just for markdown conversion
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
      if ('type' in content) return content as Prisma.InputJsonValue;
      return { type: 'doc', content: [] };
    }
    // If the TipTap json is in Stringified form then we do json parsing here to get TipTap Json
    if (typeof content === 'string') {
      const trimmed = content.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && typeof parsed === 'object' && 'type' in parsed) {
            return parsed as Prisma.InputJsonValue;
          }
        } catch {
          // If eventually the content is not in json then we have markdown in our hand so we will go for markdown parsing instead of throwing an error
        }
      }
      return this.markdownToTiptapJson(trimmed);
    }
    return { type: 'doc', content: [] };
  }

  private async snapshotVersion(
    note: NoteWithCollaborators,
    editedById: string,
  ): Promise<void> {
    const latestVersion = await this.prisma.noteVersion.findFirst({
      where: { noteId: note.id },
      orderBy: { createdAt: 'desc' },
    });

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

  // This provides the list of shared notes to be displayed in a separate section in frontend
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
    const myCollab =
      (userId
        ? note.collaborators?.find((c) => c.userId === userId)
        : undefined) ?? note.collaborators?.[0];
    const permission = myCollab?.permission ?? 'READ';
    const ownerName = note.owner
      ? note.owner.name || note.owner.username
      : undefined;
    const rest = { ...note };
    delete (rest as Record<string, unknown>).collaborators;
    delete (rest as Record<string, unknown>).owner;
    return {
      ...this.withTagNames(rest),
      isPinned: myCollab?.isPinned ?? false,
      isFavorite: myCollab?.isFavorite ?? false,
      viewerRole:
        permission === 'WRITE' ? ('write' as const) : ('read' as const),
      ownerName,
    };
  }

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
    const rest = { ...note };
    const myCollab = note.collaborators.find((c) => c.userId === userId);
    delete (rest as Record<string, unknown>).collaborators;
    const ownerName = note.owner
      ? note.owner.name || note.owner.username
      : undefined;
    delete (rest as Record<string, unknown>).owner;
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
      { userId, noteId, role, updated, tags, versioned: isMeaningfulEdit },
      'Note updated',
    );

    return this.findOne(userId, noteId);
  }

  async remove(ownerId: string, noteId: string): Promise<void> {
    const note = await this.prisma.note.findUnique({ where: { id: noteId } });
    this.assertOwner(note, ownerId, noteId);

    await this.prisma.note.delete({ where: { id: noteId } });
    this.logger.info({ userId: ownerId, noteId }, 'Note deleted');
  }

  private async getCompleteNote(noteId: string): Promise<CompleteNote | null> {
    return this.prisma.note.findUnique({
      where: { id: noteId },
      include: { tags: true },
    });
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

  private normalizeTagNames(tags: string[]): string[] {
    return Array.from(
      new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean)),
    );
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
          // if the content is not a json then we are going for a fallback to normal text
        }
      }
      return {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: trimmed }],
          },
        ],
      };
    }
    return { type: 'doc', content: [] };
  }

  // This keeps synchronization between the main tags table and the respective tags of a note without any repetition
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

  // This converts the nested tag objects to frontend readable array
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
}
