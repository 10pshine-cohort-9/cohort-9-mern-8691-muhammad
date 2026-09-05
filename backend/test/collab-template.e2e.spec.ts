process.env.NODE_ENV = 'test';

import { expect } from 'chai';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module.js';
import { createVerifiedUser, cleanDatabase } from './helpers/auth.helper.js';
import {
  assertSuccessResponse,
  assertErrorResponse,
} from './helpers/api-types.js';

interface UnknownRecord {
  [key: string]: unknown;
}

const hasDatabase = !!process.env.DATABASE_URL;
const describeIfDb = hasDatabase ? describe : describe.skip;

describeIfDb('Collaboration, version history, templates (e2e)', function () {
  this.timeout(20000);
  let app: INestApplication;
  let httpServer: App;
  const ownerEmail = `e2e-p6-owner-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`;
  const readerEmail = `e2e-p6-reader-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`;
  let ownerToken: string;
  let ownerId: string;
  let readerToken: string;
  let readerId: string;
  let noteId: string;
  let firstVersionId: string;

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

    const owner = await createVerifiedUser(
      app,
      ownerEmail,
      'Password123',
      `p6_owner_${Date.now()}`,
      'Phase 6 Owner',
    );
    ownerToken = owner.accessToken;
    ownerId = owner.userId;

    const reader = await createVerifiedUser(
      app,
      readerEmail,
      'Password123',
      `p6_reader_${Date.now()}`,
      'Phase 6 Reader',
    );
    readerToken = reader.accessToken;
    readerId = reader.userId;
  });

  after(async () => {
    if (app) {
      await cleanDatabase(app, [ownerId, readerId]);
      await app.close();
    }
  });

  it('creates a note and marks it as a favorite with ApiSuccessResponse envelope', async () => {
    const createRes = await request(httpServer)
      .post('/api/notes')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Versioned Spec',
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Initial v1 draft' }],
            },
          ],
        },
        tags: ['phase6', 'spec'],
        isFavorite: true,
      })
      .expect(201);

    const note = assertSuccessResponse<UnknownRecord>(createRes.body);
    expect(note.isFavorite).to.equal(true);
    noteId = String(note.id);
  });

  it('returns the favorited note when favoritesOnly=true is passed', async () => {
    const listRes = await request(httpServer)
      .get('/api/notes?favoritesOnly=true')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const page = assertSuccessResponse<{ data: UnknownRecord[] }>(listRes.body);
    expect(page.data.some((n) => n.id === noteId)).to.equal(true);
  });

  it('edits title and content, creating the first version snapshot', async () => {
    const patchRes = await request(httpServer)
      .patch(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Versioned Spec v2',
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Revised v2 draft with new section' },
              ],
            },
          ],
        },
      })
      .expect(200);

    const note = assertSuccessResponse<UnknownRecord>(patchRes.body);
    expect(note.title).to.equal('Versioned Spec v2');

    const historyRes = await request(httpServer)
      .get(`/api/notes/${noteId}/versions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const history = assertSuccessResponse<UnknownRecord[]>(historyRes.body);
    expect(history).to.have.lengthOf(1);
    expect(history[0].title).to.equal('Versioned Spec');
    expect(history[0].content).to.deep.equal({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Initial v1 draft' }],
        },
      ],
    });
    firstVersionId = String(history[0].id);
  });

  it('edits content again to create a second version snapshot', async () => {
    const patchRes = await request(httpServer)
      .patch(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Final v3 draft before restore' },
              ],
            },
          ],
        },
      })
      .expect(200);

    const note = assertSuccessResponse<UnknownRecord>(patchRes.body);
    expect(note.content).to.deep.equal({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Final v3 draft before restore' }],
        },
      ],
    });

    const historyRes = await request(httpServer)
      .get(`/api/notes/${noteId}/versions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const history = assertSuccessResponse<UnknownRecord[]>(historyRes.body);
    expect(history).to.have.lengthOf(2);
  });

  it('invites a read-only collaborator who can list history but cannot restore', async () => {
    await request(httpServer)
      .post(`/api/notes/${noteId}/invite`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ identifier: readerEmail, permission: 'READ' })
      .expect(201);

    const historyRes = await request(httpServer)
      .get(`/api/notes/${noteId}/versions`)
      .set('Authorization', `Bearer ${readerToken}`)
      .expect(200);

    const history = assertSuccessResponse<UnknownRecord[]>(historyRes.body);
    expect(history).to.have.lengthOf(2);

    const restoreRes = await request(httpServer)
      .post(`/api/notes/${noteId}/versions/${firstVersionId}/restore`)
      .set('Authorization', `Bearer ${readerToken}`)
      .expect(404);

    assertErrorResponse(restoreRes.body, 404);
  });

  it('restores an earlier version, snapshotting the current state first and returns ApiSuccessResponse envelope', async () => {
    const restoreRes = await request(httpServer)
      .post(`/api/notes/${noteId}/versions/${firstVersionId}/restore`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const note = assertSuccessResponse<UnknownRecord>(restoreRes.body);
    expect(note.title).to.equal('Versioned Spec');
    expect(note.content).to.deep.equal({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Initial v1 draft' }],
        },
      ],
    });

    const historyRes = await request(httpServer)
      .get(`/api/notes/${noteId}/versions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const history = assertSuccessResponse<UnknownRecord[]>(historyRes.body);
    expect(history).to.have.lengthOf(0);
  });

  it('fetches the static templates catalog and returns ApiSuccessResponse envelope', async () => {
    const res = await request(httpServer)
      .get('/api/templates')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const templates = assertSuccessResponse<UnknownRecord[]>(res.body);
    expect(templates).to.be.an('array');
    expect(templates.length).to.be.greaterThan(0);
    expect(templates[0]).to.include.all.keys([
      'id',
      'title',
      'content',
      'tags',
      'category',
    ]);
    expect(templates[0].content).to.be.an('object');
  });

  it('fetches a single template by id and returns ApiSuccessResponse envelope', async () => {
    const res = await request(httpServer)
      .get('/api/templates/weekly-review')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const template = assertSuccessResponse<UnknownRecord>(res.body);
    expect(template.id).to.equal('weekly-review');
    expect(template.title).to.equal('Weekly Review');
    expect(template.content).to.be.an('object');
  });

  it('404s with ApiErrorResponse envelope for an unknown template id', async () => {
    const res = await request(httpServer)
      .get('/api/templates/unknown-template-xyz')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(404);

    assertErrorResponse(res.body, 404);
  });

  it('rejects unauthenticated template requests with ApiErrorResponse envelope', async () => {
    const res = await request(httpServer).get('/api/templates').expect(401);
    assertErrorResponse(res.body, 401);
  });
});
