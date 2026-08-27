import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateNoteInput,
  NoteResponse,
  QueryNotesInput,
  UpdateNoteInput,
} from './notes.types.js';

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Prisma query result type for a note loaded with its tag relations.
type CompleteNote = Prisma.NoteGetPayload<{
  include: { tags: true };
}>;

/**
 * This service handles our core business logic of notes handling and filtering.
 */
@Injectable()
export class NotesService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(NotesService.name) private readonly logger: PinoLogger,
  ) {}

  async create(ownerId: string, input: CreateNoteInput): Promise<NoteResponse> {
    if (!input.title?.trim()) {
      throw new UnprocessableEntityException('Title is required');
    }
    const note = await this.prisma.note.create({
      data: {
        title: input.title.trim(),
        content: input.content,
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
    };
  }

  async findAll(
    userId: string,
    query: Partial<QueryNotesInput>,
  ): Promise<PaginatedResult<NoteResponse>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const sortBy = query.sortBy ?? 'updatedAt';
    const order = query.order ?? 'desc';

    // Here we are converting all provided tags from comma separated string to separated array
    const tagNames = query.tags
      ? Array.from<string>(
          new Set(
            query.tags
              .split(',')
              .map((t: string) => t.trim().toLowerCase())
              .filter(Boolean),
          ),
        )
      : undefined;

    const where: Prisma.NoteWhereInput = {
      ownerId: userId,
      ...(query.pinnedOnly ? { isPinned: true } : {}),
      ...(query.favoritesOnly ? { isFavorite: true } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(tagNames && tagNames.length > 0
        ? { tags: { some: { name: { in: tagNames } } } }
        : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { content: { contains: query.search, mode: 'insensitive' } },
              {
                tags: {
                  some: {
                    name: { contains: query.search, mode: 'insensitive' },
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
        },
      }),
      this.prisma.note.count({ where }),
    ]);

    const data = rawData.map((n: Record<string, unknown>) => ({
      ...this.withTagNames(n),
    })) as NoteResponse[];

    this.logger.info(
      {
        userId,
        page,
        limit,
        total,
        search: query.search ?? null,
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
    const note = await this.getCompleteNote(noteId);
    this.assertOwner(note, userId, noteId);
    return { ...this.withTagNames(note) } as NoteResponse;
  }

  async update(
    userId: string,
    noteId: string,
    input: UpdateNoteInput,
  ): Promise<NoteResponse> {
    const note = await this.getCompleteNote(noteId);
    this.assertOwner(note, userId, noteId);

    const isMeaningfulEdit =
      input.title !== undefined ||
      input.content !== undefined ||
      input.tags !== undefined;

    const updated = await this.prisma.note.update({
      where: { id: noteId },
      data: {
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.content !== undefined ? { content: input.content } : {}),
        ...(input.isPinned !== undefined ? { isPinned: input.isPinned } : {}),
        ...(input.isFavorite !== undefined
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
        : note!.tags.map((t) => t.name);

    this.logger.info(
      { userId, noteId, versioned: isMeaningfulEdit },
      'Note updated',
    );

    return { ...updated, tags };
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
