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

describeIfDb('Sharing flow (e2e)', function () {
  this.timeout(20000);
  let app: INestApplication;
  let httpServer: App;
  const ownerEmail = `e2e-share-owner-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`;
  const collabEmail = `e2e-share-collab-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`;
  let ownerToken: string;
  let ownerId: string;
  let collabToken: string;
  let collabId: string;
  let noteId: string;

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
      `share_owner_${Date.now()}`,
      'Owner User',
    );
    ownerToken = owner.accessToken;
    ownerId = owner.userId;

    const collab = await createVerifiedUser(
      app,
      collabEmail,
      'Password123',
      `share_collab_${Date.now()}`,
      'Collab User',
    );
    collabToken = collab.accessToken;
    collabId = collab.userId;

    const createRes = await request(httpServer)
      .post('/api/notes')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Collaborative Spec',
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Initial shared notes draft' }],
            },
          ],
        },
        tags: ['sharing'],
      })
      .expect(201);

    const note = assertSuccessResponse<UnknownRecord>(createRes.body);
    noteId = String(note.id);
  });

  after(async () => {
    if (app) {
      await cleanDatabase(app, [ownerId, collabId]);
      await app.close();
    }
  });

  it('is invisible to a stranger with 404 ApiErrorResponse envelope', async () => {
    const res = await request(httpServer)
      .get(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${collabToken}`)
      .expect(404);

    assertErrorResponse(res.body, 404);
  });

  it('invites a collaborator with READ permission by default and returns ApiSuccessResponse envelope', async () => {
    const res = await request(httpServer)
      .post(`/api/notes/${noteId}/invite`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ identifier: collabEmail })
      .expect(201);

    const collabItem = assertSuccessResponse<{
      permission: string;
      user: { id: string };
    }>(res.body);
    expect(collabItem.permission).to.equal('READ');
    expect(collabItem.user.id).to.equal(collabId);
  });

  it('lets the READ collaborator view but not edit the note and verifies ApiSuccessResponse envelope', async () => {
    const viewRes = await request(httpServer)
      .get(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${collabToken}`)
      .expect(200);

    const note = assertSuccessResponse<{ viewerRole: string }>(viewRes.body);
    expect(note.viewerRole).to.equal('read');

    const patchRes = await request(httpServer)
      .patch(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${collabToken}`)
      .send({ title: 'Unauthorized Edit' })
      .expect(404);

    assertErrorResponse(patchRes.body, 404);
  });

  it('lists the collaborator for the owner with ApiSuccessResponse envelope', async () => {
    const res = await request(httpServer)
      .get(`/api/notes/${noteId}/collaborators`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const list = assertSuccessResponse<{ user: { id: string } }[]>(res.body);
    expect(list).to.be.an('array');
    expect(list.some((c) => c.user.id === collabId)).to.be.true;
  });

  it('promotes the collaborator to WRITE and returns ApiSuccessResponse envelope', async () => {
    const res = await request(httpServer)
      .patch(`/api/notes/${noteId}/invite/${collabId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ permission: 'WRITE' })
      .expect(200);

    const updated = assertSuccessResponse<{ permission: string }>(res.body);
    expect(updated.permission).to.equal('WRITE');
  });

  it('lets the now-WRITE collaborator edit the note and returns ApiSuccessResponse envelope', async () => {
    const res = await request(httpServer)
      .patch(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${collabToken}`)
      .send({ title: 'Collaborator Edited Title' })
      .expect(200);

    const note = assertSuccessResponse<{ title: string }>(res.body);
    expect(note.title).to.equal('Collaborator Edited Title');
  });

  it('prevents the collaborator from deleting the note and returns ApiErrorResponse envelope', async () => {
    const res = await request(httpServer)
      .delete(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${collabToken}`)
      .expect(404);

    assertErrorResponse(res.body, 404);
  });

  it('removes the collaborator', async () => {
    await request(httpServer)
      .delete(`/api/notes/${noteId}/invite/${collabId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);
  });

  it('revokes the removed collaborator access entirely and returns ApiErrorResponse envelope', async () => {
    const res = await request(httpServer)
      .get(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${collabToken}`)
      .expect(404);

    assertErrorResponse(res.body, 404);
  });

  it('confirms the note appears under the owner\'s "owned" scope with ApiSuccessResponse envelope', async () => {
    const res = await request(httpServer)
      .get('/api/notes?scope=owned')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const page = assertSuccessResponse<{ data: { id: string }[] }>(res.body);
    expect(page.data.some((n) => n.id === noteId)).to.be.true;
  });
});
