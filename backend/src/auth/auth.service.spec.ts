import { expect } from 'chai';
import * as sinon from 'sinon';
import { hash as argon2Hash } from '@node-rs/argon2';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { PinoLogger } from 'nestjs-pino';
import type { Response } from 'express';
import { AuthService } from './auth.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { TokenService } from '../token/token.service.js';

type MockStub = sinon.SinonStub;

interface PrismaMock {
  user: {
    findUnique: MockStub;
    findFirst: MockStub;
    findMany: MockStub;
    create: MockStub;
    update: MockStub;
  };
  refreshToken: {
    findUnique: MockStub;
    create: MockStub;
    delete: MockStub;
    deleteMany: MockStub;
  };
  $transaction: MockStub;
  sanitizeUser: (u: Record<string, unknown>) => Record<string, unknown>;
}

interface TokensMock {
  signAccessToken: MockStub;
  signRefreshToken: MockStub;
  verifyRefreshToken: MockStub;
}

describe('AuthService', () => {
  let authService: AuthService;
  let prismaMock: PrismaMock;
  let tokensMock: TokensMock;
  let configMock: { get: MockStub };
  let loggerMock: {
    info: MockStub;
    warn: MockStub;
    error: MockStub;
    setContext: MockStub;
  };
  let sandbox: sinon.SinonSandbox;

  const baseUser = {
    id: 'User786',
    email: 'user786@example.com',
    username: 'user786',
    name: 'User 786',
    passwordHash: 'hashed-password',
  };

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    prismaMock = {
      user: {
        findUnique: sandbox.stub(),
        findFirst: sandbox.stub(),
        findMany: sandbox.stub(),
        create: sandbox.stub(),
        update: sandbox.stub(),
      },
      refreshToken: {
        findUnique: sandbox.stub(),
        create: sandbox.stub(),
        delete: sandbox.stub(),
        deleteMany: sandbox.stub(),
      },
      $transaction: sandbox
        .stub()
        .callsFake(async (promises) => Promise.all(promises)),
      sanitizeUser: (u: Record<string, unknown>) => {
        const copy = { ...u };
        delete copy.passwordHash;
        return copy;
      },
    };

    tokensMock = {
      signAccessToken: sandbox.stub().resolves('mock-access-token'),
      signRefreshToken: sandbox.stub().resolves('mock-refresh-token'),
      verifyRefreshToken: sandbox
        .stub()
        .resolves({ sub: 'User786', email: 'user786@example.com' }),
    };

    configMock = {
      get: sandbox.stub().returns('7d'),
    };

    loggerMock = {
      info: sandbox.stub(),
      warn: sandbox.stub(),
      error: sandbox.stub(),
      setContext: sandbox.stub(),
    };

    authService = new AuthService(
      prismaMock as unknown as PrismaService,
      tokensMock as unknown as TokenService,
      configMock as unknown as ConfigService,
      loggerMock as unknown as PinoLogger,
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('signUp', () => {
    it('registers user and returns sanitized SafeUser', async () => {
      prismaMock.user.findFirst.resolves(null);
      prismaMock.user.create.resolves(baseUser);

      const res = await authService.signUp({
        email: 'user786@example.com',
        username: 'user786',
        password: 'Password123',
      });

      expect(res.email).to.equal('user786@example.com');
      expect(res.username).to.equal('user786');
      expect((res as Record<string, unknown>).passwordHash).to.be.undefined;
    });

    it('throws ConflictException if email or username is taken', async () => {
      prismaMock.user.findFirst.resolves(baseUser);

      let err: unknown;
      try {
        await authService.signUp({
          email: 'user786@example.com',
          username: 'user786',
          password: 'Password123',
        });
      } catch (e) {
        err = e;
      }

      expect(err).to.be.instanceOf(ConflictException);
    });
  });

  describe('login', () => {
    it('authenticates user and returns sanitized SafeUser', async () => {
      const hashed = await argon2Hash('Password123');
      const userWithHash = { ...baseUser, passwordHash: hashed };
      prismaMock.user.findFirst.resolves(userWithHash);

      const res = await authService.login({
        identifier: 'user786',
        password: 'Password123',
      });

      expect(res.email).to.equal('user786@example.com');
      expect(res.id).to.equal('User786');
    });

    it('throws UnauthorizedException for invalid credentials', async () => {
      prismaMock.user.findFirst.resolves(null);

      let err: unknown;
      try {
        await authService.login({
          identifier: 'wrong@example.com',
          password: 'Password123',
        });
      } catch (e) {
        err = e;
      }

      expect(err).to.be.instanceOf(UnauthorizedException);
    });
  });

  describe('issueAndSetAuthCookies', () => {
    it('issues access and refresh tokens and sets cookies on response', async () => {
      prismaMock.refreshToken.create.resolves({});
      const cookieStub = sandbox.stub();
      const mockRes = { cookie: cookieStub } as unknown as Response;

      await authService.issueAndSetAuthCookies(
        {
          id: 'User786',
          email: 'user786@example.com',
          username: 'user786',
        },
        mockRes,
      );

      expect(tokensMock.signAccessToken.calledOnce).to.be.true;
      expect(tokensMock.signRefreshToken.calledOnce).to.be.true;
      expect(cookieStub.calledTwice).to.be.true;
    });
  });

  describe('refreshTokens', () => {
    it('deduplicates concurrent refresh calls for the same token', async () => {
      const tokenRecord = {
        id: 'token-1',
        userId: 'User786',
        tokenHash: 'some-hash',
        expiresAt: new Date(Date.now() + 100000),
      };
      prismaMock.refreshToken.findUnique.resolves(tokenRecord);
      prismaMock.user.findUnique.resolves(baseUser);
      prismaMock.refreshToken.delete.resolves({});
      prismaMock.refreshToken.create.resolves({});

      const [res1, res2] = await Promise.all([
        authService.refreshTokens('same-token-string'),
        authService.refreshTokens('same-token-string'),
      ]);

      expect(res1.user.id).to.equal('User786');
      expect(res2.user.id).to.equal('User786');
      expect(prismaMock.refreshToken.delete.callCount).to.equal(1);
    });
  });

  describe('listUsers', () => {
    it('returns a list of other users projecting only id, username, and name', async () => {
      prismaMock.user.findMany.resolves([
        { id: 'u-2', username: 'user2', name: 'User Two' },
      ]);
      const result = await authService.listUsers('u-1');
      expect(result).to.have.length(1);
      expect(result[0].username).to.equal('user2');
      expect((result[0] as Record<string, unknown>).email).to.be.undefined;
    });
  });
});
