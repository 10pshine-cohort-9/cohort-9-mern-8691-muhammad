import { expect } from 'chai';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module.js';
import {
  assertSuccessResponse,
  assertErrorResponse,
} from './helpers/api-types.js';
import { createVerifiedUser, cleanDatabase } from './helpers/auth.helper.js';

interface NoteItem {
  id: string;
  title: string;
  content: Record<string, unknown>;
  isPinned: boolean;
}

interface PaginatedNotes {
  data: NoteItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDatabase ? describe : describe.skip;

describeIfDb('Notes flow (e2e)', function () {
  this.timeout(20000);
  let app: INestApplication;
  let httpServer: App;
  const email = `e2e-notes-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`;
  let accessToken: string;
  let noteId: string;
  let otherUserToken: string;
  let user1Id: string;
  let user2Id: string;

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
    await app.init();
    httpServer = app.getHttpServer() as App;

    const user1 = await createVerifiedUser(
      app,
      email,
      'Password123',
      `notes_u1_${Date.now()}`,
      'Tester',
    );
    accessToken = user1.accessToken;
    user1Id = user1.userId;

    const user2 = await createVerifiedUser(
      app,
      `e2e-notes-other-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`,
      'Password123',
      `notes_u2_${Date.now()}`,
      'User',
    );
    otherUserToken = user2.accessToken;
    user2Id = user2.userId;
  });

  after(async () => {
    if (app) {
      await cleanDatabase(app, [user1Id, user2Id]);
      await app.close();
    }
  });

  it('rejects unauthenticated requests to /notes with ApiErrorResponse envelope', async () => {
    const res = await request(httpServer).get('/api/notes').expect(401);
    assertErrorResponse(res.body, 401);
  });

  it('creates a note with valid payload and returns ApiSuccessResponse envelope', async () => {
    const res = await request(httpServer)
      .post('/api/notes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Roadmap ideas',
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Ship features' }],
            },
          ],
        },
        tags: ['planning', 'roadmap'],
      })
      .expect(201);

    const note = assertSuccessResponse<NoteItem>(res.body);
    expect(note.title).to.equal('Roadmap ideas');
    noteId = note.id;
  });

  it('rejects a note with an empty title with ApiErrorResponse envelope', async () => {
    const res = await request(httpServer)
      .post('/api/notes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: '',
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'body' }],
            },
          ],
        },
      })
      .expect(400);

    assertErrorResponse(res.body, 400);
  });

  it('lists notes with pagination metadata and ApiSuccessResponse envelope', async () => {
    const res = await request(httpServer)
      .get('/api/notes?page=1&limit=10')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const page = assertSuccessResponse<PaginatedNotes>(res.body);
    expect(page.data).to.be.an('array');
    expect(page.meta).to.have.keys(['page', 'limit', 'total', 'totalPages']);
    expect(page.data.some((n) => n.id === noteId)).to.be.true;
  });

  it('finds notes by search term and returns ApiSuccessResponse envelope', async () => {
    const res = await request(httpServer)
      .get('/api/notes?search=Roadmap')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const page = assertSuccessResponse<PaginatedNotes>(res.body);
    expect(page.data.some((n) => n.id === noteId)).to.be.true;
  });

  it('fetches a single note by id and returns ApiSuccessResponse envelope', async () => {
    const res = await request(httpServer)
      .get(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const note = assertSuccessResponse<NoteItem>(res.body);
    expect(note.id).to.equal(noteId);
  });

  it('returns 404 ApiErrorResponse envelope for a note owned by a different user', async () => {
    const res = await request(httpServer)
      .get(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .expect(404);

    assertErrorResponse(res.body, 404);
  });

  it('updates a note and returns ApiSuccessResponse envelope', async () => {
    const res = await request(httpServer)
      .patch(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ isPinned: true })
      .expect(200);

    const note = assertSuccessResponse<NoteItem>(res.body);
    expect(note.isPinned).to.equal(true);
  });

  it('prevents another user from updating the note and returns ApiErrorResponse envelope', async () => {
    const res = await request(httpServer)
      .patch(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({ title: 'Hijacked' })
      .expect(404);

    assertErrorResponse(res.body, 404);
  });

  it('deletes a note and returns 204 No Content', async () => {
    await request(httpServer)
      .delete(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);
  });

  it('confirms the note is gone with ApiErrorResponse envelope', async () => {
    const res = await request(httpServer)
      .get(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);

    assertErrorResponse(res.body, 404);
  });
});
