import { expect } from 'chai';
import * as sinon from 'sinon';
import { NotesController } from './notes.controller.js';
import type { NotesService } from './notes.service.js';
import type { SafeUser } from '../auth/auth.types.js';
import type { CreateNoteDto } from './notes.dto.js';

describe('NotesController', () => {
  let controller: NotesController;
  let notesServiceMock: {
    create: sinon.SinonStub;
    findAll: sinon.SinonStub;
    findOne: sinon.SinonStub;
    update: sinon.SinonStub;
    remove: sinon.SinonStub;
    inviteCollaborator: sinon.SinonStub;
    listCollaborators: sinon.SinonStub;
    updateCollaboratorPermission: sinon.SinonStub;
    removeCollaborator: sinon.SinonStub;
    exportNotes: sinon.SinonStub;
    importNotes: sinon.SinonStub;
    bulkAction: sinon.SinonStub;
    listVersions: sinon.SinonStub;
    getVersion: sinon.SinonStub;
    restoreVersion: sinon.SinonStub;
  };
  let sandbox: sinon.SinonSandbox;

  const currentUser: SafeUser = {
    id: 'user-1',
    email: 'jane@example.com',
    username: 'janedoe',
  };

  const note = {
    id: 'note-1',
    title: 'Test note',
    content: { type: 'doc', content: [] },
    ownerId: 'user-1',
    isPinned: false,
    isFavorite: false,
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const collaborator = {
    id: 'collab-1',
    noteId: 'note-1',
    permission: 'READ' as const,
    user: { id: 'user-2', email: 'user2@example.com', username: 'user2' },
  };

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    notesServiceMock = {
      create: sandbox.stub().resolves(note),
      findAll: sandbox.stub().resolves({
        data: [note],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      }),
      findOne: sandbox.stub().resolves(note),
      update: sandbox.stub().resolves({ ...note, title: 'Updated' }),
      remove: sandbox.stub().resolves(undefined),
      inviteCollaborator: sandbox.stub().resolves(collaborator),
      listCollaborators: sandbox.stub().resolves([collaborator]),
      updateCollaboratorPermission: sandbox
        .stub()
        .resolves({ ...collaborator, permission: 'WRITE' as const }),
      removeCollaborator: sandbox.stub().resolves(undefined),
      exportNotes: sandbox.stub().resolves({
        filename: 'notes-export.json',
        contentType: 'application/json',
        content: '[]',
      }),
      importNotes: sandbox.stub().resolves({ created: 1, failed: 0 }),
      bulkAction: sandbox.stub().resolves({ affected: 1 }),
      listVersions: sandbox.stub().resolves([
        {
          id: 'v1',
          noteId: 'note-1',
          title: 'v1',
          content: { type: 'doc', content: [] },
        },
      ]),
      getVersion: sandbox.stub().resolves({
        id: 'v1',
        noteId: 'note-1',
        title: 'v1',
        content: { type: 'doc', content: [] },
      }),
      restoreVersion: sandbox.stub().resolves({ ...note, title: 'Restored' }),
    };
    controller = new NotesController(
      notesServiceMock as unknown as NotesService,
    );
  });

  afterEach(() => sandbox.restore());

  it('delegates creation to NotesService.create with the current user id', async () => {
    const dto = { title: 'Test note', content: { type: 'doc', content: [] } };
    await controller.create(currentUser, dto as CreateNoteDto);
    expect(notesServiceMock.create.calledOnceWith('user-1', dto)).to.be.true;
  });

  it('delegates finding query to NotesService.findAll with query params', async () => {
    const query = {
      page: 2,
      limit: 5,
      sortBy: 'updatedAt' as const,
      order: 'desc' as const,
      pinnedOnly: false,
      favoritesOnly: false,
      scope: 'owned' as const,
    };
    await controller.findAll(currentUser, query);
    expect(notesServiceMock.findAll.calledOnceWith('user-1', query)).to.be.true;
  });

  it('delegates query for finding one note to NotesService.findOne with the note id', async () => {
    await controller.findOne(currentUser, 'note-1');
    expect(notesServiceMock.findOne.calledOnceWith('user-1', 'note-1')).to.be
      .true;
  });

  it('delegates updation to NotesService.update with id and dto', async () => {
    const dto = { title: 'Updated' };
    await controller.update(currentUser, 'note-1', dto);
    expect(notesServiceMock.update.calledOnceWith('user-1', 'note-1', dto)).to
      .be.true;
  });

  it('delegates removing to NotesService.remove with the note id', async () => {
    await controller.remove(currentUser, 'note-1');
    expect(notesServiceMock.remove.calledOnceWith('user-1', 'note-1')).to.be
      .true;
  });

  it('delegates inviting to NotesService.inviteCollaborator', async () => {
    const dto = {
      identifier: 'friend@example.com',
      permission: 'WRITE' as const,
    };
    await controller.invite(currentUser, 'note-1', dto);
    expect(
      notesServiceMock.inviteCollaborator.calledOnceWith(
        'user-1',
        'note-1',
        dto,
      ),
    ).to.be.true;
  });

  it('delegates collaborators listing to NotesService.listCollaborators', async () => {
    const res = await controller.listCollaborators(currentUser, 'note-1');
    expect(
      notesServiceMock.listCollaborators.calledOnceWith('user-1', 'note-1'),
    ).to.be.true;
    expect(res).to.deep.equal([collaborator]);
  });

  it('delegates collaborator updation to respective service function', async () => {
    const dto = { permission: 'WRITE' as const };
    await controller.updateCollaborator(currentUser, 'note-1', 'user-2', dto);
    expect(
      notesServiceMock.updateCollaboratorPermission.calledOnceWith(
        'user-1',
        'note-1',
        'user-2',
        dto,
      ),
    ).to.be.true;
  });

  it('delegates collaborator removig to respective service function', async () => {
    await controller.removeCollaborator(currentUser, 'note-1', 'user-2');
    expect(
      notesServiceMock.removeCollaborator.calledOnceWith(
        'user-1',
        'note-1',
        'user-2',
      ),
    ).to.be.true;
  });

  it('exportNotes sets headers and sends exported content', async () => {
    const setHeaderStub = sandbox.stub();
    const sendStub = sandbox.stub();
    const resMock = {
      setHeader: setHeaderStub,
      send: sendStub,
    };
    const dto = { format: 'json' as const };
    await controller.exportNotes(
      currentUser,
      dto,
      resMock as unknown as Parameters<typeof controller.exportNotes>[2],
    );
    expect(setHeaderStub.called).to.be.true;
    expect(sendStub.calledWith('[]')).to.be.true;
  });

  it('processes uploaded files for importing of notes and returns summary', async () => {
    const file = {
      originalname: 'notes.json',
      buffer: Buffer.from('[]'),
    } as Express.Multer.File;
    const summary = await controller.importNotes(currentUser, [file]);
    expect(
      notesServiceMock.importNotes.calledOnceWith('user-1', [
        { originalname: 'notes.json', buffer: file.buffer },
      ]),
    ).to.be.true;
    expect(summary).to.deep.equal({ created: 1, failed: 0 });
  });

  it('delegates taking bulk action to NotesService.bulkAction', async () => {
    const dto = { action: 'favorite' as const, noteIds: ['note-1'] };
    await controller.bulkAction(currentUser, dto);
    expect(notesServiceMock.bulkAction.calledOnceWith('user-1', dto)).to.be
      .true;
  });

  it('delegates version listing to NotesService.listVersions', async () => {
    await controller.listVersions(currentUser, 'note-1');
    expect(notesServiceMock.listVersions.calledOnceWith('user-1', 'note-1')).to
      .be.true;
  });

  it('delegates version getting to NotesService.getVersion', async () => {
    await controller.getVersion(currentUser, 'note-1', 'v1');
    expect(notesServiceMock.getVersion.calledOnceWith('user-1', 'note-1', 'v1'))
      .to.be.true;
  });

  it('delegates version restoration to NotesService.restoreVersion', async () => {
    await controller.restoreVersion(currentUser, 'note-1', 'v1');
    expect(
      notesServiceMock.restoreVersion.calledOnceWith('user-1', 'note-1', 'v1'),
    ).to.be.true;
  });
});
