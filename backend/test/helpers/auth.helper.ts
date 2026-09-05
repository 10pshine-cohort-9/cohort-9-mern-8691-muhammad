process.env.NODE_ENV = process.env.NODE_ENV || 'test';

import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { assertSuccessResponse } from './api-types.js';
import type { SafeUser } from '../../src/auth/auth.types.js';

export async function createVerifiedUser(
  app: INestApplication,
  email: string,
  password = 'Password123',
  username = `user_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
  name = 'Test User',
): Promise<{ accessToken: string; userId: string }> {
  const httpServer = app.getHttpServer() as App;
  const signUpRes = await request(httpServer)
    .post('/api/auth/sign-up')
    .send({ email, username, password, name })
    .expect(201);

  const payload = assertSuccessResponse<SafeUser>(signUpRes.body);

  const setCookieHeaders = (signUpRes.headers['set-cookie'] ??
    []) as unknown as string[];
  let accessToken = '';
  for (const c of setCookieHeaders) {
    if (c.startsWith('accessToken=')) {
      accessToken = c.slice('accessToken='.length).split(';')[0];
    }
  }

  return {
    accessToken,
    userId: payload.id,
  };
}

export async function cleanDatabase(
  app: INestApplication,
  userIds: string[],
): Promise<void> {
  if (!userIds || userIds.length === 0) return;
  const prisma = app.get(PrismaService);
  const validIds = userIds.filter(Boolean);
  if (validIds.length === 0) return;

  try {
    await prisma.notification.deleteMany({
      where: { userId: { in: validIds } },
    });
    await prisma.noteCollaborator.deleteMany({
      where: {
        OR: [
          { userId: { in: validIds } },
          { note: { ownerId: { in: validIds } } },
        ],
      },
    });
    await prisma.noteVersion.deleteMany({
      where: { note: { ownerId: { in: validIds } } },
    });
    await prisma.note.deleteMany({
      where: { ownerId: { in: validIds } },
    });
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: validIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: validIds } },
    });
  } catch {
    // Ignore cleanup errors to ensure test runner finishes cleanly
  }
}
