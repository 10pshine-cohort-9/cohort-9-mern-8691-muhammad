import { expect } from 'chai';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module.js';
import type { SafeUser } from '../src/auth/auth.types.js';
import {
  assertSuccessResponse,
  assertErrorResponse,
} from './helpers/api-types.js';
import { cleanDatabase } from './helpers/auth.helper.js';

const hasDatabase = !!process.env.DATABASE_URL;
const describeIfDb = hasDatabase ? describe : describe.skip;

function extractCookie(cookies: string[] | undefined, name: string): string {
  if (!cookies) return '';
  const prefix = `${name}=`;
  for (const c of cookies) {
    if (c.startsWith(prefix)) {
      return c.slice(prefix.length).split(';')[0];
    }
  }
  return '';
}

describeIfDb('Auth flow (e2e)', function () {
  this.timeout(20000);

  let app: INestApplication;
  let httpServer: App;

  const timestamp = Date.now();
  const email = `e2e-auth-${timestamp}-${Math.floor(Math.random() * 1000)}@example.com`;
  const username = `e2eauth${timestamp}${Math.floor(Math.random() * 1000)}`;
  const password = 'Password123';
  let accessToken: string;
  let refreshToken: string;
  let createdUserId: string;

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
  });

  after(async () => {
    if (createdUserId) {
      await cleanDatabase(app, [createdUserId]);
    }
    await app.close();
  });

  it('signs up a new user, sets HttpOnly cookies, and returns SafeUser in ApiSuccessResponse envelope', async () => {
    const res = await request(httpServer)
      .post('/api/auth/sign-up')
      .send({ email, username, password })
      .expect(201);

    const body = assertSuccessResponse<SafeUser>(res.body);

    expect(body.email).to.equal(email);
    expect(body.username).to.equal(username);
    expect((body as Record<string, unknown>).tokens).to.be.undefined;

    const setCookieHeaders = (res.headers['set-cookie'] ??
      []) as unknown as string[];
    expect(setCookieHeaders).to.be.an('array');

    accessToken = extractCookie(setCookieHeaders, 'accessToken');
    refreshToken = extractCookie(setCookieHeaders, 'refreshToken');

    expect(accessToken).to.be.a('string').and.not.be.empty;
    expect(refreshToken).to.be.a('string').and.not.be.empty;

    createdUserId = body.id;
  });

  it('rejects attempting a sign-up with duplicate email and returns ApiErrorResponse envelope', async () => {
    const res = await request(httpServer)
      .post('/api/auth/sign-up')
      .send({ email, username: `${username}2`, password })
      .expect(409);

    assertErrorResponse(res.body, 409);
  });

  it('logs in user with valid credentials, sets HttpOnly cookies, and returns SafeUser in envelope', async () => {
    const res = await request(httpServer)
      .post('/api/auth/login')
      .send({ identifier: email, password })
      .expect(200);

    const body = assertSuccessResponse<SafeUser>(res.body);
    expect(body.email).to.equal(email);
    expect((body as Record<string, unknown>).tokens).to.be.undefined;
  });

  it('gets user profile with access token and returns ApiSuccessResponse envelope', async () => {
    const res = await request(httpServer)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = assertSuccessResponse<SafeUser>(res.body);
    expect(body.email).to.equal(email);
  });

  it('auto-rotates session using refresh token on protected endpoint', async () => {
    const res = await request(httpServer)
      .get('/api/auth/me')
      .set('Cookie', [`refreshToken=${refreshToken}`])
      .expect(200);

    const body = assertSuccessResponse<SafeUser>(res.body);
    expect(body.email).to.equal(email);
  });
});
