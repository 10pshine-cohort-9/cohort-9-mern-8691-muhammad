import { expect } from 'chai';
import * as sinon from 'sinon';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { NotesService } from './notes.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { PinoLogger } from 'nestjs-pino';
import type { InviteCollaboratorInput } from './notes.types.js';

describe('NotesService', () => {
  type PrismaModelMock = Record<string, sinon.SinonStub>;

  type PrismaMock = {
    note: PrismaModelMock;
    user: PrismaModelMock;
    noteCollaborator: PrismaModelMock;
    tag: PrismaModelMock;
    noteTag: PrismaModelMock;
    noteVersion: PrismaModelMock;
    $transaction: sinon.SinonStub;
    sanitizeUser: (user: Record<string, unknown>) => Record<string, unknown>;
  };

  type LoggerMock = {
    info: sinon.SinonStub;
    warn: sinon.SinonStub;
    error: sinon.SinonStub;
    setContext: sinon.SinonStub;
  };

  type EventsMock = {
    emit: sinon.SinonStub;
  };

  let notesService: NotesService;
  let prismaMock: PrismaMock;
  let loggerMock: LoggerMock;
  let eventsMock: EventsMock;
  let sandbox: sinon.SinonSandbox;

  const ownerId = 'user-1';
  const writeCollaboratorId = 'user-2';
  const readCollaboratorId = 'user-3';
  const strangerId = 'user-4';

  const baseNote = {
    id: 'note-1',
    title: 'My first note',
    content: {
      type: 'doc' as const,
      content: [] as Record<string, unknown>[],
    },
    isPinned: false,
    isFavorite: false,
    ownerId,
    tags: [] as { tag: { name: string } }[],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  interface ShapedResult {
    id?: string;
    title?: string;
    content?: Record<string, unknown>;
    tags?: string[];
    viewerRole?: string;
    ownerName?: string;
    isFavorite?: boolean;
    isPinned?: boolean;
    permission?: string;
    user?: Record<string, unknown>;
    owner?: unknown;
    collaborators?: unknown;
  }

  const withCollaborators = (
    note: Record<string, unknown>,
    collaborators: unknown[] = [],
  ) => ({
    ...note,
    collaborators,
  });
  const tagRelations = (names: string[]) => names.map((name) => ({ name }));

  const writeCollaborator = {
    id: 'collab-1',
    noteId: 'note-1',
    userId: writeCollaboratorId,
    permission: 'WRITE',
  };
  const readCollaborator = {
    id: 'collab-2',
    noteId: 'note-1',
    userId: readCollaboratorId,
    permission: 'READ',
  };

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    prismaMock = {
      note: {
        create: sandbox.stub(),
        findMany: sandbox.stub(),
        count: sandbox.stub(),
        findUnique: sandbox.stub(),
        update: sandbox.stub(),
        updateMany: sandbox.stub(),
        delete: sandbox.stub(),
        deleteMany: sandbox.stub(),
      },
      user: {
        findUnique: sandbox.stub(),
        findFirst: sandbox.stub(),
      },
      noteCollaborator: {
        findUnique: sandbox.stub(),
        create: sandbox.stub(),
        findMany: sandbox.stub().resolves([]),
        update: sandbox.stub().resolves({}),
        updateMany: sandbox.stub().resolves({ count: 0 }),
        delete: sandbox.stub(),
      },
      tag: {
        upsert: sandbox.stub().resolves({}),
        findMany: sandbox.stub().resolves([]),
      },
      noteTag: {
        deleteMany: sandbox.stub().resolves({ count: 0 }),
        createMany: sandbox.stub().resolves({ count: 0 }),
      },
      noteVersion: {
        create: sandbox.stub().resolves({}),
        findMany: sandbox.stub().resolves([]),
        findUnique: sandbox.stub(),
        findFirst: sandbox.stub().resolves(null),
        deleteMany: sandbox.stub().resolves({ count: 0 }),
      },
      $transaction: sandbox
        .stub()
        .callsFake(async (arg) =>
          Array.isArray(arg) ? Promise.all(arg) : arg(prismaMock),
        ),
      sanitizeUser: (u: Record<string, unknown>) => {
        const copy = { ...u };
        delete copy.passwordHash;
        return copy;
      },
    };
    loggerMock = {
      info: sandbox.stub(),
      warn: sandbox.stub(),
      error: sandbox.stub(),
      setContext: sandbox.stub(),
    };
    eventsMock = { emit: sandbox.stub() };
    notesService = new NotesService(
      prismaMock as unknown as PrismaService,
      eventsMock as unknown as EventEmitter2,
      loggerMock as unknown as PinoLogger,
    );
  });

  afterEach(() => sandbox.restore());

  describe('create', () => {
    it('creates a private, untagged note owned by the current user by default', async () => {
      prismaMock.note.create.resolves(baseNote);
      const result = await notesService.create(ownerId, {
        title: 'My first note',
        content: { type: 'doc', content: [] },
      });
      const callArgs = prismaMock.note.create.firstCall.args[0];
      expect(callArgs.data.ownerId).to.equal(ownerId);
      expect(result).to.deep.equal(baseNote);
      expect(prismaMock.tag.upsert.called).to.be.false;
    });

    it('normalizes and syncs tags when provided', async () => {
      prismaMock.note.create.resolves(baseNote);
      const result = await notesService.create(ownerId, {
        title: 'Tagged note',
        content: { type: 'doc', content: [] },
        tags: ['  Work  ', 'URGENT', 'work'],
      });

      expect(prismaMock.tag.upsert.callCount).to.equal(2);
      expect(prismaMock.note.update.called).to.be.true;
      expect((result as ShapedResult).tags).to.have.members(['work', 'urgent']);
    });
  });

  describe('findAll', () => {
    it('scopes to owned notes by default and tags each with viewerRole "owner"', async () => {
      prismaMock.$transaction.resolves([[baseNote], 1]);
      const result = await notesService.findAll(ownerId, {});
      expect(result.data).to.deep.equal([{ ...baseNote, viewerRole: 'owner' }]);
      expect(result.meta.total).to.equal(1);
    });

    it('flattens the tags relation into a plain string array', async () => {
      const tagged = { ...baseNote, tags: tagRelations(['work', 'urgent']) };
      prismaMock.$transaction.resolves([[tagged], 1]);
      const result = await notesService.findAll(ownerId, {});
      expect((result.data[0] as ShapedResult).tags).to.deep.equal([
        'work',
        'urgent',
      ]);
    });

    it('supports the "shared" scope, attaching the viewer\'s own permission and the owner\'s name', async () => {
      const rawSharedNote = {
        ...baseNote,
        owner: { username: 'NoraOwner' },
        collaborators: [{ permission: 'WRITE' }],
      };
      prismaMock.$transaction.resolves([[rawSharedNote], 1]);

      const result = await notesService.findAll(writeCollaboratorId, {
        scope: 'shared',
      });

      expect((result.data[0] as ShapedResult).viewerRole).to.equal('write');
      expect((result.data[0] as ShapedResult).ownerName).to.equal('NoraOwner');
      expect((result.data[0] as ShapedResult).owner).to.be.undefined;
      expect((result.data[0] as ShapedResult).collaborators).to.be.undefined;
    });

    it('defaults a shared note to viewerRole "read" when the collaborator has READ permission', async () => {
      const rawSharedNote = {
        ...baseNote,
        owner: { username: 'NoraOwner' },
        collaborators: [{ permission: 'READ' }],
      };
      prismaMock.$transaction.resolves([[rawSharedNote], 1]);

      const result = await notesService.findAll(readCollaboratorId, {
        scope: 'shared',
      });
      expect((result.data[0] as ShapedResult).viewerRole).to.equal('read');
    });

    it('builds a date-range filter from dateFrom/dateTo', async () => {
      prismaMock.$transaction.resolves([[], 0]);
      await notesService.findAll(ownerId, {
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      });

      const findManyCall = prismaMock.note.findMany.firstCall.args[0];
      expect(findManyCall.where.createdAt.gte).to.deep.equal(
        new Date('2026-01-01'),
      );
      expect(findManyCall.where.createdAt.lte).to.deep.equal(
        new Date('2026-01-31'),
      );
    });

    it('filters by collaboration status (hasCollaborators)', async () => {
      prismaMock.$transaction.resolves([[], 0]);
      await notesService.findAll(ownerId, { hasCollaborators: true });
      expect(
        prismaMock.note.findMany.firstCall.args[0].where.collaborators,
      ).to.deep.equal({
        some: {},
      });

      await notesService.findAll(ownerId, { hasCollaborators: false });
      expect(
        prismaMock.note.findMany.secondCall.args[0].where.collaborators,
      ).to.deep.equal({
        none: {},
      });
    });

    it('filters to favorites only when favoritesOnly is set', async () => {
      prismaMock.$transaction.resolves([[], 0]);
      await notesService.findAll(ownerId, { favoritesOnly: true });
      expect(
        prismaMock.note.findMany.firstCall.args[0].where.isFavorite,
      ).to.equal(true);

      await notesService.findAll(ownerId, {});
      expect(prismaMock.note.findMany.secondCall.args[0].where.isFavorite).to.be
        .undefined;
    });

    it('filters by a comma-separated tag list, deduped and case-insensitive', async () => {
      prismaMock.$transaction.resolves([[], 0]);
      await notesService.findAll(ownerId, {
        tags: 'Work, urgent ,work',
      });
      const where = prismaMock.note.findMany.firstCall.args[0].where;
      expect(where.tags.some.name.in).to.have.members(['work', 'urgent']);
    });

    it('includes tag names in the search OR clause', async () => {
      prismaMock.$transaction.resolves([[], 0]);
      await notesService.findAll(ownerId, { search: 'roadmap' });
      const where = prismaMock.note.findMany.firstCall.args[0].where;
      const tagClause = where.OR.find(
        (clause: { tags?: unknown }) => clause.tags,
      );
      expect(tagClause.tags.some.name.contains).to.equal('roadmap');
    });
  });

  describe('findOne (access control)', () => {
    it('returns the note with viewerRole "owner" and flattened tags for the owner', async () => {
      prismaMock.note.findUnique.resolves(
        withCollaborators({ ...baseNote, tags: tagRelations(['work']) }),
      );
      const result = await notesService.findOne(ownerId, 'note-1');
      expect((result as ShapedResult).viewerRole).to.equal('owner');
      expect((result as ShapedResult).tags).to.deep.equal(['work']);
    });

    it('returns viewerRole "write" for a WRITE collaborator', async () => {
      prismaMock.note.findUnique.resolves(
        withCollaborators(baseNote, [writeCollaborator]),
      );
      const result = await notesService.findOne(writeCollaboratorId, 'note-1');
      expect((result as ShapedResult).viewerRole).to.equal('write');
    });

    it('returns viewerRole "read" for a READ collaborator', async () => {
      prismaMock.note.findUnique.resolves(
        withCollaborators(baseNote, [readCollaborator]),
      );
      const result = await notesService.findOne(readCollaboratorId, 'note-1');
      expect((result as ShapedResult).viewerRole).to.equal('read');
    });

    it('throws NotFoundException for a stranger viewing a note', async () => {
      prismaMock.note.findUnique.resolves(withCollaborators(baseNote));
      try {
        await notesService.findOne(strangerId, 'note-1');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundException);
      }
    });

    it('throws NotFoundException when the note does not exist', async () => {
      prismaMock.note.findUnique.resolves(null);
      try {
        await notesService.findOne(ownerId, 'missing-note');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundException);
      }
    });
  });

  describe('update (permission enforcement)', () => {
    it('allows the owner to update and emits note.updated but not note.edited-by-collaborator', async () => {
      const updatedNote = {
        ...baseNote,
        title: 'Updated',
        collaborators: [],
        tags: [],
        owner: { username: 'owner', name: null },
      };
      prismaMock.note.findUnique
        .onFirstCall()
        .resolves(withCollaborators(baseNote))
        .onSecondCall()
        .resolves(updatedNote);
      prismaMock.note.update.resolves({ ...baseNote, title: 'Updated' });
      const result = await notesService.update(ownerId, 'note-1', {
        title: 'Updated',
      });
      expect((result as ShapedResult).title).to.equal('Updated');
      expect((result as ShapedResult).viewerRole).to.equal('owner');
      expect(eventsMock.emit.calledWith('note.updated')).to.be.true;
      expect(eventsMock.emit.calledWith('note.edited-by-collaborator')).to.be
        .false;
    });

    it('syncs tags when provided and preserves existing tags when omitted', async () => {
      const updatedNote = {
        ...baseNote,
        title: 'Updated',
        collaborators: [],
        tags: tagRelations(['new']),
        owner: { username: 'owner', name: null },
      };
      prismaMock.note.findUnique
        .onFirstCall()
        .resolves(
          withCollaborators({ ...baseNote, tags: tagRelations(['old']) }),
        )
        .onSecondCall()
        .resolves(updatedNote);
      prismaMock.note.update.resolves({ ...baseNote, title: 'Updated' });

      const withNewTags = await notesService.update(ownerId, 'note-1', {
        title: 'Updated',
        tags: ['new'],
      });
      expect(prismaMock.note.update.called).to.be.true;
      expect((withNewTags as ShapedResult).tags).to.deep.equal(['new']);
    });

    it("keeps the note's existing tags when the update omits the tags field entirely", async () => {
      prismaMock.note.findUnique.resolves(
        withCollaborators({ ...baseNote, tags: tagRelations(['old']) }),
      );
      prismaMock.note.update.resolves({ ...baseNote, title: 'Updated' });

      const result = await notesService.update(ownerId, 'note-1', {
        title: 'Updated',
      });
      expect(prismaMock.noteTag.deleteMany.called).to.be.false;
      expect((result as ShapedResult).tags).to.deep.equal(['old']);
    });

    it('allows a WRITE collaborator to update and notifies the owner via note.edited-by-collaborator', async () => {
      prismaMock.note.findUnique.resolves(
        withCollaborators(baseNote, [writeCollaborator, readCollaborator]),
      );
      prismaMock.note.update.resolves({
        ...baseNote,
        title: 'Updated by collaborator',
      });
      const result = await notesService.update(writeCollaboratorId, 'note-1', {
        title: 'Updated by collaborator',
      });
      expect((result as ShapedResult).viewerRole).to.equal('write');
      expect(prismaMock.note.update.calledOnce).to.be.true;

      const editedCall = eventsMock.emit
        .getCalls()
        .find(
          (c: { args: unknown[] }) =>
            c.args[0] === 'note.edited-by-collaborator',
        );
      expect(editedCall).to.not.be.undefined;
      expect(editedCall!.args[1].recipientUserIds).to.have.members([
        ownerId,
        readCollaboratorId,
      ]);
      expect(editedCall!.args[1].recipientUserIds).to.not.include(
        writeCollaboratorId,
      );
    });

    it('rejects a READ collaborator trying to update', async () => {
      prismaMock.note.findUnique.resolves(
        withCollaborators(baseNote, [readCollaborator]),
      );
      try {
        await notesService.update(readCollaboratorId, 'note-1', {
          title: 'Hacked',
        });
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundException);
        expect(prismaMock.note.update.called).to.be.false;
      }
    });

    it('accepts an isFavorite toggle', async () => {
      const updatedNote = {
        ...baseNote,
        isFavorite: true,
        collaborators: [],
        tags: [],
        owner: { username: 'owner', name: null },
      };
      prismaMock.note.findUnique
        .onFirstCall()
        .resolves(withCollaborators(baseNote))
        .onSecondCall()
        .resolves(updatedNote);
      prismaMock.note.update.resolves({ ...baseNote, isFavorite: true });
      const result = await notesService.update(ownerId, 'note-1', {
        isFavorite: true,
      });
      expect((result as ShapedResult).isFavorite).to.equal(true);
      const callArgs = prismaMock.note.update.firstCall.args[0];
      expect(callArgs.data.isFavorite).to.equal(true);
    });

    it('allows a READ collaborator to toggle personal pin/favorite without editing content', async () => {
      prismaMock.note.findUnique
        .onFirstCall()
        .resolves(withCollaborators(baseNote, [readCollaborator]));
      prismaMock.note.findUnique
        .onSecondCall()
        .resolves(
          withCollaborators(baseNote, [
            { ...readCollaborator, isPinned: true, isFavorite: true },
          ]),
        );
      prismaMock.noteCollaborator.update.resolves({
        ...readCollaborator,
        isPinned: true,
        isFavorite: true,
      });

      const result = await notesService.update(readCollaboratorId, 'note-1', {
        isPinned: true,
        isFavorite: true,
      });

      expect(prismaMock.noteCollaborator.update.calledOnce).to.be.true;
      expect(prismaMock.note.update.called).to.be.false;
      expect((result as ShapedResult).isPinned).to.be.true;
      expect((result as ShapedResult).isFavorite).to.be.true;
    });

    it('snapshots a version before a meaningful edit (title/content/tags)', async () => {
      prismaMock.user.findUnique.resolves({
        id: ownerId,
        username: 'janedoe',
      });
      prismaMock.note.findUnique.resolves(
        withCollaborators({ ...baseNote, tags: tagRelations(['old']) }),
      );
      prismaMock.note.update.resolves({ ...baseNote, title: 'Updated' });

      await notesService.update(ownerId, 'note-1', { title: 'Updated' });

      expect(prismaMock.noteVersion.create.calledOnce).to.be.true;
      const versionArgs = prismaMock.noteVersion.create.firstCall.args[0].data;
      expect(versionArgs.noteId).to.equal('note-1');
      expect(versionArgs.title).to.equal('My first note'); // the PRE-edit title
      expect(versionArgs.editedById).to.equal(ownerId);
      expect(versionArgs.editedByName).to.equal('janedoe');
      expect(versionArgs.tags).to.deep.equal(['old']);
    });

    it('does NOT snapshot a version for a pin/favorite-only toggle', async () => {
      prismaMock.note.findUnique.resolves(withCollaborators(baseNote));
      prismaMock.note.update.resolves({ ...baseNote, isPinned: true });

      await notesService.update(ownerId, 'note-1', { isPinned: true });

      expect(prismaMock.noteVersion.create.called).to.be.false;
    });

    it('does NOT snapshot a version when title/content/tags are identical', async () => {
      prismaMock.note.findUnique.resolves(withCollaborators(baseNote));
      prismaMock.note.update.resolves(baseNote);

      await notesService.update(ownerId, 'note-1', {
        title: baseNote.title,
        content: baseNote.content,
      });

      expect(prismaMock.noteVersion.create.called).to.be.false;
    });

    it('falls back to "Unknown user" in the snapshot if the editor lookup fails', async () => {
      prismaMock.user.findUnique.resolves(null);
      prismaMock.note.findUnique.resolves(withCollaborators(baseNote));
      prismaMock.note.update.resolves({ ...baseNote, title: 'Updated' });

      await notesService.update(ownerId, 'note-1', { title: 'Updated' });

      expect(
        prismaMock.noteVersion.create.firstCall.args[0].data.editedByName,
      ).to.equal('Unknown user');
    });

    it('prunes versions beyond the retention cap after snapshotting', async () => {
      prismaMock.user.findUnique.resolves({
        id: ownerId,
        username: 'janedoe',
      });
      prismaMock.note.findUnique.resolves(withCollaborators(baseNote));
      prismaMock.note.update.resolves({ ...baseNote, title: 'Updated' });
      prismaMock.noteVersion.findMany.resolves([
        { id: 'old-version-1' },
        { id: 'old-version-2' },
      ]);

      await notesService.update(ownerId, 'note-1', { title: 'Updated' });

      expect(
        prismaMock.noteVersion.deleteMany.calledOnceWith({
          where: { id: { in: ['old-version-1', 'old-version-2'] } },
        }),
      ).to.be.true;
    });
  });

  describe('remove (owner only)', () => {
    it('deletes the note when the current user owns it and emits note.deleted', async () => {
      prismaMock.note.findUnique.resolves(baseNote);
      prismaMock.note.delete.resolves(baseNote);
      await notesService.remove(ownerId, 'note-1');
      expect(prismaMock.note.delete.calledOnceWith({ where: { id: 'note-1' } }))
        .to.be.true;
      expect(
        eventsMock.emit.calledWith('note.deleted', {
          noteId: 'note-1',
          deletedByUserId: ownerId,
        }),
      ).to.be.true;
    });

    it('rejects a WRITE collaborator trying to delete', async () => {
      prismaMock.note.findUnique.resolves(baseNote);
      try {
        await notesService.remove(writeCollaboratorId, 'note-1');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundException);
        expect(prismaMock.note.delete.called).to.be.false;
      }
    });
  });

  describe('inviteCollaborator', () => {
    it('invites an existing user by email with the requested permission', async () => {
      prismaMock.note.findUnique.resolves(baseNote);
      prismaMock.user.findUnique.resolves({
        id: writeCollaboratorId,
        email: 'collab@example.com',
        passwordHash: 'x',
        username: 'collab_user',
      });
      prismaMock.noteCollaborator.findUnique.resolves(null);
      prismaMock.noteCollaborator.create.resolves({
        id: 'collab-1',
        noteId: 'note-1',
        userId: writeCollaboratorId,
        permission: 'WRITE',
        invitedAt: new Date(),
        user: {
          id: writeCollaboratorId,
          email: 'collab@example.com',
          passwordHash: 'x',
          username: 'collab_user',
        },
      });

      const result = await notesService.inviteCollaborator(ownerId, 'note-1', {
        identifier: 'collab@example.com',
        permission: 'WRITE',
      });

      expect((result as ShapedResult).permission).to.equal('WRITE');
      expect((result as ShapedResult).user).to.not.have.property(
        'passwordHash',
      );
      expect(
        eventsMock.emit.calledWith('collaborator.invited', {
          noteId: 'note-1',
          noteTitle: baseNote.title,
          inviterId: ownerId,
          inviteeId: writeCollaboratorId,
          permission: 'WRITE',
        }),
      ).to.be.true;
    });

    it('defaults to READ permission when none is specified', async () => {
      prismaMock.note.findUnique.resolves(baseNote);
      prismaMock.user.findUnique.resolves({
        id: writeCollaboratorId,
        email: 'collab@example.com',
        passwordHash: 'x',
        username: 'collab_user',
      });
      prismaMock.noteCollaborator.findUnique.resolves(null);
      prismaMock.noteCollaborator.create.resolves({
        id: 'collab-1',
        noteId: 'note-1',
        userId: writeCollaboratorId,
        permission: 'READ',
        invitedAt: new Date(),
        user: {
          id: writeCollaboratorId,
          email: 'collab@example.com',
          passwordHash: 'x',
          username: 'collab_user',
        },
      });

      await notesService.inviteCollaborator(ownerId, 'note-1', {
        identifier: 'collab@example.com',
      } as InviteCollaboratorInput);
      const callArgs = prismaMock.noteCollaborator.create.firstCall.args[0];
      expect(callArgs.data.permission).to.equal('READ');
    });

    it('throws NotFoundException when the invited email has no account', async () => {
      prismaMock.note.findUnique.resolves(baseNote);
      prismaMock.user.findUnique.resolves(null);
      try {
        await notesService.inviteCollaborator(ownerId, 'note-1', {
          identifier: 'ghost@example.com',
        } as InviteCollaboratorInput);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundException);
      }
    });

    it('throws ConflictException when inviting the note owner', async () => {
      prismaMock.note.findUnique.resolves(baseNote);
      prismaMock.user.findUnique.resolves({
        id: ownerId,
        email: 'owner@example.com',
      });
      try {
        await notesService.inviteCollaborator(ownerId, 'note-1', {
          identifier: 'owner@example.com',
        } as InviteCollaboratorInput);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(ConflictException);
      }
    });

    it('throws ConflictException when the user is already a collaborator', async () => {
      prismaMock.note.findUnique.resolves(baseNote);
      prismaMock.user.findUnique.resolves({
        id: writeCollaboratorId,
        email: 'collab@example.com',
      });
      prismaMock.noteCollaborator.findUnique.resolves(writeCollaborator);
      try {
        await notesService.inviteCollaborator(ownerId, 'note-1', {
          identifier: 'collab@example.com',
        } as InviteCollaboratorInput);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(ConflictException);
      }
    });

    it('rejects a non-owner trying to invite collaborators', async () => {
      prismaMock.note.findUnique.resolves(baseNote);
      try {
        await notesService.inviteCollaborator(writeCollaboratorId, 'note-1', {
          identifier: 'someone@example.com',
        } as InviteCollaboratorInput);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundException);
        expect(prismaMock.user.findUnique.called).to.be.false;
      }
    });
  });

  describe('listCollaborators', () => {
    it('is visible to the owner', async () => {
      prismaMock.note.findUnique.resolves(
        withCollaborators(baseNote, [writeCollaborator]),
      );
      prismaMock.noteCollaborator.findMany.resolves([
        {
          ...writeCollaborator,
          invitedAt: new Date(),
          user: {
            id: writeCollaboratorId,
            email: 'c@example.com',
            passwordHash: 'x',
            username: 'collab_user',
          },
        },
      ]);
      const result = await notesService.listCollaborators(ownerId, 'note-1');
      expect(result).to.have.length(1);
      expect((result[0] as ShapedResult).user).to.not.have.property(
        'passwordHash',
      );
    });

    it('is visible to an invited collaborator', async () => {
      prismaMock.note.findUnique.resolves(
        withCollaborators(baseNote, [readCollaborator]),
      );
      prismaMock.noteCollaborator.findMany.resolves([]);
      const result = await notesService.listCollaborators(
        readCollaboratorId,
        'note-1',
      );
      expect(result).to.deep.equal([]);
    });

    it('is hidden from a stranger on a private note', async () => {
      prismaMock.note.findUnique.resolves(withCollaborators(baseNote));
      try {
        await notesService.listCollaborators(strangerId, 'note-1');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundException);
      }
    });
  });

  describe('updateCollaboratorPermission', () => {
    it('allows the owner to change a collaborator permission', async () => {
      prismaMock.note.findUnique.resolves(baseNote);
      prismaMock.noteCollaborator.findUnique.resolves(readCollaborator);
      prismaMock.noteCollaborator.update.resolves({
        ...readCollaborator,
        permission: 'WRITE',
        invitedAt: new Date(),
        user: {
          id: readCollaboratorId,
          email: 'r@example.com',
          passwordHash: 'x',
          username: 'read_user',
        },
      });

      const result = await notesService.updateCollaboratorPermission(
        ownerId,
        'note-1',
        readCollaboratorId,
        {
          permission: 'WRITE',
        },
      );
      expect((result as ShapedResult).permission).to.equal('WRITE');
      expect(
        eventsMock.emit.calledWith('collaborator.permission-changed', {
          noteId: 'note-1',
          noteTitle: baseNote.title,
          collaboratorUserId: readCollaboratorId,
          permission: 'WRITE',
          changedByUserId: ownerId,
        }),
      ).to.be.true;
    });

    it('throws NotFoundException when the target user is not a collaborator', async () => {
      prismaMock.note.findUnique.resolves(baseNote);
      prismaMock.noteCollaborator.findUnique.resolves(null);
      try {
        await notesService.updateCollaboratorPermission(
          ownerId,
          'note-1',
          strangerId,
          {
            permission: 'WRITE',
          },
        );
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundException);
      }
    });

    it('rejects a non-owner (even a WRITE collaborator) trying to change permissions', async () => {
      prismaMock.note.findUnique.resolves(baseNote);
      try {
        await notesService.updateCollaboratorPermission(
          writeCollaboratorId,
          'note-1',
          readCollaboratorId,
          {
            permission: 'WRITE',
          },
        );
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundException);
      }
    });
  });

  describe('removeCollaborator', () => {
    it('allows the owner to remove a collaborator', async () => {
      prismaMock.note.findUnique.resolves(baseNote);
      prismaMock.noteCollaborator.findUnique.resolves(writeCollaborator);
      prismaMock.noteCollaborator.delete.resolves(writeCollaborator);

      await notesService.removeCollaborator(
        ownerId,
        'note-1',
        writeCollaboratorId,
      );
      expect(prismaMock.noteCollaborator.delete.calledOnce).to.be.true;
      expect(
        eventsMock.emit.calledWith('collaborator.removed', {
          noteId: 'note-1',
          noteTitle: baseNote.title,
          collaboratorUserId: writeCollaboratorId,
          removedByUserId: ownerId,
        }),
      ).to.be.true;
    });

    it('throws NotFoundException when removing a non-collaborator', async () => {
      prismaMock.note.findUnique.resolves(baseNote);
      prismaMock.noteCollaborator.findUnique.resolves(null);
      try {
        await notesService.removeCollaborator(ownerId, 'note-1', strangerId);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundException);
        expect(prismaMock.noteCollaborator.delete.called).to.be.false;
      }
    });
  });

  describe('listVersions', () => {
    const version1 = {
      id: 'v1',
      noteId: 'note-1',
      title: 'v1 title',
      createdAt: new Date('2026-01-02'),
    };
    const version2 = {
      id: 'v2',
      noteId: 'note-1',
      title: 'v2 title',
      createdAt: new Date('2026-01-03'),
    };

    it('returns version history, newest first, for the owner', async () => {
      prismaMock.note.findUnique.resolves(withCollaborators(baseNote));
      prismaMock.noteVersion.findMany.resolves([version2, version1]);

      const result = await notesService.listVersions(ownerId, 'note-1');

      expect(result).to.deep.equal([version2, version1]);
      expect(
        prismaMock.noteVersion.findMany.calledOnceWith({
          where: { noteId: 'note-1' },
          orderBy: { createdAt: 'desc' },
        }),
      ).to.be.true;
    });

    it('allows a READ collaborator to view history (view-only, not restore)', async () => {
      prismaMock.note.findUnique.resolves(
        withCollaborators(baseNote, [readCollaborator]),
      );
      prismaMock.noteVersion.findMany.resolves([version1]);
      const result = await notesService.listVersions(
        readCollaboratorId,
        'note-1',
      );
      expect(result).to.deep.equal([version1]);
    });

    it('rejects a stranger with no access', async () => {
      prismaMock.note.findUnique.resolves(withCollaborators(baseNote));
      try {
        await notesService.listVersions(strangerId, 'note-1');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundException);
      }
    });
  });

  describe('getVersion', () => {
    const version = {
      id: 'v1',
      noteId: 'note-1',
      title: 'Old title',
      content: 'Old content',
      contentFormat: 'MARKDOWN',
      tags: ['old'],
    };

    it('returns a specific version when the viewer has access', async () => {
      prismaMock.note.findUnique.resolves(withCollaborators(baseNote));
      prismaMock.noteVersion.findUnique.resolves(version);
      const result = await notesService.getVersion(ownerId, 'note-1', 'v1');
      expect(result).to.deep.equal(version);
    });

    it('throws NotFoundException when the version does not exist', async () => {
      prismaMock.note.findUnique.resolves(withCollaborators(baseNote));
      prismaMock.noteVersion.findUnique.resolves(null);
      try {
        await notesService.getVersion(ownerId, 'note-1', 'missing');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundException);
      }
    });

    it('throws NotFoundException when the version belongs to a different note (no cross-note leakage)', async () => {
      prismaMock.note.findUnique.resolves(withCollaborators(baseNote));
      prismaMock.noteVersion.findUnique.resolves({
        ...version,
        noteId: 'someone-elses-note',
      });
      try {
        await notesService.getVersion(ownerId, 'note-1', 'v1');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundException);
      }
    });
  });

  describe('restoreVersion', () => {
    const version = {
      id: 'v1',
      noteId: 'note-1',
      title: 'Old title',
      content: 'Old content',
      contentFormat: 'MARKDOWN',
      tags: ['old'],
    };

    it('restores the note to the given version, deleting the version and newer history', async () => {
      prismaMock.note.findUnique.resolves(withCollaborators(baseNote));
      prismaMock.noteVersion.findUnique.resolves(version);
      prismaMock.note.update.resolves({
        ...baseNote,
        title: 'Old title',
        content: 'Old content',
      });
      prismaMock.noteVersion.deleteMany.resolves({ count: 1 });

      const result = await notesService.restoreVersion(ownerId, 'note-1', 'v1');

      expect(
        prismaMock.note.update.calledWith({
          where: { id: 'note-1' },
          data: {
            title: 'Old title',
            content: 'Old content',
          },
        }),
      ).to.be.true;
      expect(prismaMock.noteVersion.deleteMany.calledOnce).to.be.true;
      expect((result as ShapedResult).title).to.equal('Old title');
      expect((result as ShapedResult).tags).to.deep.equal(['old']);
      expect(eventsMock.emit.calledWith('note.updated')).to.be.true;
    });

    it('allows a WRITE collaborator to restore', async () => {
      prismaMock.user.findUnique.resolves({
        id: writeCollaboratorId,
        username: 'write_user',
      });
      prismaMock.note.findUnique.resolves(
        withCollaborators(baseNote, [writeCollaborator]),
      );
      prismaMock.noteVersion.findUnique.resolves(version);
      prismaMock.note.update.resolves({ ...baseNote, title: 'Old title' });

      const result = await notesService.restoreVersion(
        writeCollaboratorId,
        'note-1',
        'v1',
      );
      expect((result as ShapedResult).viewerRole).to.equal('write');
    });

    it('rejects a READ collaborator trying to restore', async () => {
      prismaMock.note.findUnique.resolves(
        withCollaborators(baseNote, [readCollaborator]),
      );
      try {
        await notesService.restoreVersion(readCollaboratorId, 'note-1', 'v1');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundException);
        expect(prismaMock.note.update.called).to.be.false;
      }
    });

    it('throws NotFoundException for a version id that does not belong to this note', async () => {
      prismaMock.note.findUnique.resolves(withCollaborators(baseNote));
      prismaMock.noteVersion.findUnique.resolves({
        ...version,
        noteId: 'other-note',
      });
      try {
        await notesService.restoreVersion(ownerId, 'note-1', 'v1');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundException);
        expect(prismaMock.note.update.called).to.be.false;
      }
    });
  });

  describe('exportNotes', () => {
    it("exports as JSON, scoped to the owner's notes", async () => {
      prismaMock.note.findMany.resolves([
        { ...baseNote, tags: tagRelations(['work']) },
      ]);
      const result = await notesService.exportNotes(ownerId, {
        format: 'json',
      });

      expect(result.contentType).to.equal('application/json');
      expect(result.filename).to.match(/\.json$/);
      const parsed = JSON.parse(result.content);
      expect(parsed).to.have.length(1);
      expect(parsed[0].tags).to.deep.equal(['work']);
      expect(parsed[0].isPinned).to.be.undefined;
      expect(parsed[0].isFavorite).to.be.undefined;
      expect(prismaMock.note.findMany.firstCall.args[0].where.ownerId).to.equal(
        ownerId,
      );
    });

    it('exports as Markdown with a tags line and a separator between notes', async () => {
      prismaMock.note.findMany.resolves([
        {
          ...baseNote,
          id: 'note-1',
          title: 'First',
          tags: tagRelations(['work']),
        },
        { ...baseNote, id: 'note-2', title: 'Second', tags: [] },
      ]);
      const result = await notesService.exportNotes(ownerId, {
        format: 'markdown',
      });

      expect(result.contentType).to.equal('text/markdown');
      expect(result.content).to.include('# First');
      expect(result.content).to.include('Tags: work');
      expect(result.content).to.include('# Second');
      expect(result.content).to.include('\n\n---\n\n');
    });

    it('scopes to the given noteIds when provided', async () => {
      prismaMock.note.findMany.resolves([baseNote]);
      await notesService.exportNotes(ownerId, {
        format: 'json',
        noteIds: ['note-1'],
      });
      expect(prismaMock.note.findMany.firstCall.args[0].where.id).to.deep.equal(
        { in: ['note-1'] },
      );
    });

    it('throws NotFoundException when nothing matches', async () => {
      prismaMock.note.findMany.resolves([]);
      try {
        await notesService.exportNotes(ownerId, { format: 'json' });
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundException);
      }
    });
  });

  describe('importNotes', () => {
    it('creates one note per entry in a JSON array file', async () => {
      prismaMock.note.create.resolves(baseNote);
      const file = {
        originalname: 'export.json',
        buffer: Buffer.from(
          JSON.stringify([
            { title: 'A', content: 'a' },
            { title: 'B', content: 'b' },
          ]),
        ),
      };
      const result = await notesService.importNotes(ownerId, [file]);
      expect(result.created).to.equal(2);
      expect(result.failed).to.have.length(0);
      expect(prismaMock.note.create.callCount).to.equal(2);
    });

    it('accepts a single JSON note object (not just an array)', async () => {
      prismaMock.note.create.resolves(baseNote);
      const file = {
        originalname: 'note.json',
        buffer: Buffer.from(JSON.stringify({ title: 'A', content: 'a' })),
      };
      const result = await notesService.importNotes(ownerId, [file]);
      expect(result.created).to.equal(1);
    });

    it('imports notes from wrapped JSON objects and skips non-object entries', async () => {
      prismaMock.note.create.resolves(baseNote);
      const file = {
        originalname: 'export.json',
        buffer: Buffer.from(
          JSON.stringify({
            notes: [
              { title: 'A', content: 'a' },
              null,
              { title: 'B', content: 'b', tags: ['work'] },
            ],
          }),
        ),
      };
      const result = await notesService.importNotes(ownerId, [file]);
      expect(result.created).to.equal(2);
    });

    it('imports a Markdown file, extracting the title from the first heading', async () => {
      prismaMock.note.create.resolves(baseNote);
      const file = {
        originalname: 'Meeting Notes.md',
        buffer: Buffer.from('# Body text\n\nContent details'),
      };
      await notesService.importNotes(ownerId, [file]);
      const createArgs = prismaMock.note.create.firstCall.args[0];
      expect(createArgs.data.title).to.equal('Body text');
      expect(createArgs.data.content).to.have.property('type', 'doc');
    });

    it('imports multiple files in a single batch', async () => {
      prismaMock.note.create.resolves(baseNote);
      const file1 = {
        originalname: 'file1.json',
        buffer: Buffer.from(JSON.stringify([{ title: '1', content: 'c1' }])),
      };
      const file2 = {
        originalname: 'file2.md',
        buffer: Buffer.from('# 2\n\nc2'),
      };
      const result = await notesService.importNotes(ownerId, [file1, file2]);
      expect(result.created).to.equal(2);
      expect(result.failed).to.have.length(0);
    });

    it('records a per-file failure for invalid JSON without aborting other files', async () => {
      prismaMock.note.create.resolves(baseNote);
      const badFile = {
        originalname: 'broken.json',
        buffer: Buffer.from('{not valid json'),
      };
      const goodFile = {
        originalname: 'ok.md',
        buffer: Buffer.from('content'),
      };

      const result = await notesService.importNotes(ownerId, [
        badFile,
        goodFile,
      ]);

      expect(result.created).to.equal(1);
      expect(result.failed).to.have.length(1);
      expect(result.failed[0].filename).to.equal('broken.json');
    });
  });

  describe('bulkAction', () => {
    it('deletes only the notes the user actually owns, ignoring the rest', async () => {
      prismaMock.note.findMany.onFirstCall().resolves([{ id: 'note-1' }]); // only note-1 is owned
      prismaMock.note.deleteMany.resolves({ count: 1 });

      const result = await notesService.bulkAction(ownerId, {
        noteIds: ['note-1', 'someone-elses-note'],
        action: 'delete',
      });

      expect(result.affected).to.equal(1);
      expect(
        prismaMock.note.deleteMany.calledOnceWith({
          where: { id: { in: ['note-1'] } },
        }),
      ).to.be.true;
      expect(
        eventsMock.emit.calledWith('note.deleted', {
          noteId: 'note-1',
          deletedByUserId: ownerId,
        }),
      ).to.be.true;
    });

    it('pins in bulk and emits note.updated for each affected note', async () => {
      prismaMock.note.findMany
        .onFirstCall()
        .resolves([{ id: 'note-1' }, { id: 'note-2' }]);
      prismaMock.note.updateMany.resolves({ count: 2 });
      prismaMock.note.findMany.onSecondCall().resolves([
        { ...baseNote, id: 'note-1', isPinned: true },
        { ...baseNote, id: 'note-2', isPinned: true },
      ]);

      const result = await notesService.bulkAction(ownerId, {
        noteIds: ['note-1', 'note-2'],
        action: 'pin',
      });

      expect(result.affected).to.equal(2);
      expect(
        prismaMock.note.updateMany.calledOnceWith({
          where: { id: { in: ['note-1', 'note-2'] } },
          data: { isPinned: true },
        }),
      ).to.be.true;
      expect(eventsMock.emit.withArgs('note.updated').callCount).to.equal(2);
    });

    it('returns affected: 0 without touching the database when the user owns none of the given notes', async () => {
      prismaMock.note.findMany.resolves([]);
      const result = await notesService.bulkAction(ownerId, {
        noteIds: ['not-mine'],
        action: 'delete',
      });
      expect(result.affected).to.equal(0);
      expect(prismaMock.note.deleteMany.called).to.be.false;
    });

    it('favorites in bulk', async () => {
      prismaMock.note.findMany.onFirstCall().resolves([{ id: 'note-1' }]);
      prismaMock.note.updateMany.resolves({ count: 1 });
      prismaMock.note.findMany
        .onSecondCall()
        .resolves([{ ...baseNote, isFavorite: true }]);

      const result = await notesService.bulkAction(ownerId, {
        noteIds: ['note-1'],
        action: 'favorite',
      });

      expect(result.affected).to.equal(1);
      expect(
        prismaMock.note.updateMany.calledOnceWith({
          where: { id: { in: ['note-1'] } },
          data: { isFavorite: true },
        }),
      ).to.be.true;
    });

    it('unfavorites in bulk', async () => {
      prismaMock.note.findMany.onFirstCall().resolves([{ id: 'note-1' }]);
      prismaMock.note.updateMany.resolves({ count: 1 });
      prismaMock.note.findMany
        .onSecondCall()
        .resolves([{ ...baseNote, isFavorite: false }]);

      await notesService.bulkAction(ownerId, {
        noteIds: ['note-1'],
        action: 'unfavorite',
      });

      expect(
        prismaMock.note.updateMany.calledOnceWith({
          where: { id: { in: ['note-1'] } },
          data: { isFavorite: false },
        }),
      ).to.be.true;
    });
  });
});
