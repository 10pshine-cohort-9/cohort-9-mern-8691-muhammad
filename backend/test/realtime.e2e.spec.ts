import { expect } from 'chai';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { io, type Socket } from 'socket.io-client';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module.js';
import { cleanDatabase } from './helpers/auth.helper.js';
import { assertSuccessResponse } from './helpers/api-types.js';

interface UnknownRecord {
  [key: string]: unknown;
}

const hasDatabase = !!process.env.DATABASE_URL;
const describeIfDb = hasDatabase ? describe : describe.skip;

describeIfDb('Realtime flow (e2e)', function () {
  this.timeout(20000);
  let app: INestApplication;
  let httpServer: App;
  let baseUrl: string;
  let ownerToken: string;
  let collaboratorToken: string;
  let collaboratorEmail: string;
  let noteId: string;
  const createdUserIds: string[] = [];

  const signUp = async (email: string) => {
    const res = await request(httpServer)
      .post('/api/auth/sign-up')
      .send({
        email,
        username: `rt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        password: 'Password123',
      })
      .expect(201);
    const body = assertSuccessResponse<UnknownRecord>(res.body);
    createdUserIds.push(String(body.id));
    const cookies = (res.headers['set-cookie'] ?? []) as unknown as string[];
    const token = cookies
      .find((c) => c.startsWith('accessToken='))
      ?.split(';')[0]
      .split('=')[1];
    return { id: String(body.id), token: token ?? '' };
  };

  const connectSocket = (token: string): Socket =>
    io(baseUrl, { auth: { token }, transports: ['websocket'], forceNew: true });

  before(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api', { exclude: ['health'] });
    await app.listen(0);
    baseUrl = await app.getUrl();
    httpServer = app.getHttpServer() as App;

    const owner = await signUp(
      `e2e-rt-owner-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`,
    );
    ownerToken = owner.token;

    collaboratorEmail = `e2e-rt-collab-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`;
    const collab = await signUp(collaboratorEmail);
    collaboratorToken = collab.token;

    const noteRes = await request(httpServer)
      .post('/api/notes')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Realtime note',
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'socket tests' }],
            },
          ],
        },
      })
      .expect(201);

    const note = assertSuccessResponse<UnknownRecord>(noteRes.body);
    noteId = String(note.id);
  });

  after(async () => {
    if (app) {
      await cleanDatabase(app, createdUserIds);
      await app.close();
    }
  });

  it('rejects socket connection with invalid token', (done) => {
    const socket = connectSocket('invalid-token');
    socket.on('connect_error', (err) => {
      expect(err.message).to.match(/unauthorized|invalid/i);
      socket.disconnect();
      done();
    });
  });

  it('connects successfully with valid token', (done) => {
    const socket = connectSocket(ownerToken);
    socket.on('connect', () => {
      expect(socket.connected).to.be.true;
      socket.disconnect();
      done();
    });
  });

  it('joins a note room and receives note:updated events', (done) => {
    const socket = connectSocket(ownerToken);

    socket.on('connect', () => {
      socket.emit('note:join', noteId);

      socket.on(
        'note:updated',
        (payload: { note: { id: string; title: string } }) => {
          expect(payload.note.id).to.equal(noteId);
          expect(payload.note.title).to.equal('Updated title via REST');
          socket.disconnect();
          done();
        },
      );

      setTimeout(() => {
        void request(httpServer)
          .patch(`/api/notes/${noteId}`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ title: 'Updated title via REST' })
          .expect(200)
          .then();
      }, 100);
    });
  });

  it('refuses to join a note room the socket has no access to', (done) => {
    const strangerSocket = connectSocket(collaboratorToken);
    strangerSocket.on('connect', () => {
      strangerSocket.emit(
        'note:join',
        noteId,
        (response: { ok: boolean; error?: string }) => {
          expect(response.ok).to.be.false;
          expect(response.error).to.match(/access|not found/i);
          strangerSocket.disconnect();
          done();
        },
      );
    });
  });

  it('delivers a notification in real time when invited to a new note', (done) => {
    const collabSocket = connectSocket(collaboratorToken);

    collabSocket.on('connect', () => {
      collabSocket.on(
        'notification:new',
        (payload: { notification: { type: string } }) => {
          expect(payload.notification.type).to.equal('COLLABORATOR_INVITED');
          collabSocket.disconnect();
          done();
        },
      );

      setTimeout(() => {
        void request(httpServer)
          .post(`/api/notes/${noteId}/invite`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ identifier: collaboratorEmail, permission: 'READ' })
          .expect(201)
          .then();
      }, 100);
    });
  });
});
