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

describeIfDb('Search, filter & export/import flow (e2e)', function () {
  this.timeout(20000);
  let app: INestApplication;
  let httpServer: App;
  const ownerEmail = `e2e-se-owner-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`;
  let ownerToken: string;
  let ownerId: string;
  let note1Id: string;
  let note2Id: string;

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
      `se_owner_${Date.now()}`,
      'Search Export Owner',
    );
    ownerToken = owner.accessToken;
    ownerId = owner.userId;

    const res1 = await request(httpServer)
      .post('/api/notes')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Backend Architecture',
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'NestJS and Prisma setup guide' },
              ],
            },
          ],
        },
        tags: ['backend', 'nestjs'],
        isPinned: true,
      })
      .expect(201);
    const n1 = assertSuccessResponse<UnknownRecord>(res1.body);
    note1Id = String(n1.id);

    const res2 = await request(httpServer)
      .post('/api/notes')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Frontend Architecture',
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Next.js app router and Tailwind UI' },
              ],
            },
          ],
        },
        tags: ['frontend', 'react'],
        isFavorite: true,
      })
      .expect(201);
    const n2 = assertSuccessResponse<UnknownRecord>(res2.body);
    note2Id = String(n2.id);
  });

  after(async () => {
    if (app) {
      await cleanDatabase(app, [ownerId]);
      await app.close();
    }
  });

  it('GET /notes?search delegates to search with ApiSuccessResponse envelope', async () => {
    const res = await request(httpServer)
      .get('/api/notes?search=Backend')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const page = assertSuccessResponse<{ data: UnknownRecord[] }>(res.body);
    expect(page.data).to.have.lengthOf(1);
    expect(page.data[0].id).to.equal(note1Id);
  });

  it('filters notes by tag via the main list endpoint', async () => {
    const res = await request(httpServer)
      .get('/api/notes?tags=frontend')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const page = assertSuccessResponse<{ data: UnknownRecord[] }>(res.body);
    expect(page.data).to.have.lengthOf(1);
    expect(page.data[0].id).to.equal(note2Id);
  });

  it('POST /notes/export (json) returns a downloadable JSON array', async () => {
    const res = await request(httpServer)
      .post('/api/notes/export')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ format: 'json' })
      .expect(200);

    expect(res.headers['content-type']).to.include('application/json');
    expect(res.headers['content-disposition']).to.include('attachment');

    const notes = res.body as UnknownRecord[];
    expect(notes).to.be.an('array');
    expect(notes.length).to.be.at.least(2);
  });

  it('POST /notes/export (markdown) returns concatenated markdown', async () => {
    const res = await request(httpServer)
      .post('/api/notes/export')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ format: 'markdown', noteIds: [note1Id] })
      .expect(200);

    expect(res.headers['content-type']).to.include('text/markdown');
    expect(res.text).to.include('# Backend Architecture');
  });

  it('POST /notes/import creates notes from a JSON payload', async () => {
    const jsonContent = JSON.stringify([
      {
        title: 'Imported Note 1',
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Content 1' }],
            },
          ],
        },
        tags: ['imported'],
      },
      {
        title: 'Imported Note 2',
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Content 2' }],
            },
          ],
        },
      },
    ]);

    const res = await request(httpServer)
      .post('/api/notes/import')
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('files', Buffer.from(jsonContent), 'notes.json')
      .expect(200);

    const summary = assertSuccessResponse<{
      created: number;
      failed: unknown[];
    }>(res.body);
    expect(summary.created).to.equal(2);
    expect(summary.failed).to.have.lengthOf(0);
  });

  it('POST /notes/import creates a note from a Markdown file', async () => {
    const mdContent = '# MD Import Note\n\nSome body text here.';

    const res = await request(httpServer)
      .post('/api/notes/import')
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('files', Buffer.from(mdContent), 'project-spec.md')
      .expect(200);

    const summary = assertSuccessResponse<{
      created: number;
      failed: number;
    }>(res.body);
    expect(summary.created).to.equal(1);
  });

  it('POST /notes/bulk toggles favorite status for multiple notes', async () => {
    const res = await request(httpServer)
      .post('/api/notes/bulk')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        action: 'favorite',
        noteIds: [note1Id, note2Id],
      })
      .expect(200);

    const result = assertSuccessResponse<{ affected: number }>(res.body);
    expect(result.affected).to.equal(2);
  });

  it('POST /notes/bulk deletes multiple notes at once and returns ApiSuccessResponse envelope', async () => {
    const res = await request(httpServer)
      .post('/api/notes/bulk')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        action: 'delete',
        noteIds: [note1Id, note2Id],
      })
      .expect(200);

    const result = assertSuccessResponse<{ affected: number }>(res.body);
    expect(result.affected).to.equal(2);

    const checkRes = await request(httpServer)
      .get(`/api/notes/${note1Id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(404);

    assertErrorResponse(checkRes.body, 404);
  });
});
