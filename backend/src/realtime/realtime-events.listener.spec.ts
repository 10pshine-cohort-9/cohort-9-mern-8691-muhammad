import { expect } from 'chai';
import * as sinon from 'sinon';
import type { PinoLogger } from 'nestjs-pino';
import { RealtimeEventsListener } from './realtime-events.listener.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { NotificationsService } from '../notifications/notifications.service.js';
import type { NotesGateway } from './notes.gateway.js';

describe('RealtimeEventsListener', () => {
  let listener: RealtimeEventsListener;
  let prismaMock: { user: { findUnique: sinon.SinonStub } };
  let notificationsMock: { create: sinon.SinonStub };
  let gatewayMock: {
    emitNoteUpdated: sinon.SinonStub;
    emitNoteDeleted: sinon.SinonStub;
    emitNotification: sinon.SinonStub;
    evictUserFromNoteRoom: sinon.SinonStub;
  };
  let loggerMock: {
    info: sinon.SinonStub;
    warn: sinon.SinonStub;
    error: sinon.SinonStub;
    setContext: sinon.SinonStub;
  };
  let sandbox: sinon.SinonSandbox;

  const actor = { username: 'janedoe' };

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    prismaMock = { user: { findUnique: sandbox.stub().resolves(actor) } };
    notificationsMock = {
      create: sandbox.stub().resolves({ id: 'notif-1' }),
    };
    gatewayMock = {
      emitNoteUpdated: sandbox.stub(),
      emitNoteDeleted: sandbox.stub(),
      emitNotification: sandbox.stub(),
      evictUserFromNoteRoom: sandbox.stub(),
    };
    loggerMock = {
      info: sandbox.stub(),
      warn: sandbox.stub(),
      error: sandbox.stub(),
      setContext: sandbox.stub(),
    };

    listener = new RealtimeEventsListener(
      prismaMock as unknown as PrismaService,
      notificationsMock as unknown as NotificationsService,
      gatewayMock as unknown as NotesGateway,
      loggerMock as unknown as PinoLogger,
    );
  });

  afterEach(() => sandbox.restore());

  it('handleNoteUpdated forwards straight to the gateway', () => {
    const note = { id: 'note-1', title: 'T' } as unknown as Parameters<
      RealtimeEventsListener['handleNoteUpdated']
    >[0]['note'];
    listener.handleNoteUpdated({ note, editedByUserId: 'user-1' });
    expect(gatewayMock.emitNoteUpdated.firstCall.args).to.deep.equal([
      note,
      'user-1',
    ]);
  });

  it('handleNoteDeleted forwards straight to the gateway', () => {
    listener.handleNoteDeleted({ noteId: 'note-1', deletedByUserId: 'user-1' });
    expect(gatewayMock.emitNoteDeleted.firstCall.args).to.deep.equal([
      'note-1',
      'user-1',
    ]);
  });

  it('handleNoteEditedByCollaborator notifies every recipient with the editor display name', async () => {
    await listener.handleNoteEditedByCollaborator({
      noteId: 'note-1',
      noteTitle: 'Roadmap',
      editorUserId: 'user-2',
      recipientUserIds: ['user-1'],
    });

    expect(
      prismaMock.user.findUnique.calledWith(
        sinon.match({ where: { id: 'user-2' } }),
      ),
    ).to.be.true;
    expect(notificationsMock.create.firstCall.args[0]).to.equal('user-1');
    expect(notificationsMock.create.firstCall.args[1]).to.equal('NOTE_EDITED');
    expect(notificationsMock.create.firstCall.args[2]).to.deep.equal({
      noteId: 'note-1',
      noteTitle: 'Roadmap',
      editorName: 'janedoe',
    });
    expect(gatewayMock.emitNotification.calledOnce).to.be.true;
  });

  it('handleCollaboratorInvited creates and pushes a COLLABORATOR_INVITED notification', async () => {
    await listener.handleCollaboratorInvited({
      noteId: 'note-1',
      noteTitle: 'Roadmap',
      inviterId: 'user-1',
      inviteeId: 'user-2',
      permission: 'READ',
    });

    expect(notificationsMock.create.firstCall.args[0]).to.equal('user-2');
    expect(notificationsMock.create.firstCall.args[1]).to.equal(
      'COLLABORATOR_INVITED',
    );
    expect(notificationsMock.create.firstCall.args[2]).to.deep.equal({
      noteId: 'note-1',
      noteTitle: 'Roadmap',
      inviterName: 'janedoe',
      permission: 'READ',
    });
    expect(gatewayMock.emitNotification.calledOnce).to.be.true;
  });

  it('handlePermissionChanged creates and pushes a PERMISSION_CHANGED notification', async () => {
    await listener.handlePermissionChanged({
      noteId: 'note-1',
      noteTitle: 'Roadmap',
      changedByUserId: 'user-1',
      collaboratorUserId: 'user-2',
      permission: 'WRITE',
    });

    expect(notificationsMock.create.firstCall.args[0]).to.equal('user-2');
    expect(notificationsMock.create.firstCall.args[1]).to.equal(
      'PERMISSION_CHANGED',
    );
    expect(notificationsMock.create.firstCall.args[2]).to.deep.equal({
      noteId: 'note-1',
      noteTitle: 'Roadmap',
      permission: 'WRITE',
      changedByName: 'janedoe',
    });
    expect(gatewayMock.emitNotification.calledOnce).to.be.true;
  });

  it('handleCollaboratorRemoved creates and pushes a COLLABORATOR_REMOVED notification', async () => {
    await listener.handleCollaboratorRemoved({
      noteId: 'note-1',
      noteTitle: 'Roadmap',
      removedByUserId: 'user-1',
      collaboratorUserId: 'user-2',
    });

    expect(notificationsMock.create.firstCall.args[0]).to.equal('user-2');
    expect(notificationsMock.create.firstCall.args[1]).to.equal(
      'COLLABORATOR_REMOVED',
    );
    expect(notificationsMock.create.firstCall.args[2]).to.deep.equal({
      noteId: 'note-1',
      noteTitle: 'Roadmap',
      removedByName: 'janedoe',
    });
    expect(gatewayMock.evictUserFromNoteRoom.calledOnceWith('user-2', 'note-1'))
      .to.be.true;
  });

  it('falls back to "Someone" when the actor user no longer exists', async () => {
    prismaMock.user.findUnique.resolves(null);

    await listener.handleCollaboratorRemoved({
      noteId: 'note-1',
      noteTitle: 'Roadmap',
      removedByUserId: 'ghost',
      collaboratorUserId: 'user-2',
    });

    const callArgs = notificationsMock.create.firstCall.args as [
      string,
      string,
      { removedByName: string },
    ];
    expect(callArgs[2].removedByName).to.equal('Someone');
  });

  it('logs and does not throw when notification creation fails', async () => {
    notificationsMock.create.rejects(new Error('DB down'));

    await listener.handleCollaboratorInvited({
      noteId: 'note-1',
      noteTitle: 'Roadmap',
      inviterId: 'user-1',
      inviteeId: 'user-2',
      permission: 'READ',
    });

    expect(loggerMock.error.calledOnce).to.be.true;
    expect(gatewayMock.emitNotification.called).to.be.false;
  });
});
