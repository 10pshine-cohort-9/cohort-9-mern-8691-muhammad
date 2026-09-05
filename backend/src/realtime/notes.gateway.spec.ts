import { expect } from 'chai';
import * as sinon from 'sinon';
import type { Socket, Server } from 'socket.io';
import type { PinoLogger } from 'nestjs-pino';
import { NotesGateway } from './notes.gateway.js';
import type { TokenService } from '../token/token.service.js';
import type { NotesService } from '../notes/notes.service.js';
import type { Notification } from '../notifications/notifications.types.js';

describe('NotesGateway', () => {
  let gateway: NotesGateway;
  let tokenServiceMock: { verifyAccessToken: sinon.SinonStub };
  let notesServiceMock: { findOne: sinon.SinonStub };
  let loggerMock: {
    info: sinon.SinonStub;
    warn: sinon.SinonStub;
    error: sinon.SinonStub;
    setContext: sinon.SinonStub;
  };
  let serverMock: { to: sinon.SinonStub; emit: sinon.SinonStub };
  let roomEmitMock: sinon.SinonStub;
  let sandbox: sinon.SinonSandbox;

  const makeSocket = (overrides: Record<string, unknown> = {}) =>
    ({
      id: 'socket-1',
      data: {},
      handshake: { auth: {}, headers: {} },
      join: sandbox.stub().resolves(),
      leave: sandbox.stub().resolves(),
      disconnect: sandbox.stub(),
      ...overrides,
    }) as unknown as Socket;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    tokenServiceMock = { verifyAccessToken: sandbox.stub() };
    notesServiceMock = { findOne: sandbox.stub() };
    loggerMock = {
      info: sandbox.stub(),
      warn: sandbox.stub(),
      error: sandbox.stub(),
      setContext: sandbox.stub(),
    };
    roomEmitMock = sandbox.stub();
    serverMock = {
      to: sandbox.stub().returns({ emit: roomEmitMock }),
      emit: sandbox.stub(),
    };

    gateway = new NotesGateway(
      tokenServiceMock as unknown as TokenService,
      notesServiceMock as unknown as NotesService,
      loggerMock as unknown as PinoLogger,
    );
    gateway.server = serverMock as unknown as Server;
  });

  afterEach(() => sandbox.restore());

  describe('handleConnection', () => {
    it('joins the user room when given a valid token', async () => {
      const socket = makeSocket({
        handshake: { auth: { token: 'valid-token' } },
      });
      tokenServiceMock.verifyAccessToken.resolves({ sub: 'user-1' });

      await gateway.handleConnection(socket);

      expect((socket.join as sinon.SinonStub).calledWith('user:user-1')).to.be
        .true;
    });

    it('accepts a token from the Authorization header as a fallback', async () => {
      const socket = makeSocket({
        handshake: {
          auth: {},
          headers: { authorization: 'Bearer valid-header-token' },
        },
      });
      tokenServiceMock.verifyAccessToken.resolves({ sub: 'user-1' });

      await gateway.handleConnection(socket);

      expect(
        tokenServiceMock.verifyAccessToken.calledWith('valid-header-token'),
      ).to.be.true;
    });

    it('accepts a token from the cookie header', async () => {
      const socket = makeSocket({
        handshake: {
          auth: {},
          headers: {
            cookie: 'other=123; accessToken=valid-cookie-token; other2=456',
          },
        },
      });
      tokenServiceMock.verifyAccessToken.resolves({ sub: 'user-1' });

      await gateway.handleConnection(socket);

      expect(
        tokenServiceMock.verifyAccessToken.calledWith('valid-cookie-token'),
      ).to.be.true;
    });

    it('disconnects a socket with no token at all', async () => {
      const socket = makeSocket();
      await gateway.handleConnection(socket);
      expect((socket.disconnect as sinon.SinonStub).calledOnceWith(true)).to.be
        .true;
    });

    it('disconnects a socket with an invalid/expired token', async () => {
      const socket = makeSocket({ handshake: { auth: { token: 'bad' } } });
      tokenServiceMock.verifyAccessToken.rejects(new Error('Expired'));
      await gateway.handleConnection(socket);
      expect((socket.disconnect as sinon.SinonStub).calledOnceWith(true)).to.be
        .true;
    });
  });

  describe('handleDisconnect', () => {
    it('logs the disconnect without throwing', () => {
      const socket = makeSocket({ data: { userId: 'user-1' } });
      expect(() => gateway.handleDisconnect(socket)).not.to.throw();
      expect(loggerMock.info.calledOnce).to.be.true;
    });
  });

  describe('handleNoteJoin', () => {
    it('joins the note room when the user has access', async () => {
      const socket = makeSocket({ data: { userId: 'user-1' } });
      notesServiceMock.findOne.resolves({ id: 'note-1' });

      await gateway.handleNoteJoin(socket, 'note-1');

      expect(notesServiceMock.findOne.calledOnceWith('user-1', 'note-1')).to.be
        .true;
      expect((socket.join as sinon.SinonStub).calledWith('note:note-1')).to.be
        .true;
    });

    it('refuses to join when the user has no access to the note', async () => {
      const socket = makeSocket({ data: { userId: 'user-1' } });
      notesServiceMock.findOne.rejects(new Error('Access denied'));

      await gateway.handleNoteJoin(socket, 'note-1');

      expect((socket.join as sinon.SinonStub).called).to.be.false;
      expect(loggerMock.warn.calledOnce).to.be.true;
    });
  });

  describe('handleNoteLeave', () => {
    it('leaves the note room', async () => {
      const socket = makeSocket();
      await gateway.handleNoteLeave(socket, 'note-1');
      expect((socket.leave as sinon.SinonStub).calledWith('note:note-1')).to.be
        .true;
    });
  });

  describe('broadcast helpers', () => {
    const note = { id: 'note-1', title: 'Test' } as unknown as Parameters<
      NotesGateway['emitNoteUpdated']
    >[0];

    it('emitNoteUpdated broadcasts to the note room', () => {
      gateway.emitNoteUpdated(note, 'user-1');
      expect(serverMock.to.calledWith('note:note-1')).to.be.true;
      expect(roomEmitMock.firstCall.args[0]).to.equal('note:updated');
      expect(roomEmitMock.firstCall.args[1]).to.deep.equal({
        note,
        editedByUserId: 'user-1',
      });
    });

    it('emitNoteDeleted broadcasts to the note room', () => {
      gateway.emitNoteDeleted('note-1', 'user-1');
      expect(serverMock.to.calledWith('note:note-1')).to.be.true;
      expect(roomEmitMock.firstCall.args[0]).to.equal('note:deleted');
      expect(roomEmitMock.firstCall.args[1]).to.deep.equal({
        noteId: 'note-1',
        deletedByUserId: 'user-1',
      });
    });

    it('emitNotification delivers to the recipient user room', () => {
      const notification = { id: 'notif-1' } as Notification;
      gateway.emitNotification('user-2', notification);
      expect(serverMock.to.calledWith('user:user-2')).to.be.true;
      expect(roomEmitMock.firstCall.args[0]).to.equal('notification:new');
      expect(roomEmitMock.firstCall.args[1]).to.deep.equal({ notification });
    });
  });
});
