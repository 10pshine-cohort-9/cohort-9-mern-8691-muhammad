import { expect } from 'chai';
import * as sinon from 'sinon';
import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import type { TokenService } from '../../token/token.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthService } from '../../auth/auth.service.js';
import type { SafeUser } from '../../auth/auth.types.js';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let tokenServiceMock: { verifyAccessToken: sinon.SinonStub };
  let prismaMock: {
    user: { findUnique: sinon.SinonStub };
    sanitizeUser: sinon.SinonStub;
  };
  let authServiceMock: { refreshTokens: sinon.SinonStub };
  let sandbox: sinon.SinonSandbox;

  const mockUser: SafeUser = {
    id: 'user-1',
    email: 'user1@example.com',
    username: 'user1',
  };

  const createMockContext = (
    cookies: Record<string, string> = {},
    headers: Record<string, string> = {},
  ): { context: ExecutionContext; req: Request; res: Response } => {
    const req = {
      cookies,
      headers,
      user: undefined,
    } as unknown as Request;

    const res = {
      cookie: sinon.stub(),
    } as unknown as Response;

    const context = {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as unknown as ExecutionContext;

    return { context, req, res };
  };

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    tokenServiceMock = { verifyAccessToken: sandbox.stub() };
    prismaMock = {
      user: { findUnique: sandbox.stub() },
      sanitizeUser: sandbox.stub().callsFake((u) => u),
    };
    authServiceMock = { refreshTokens: sandbox.stub() };

    guard = new JwtAuthGuard(
      tokenServiceMock as unknown as TokenService,
      prismaMock as unknown as PrismaService,
      authServiceMock as unknown as AuthService,
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('authenticates request with valid access token from cookie', async () => {
    const { context, req } = createMockContext({ accessToken: 'valid-token' });
    tokenServiceMock.verifyAccessToken.resolves({ sub: 'user-1' });
    prismaMock.user.findUnique.resolves(mockUser);

    const result = await guard.canActivate(context);

    expect(result).to.be.true;
    expect((req as unknown as { user: SafeUser }).user).to.deep.equal(mockUser);
  });

  it('authenticates request with valid access token from Authorization header', async () => {
    const { context, req } = createMockContext(
      {},
      { authorization: 'Bearer header-token' },
    );
    tokenServiceMock.verifyAccessToken.resolves({ sub: 'user-1' });
    prismaMock.user.findUnique.resolves(mockUser);

    const result = await guard.canActivate(context);

    expect(result).to.be.true;
    expect((req as unknown as { user: SafeUser }).user).to.deep.equal(mockUser);
  });

  it('throws UnauthorizedException when valid access token belongs to a deleted user', async () => {
    const { context } = createMockContext({ accessToken: 'valid-token' });
    tokenServiceMock.verifyAccessToken.resolves({ sub: 'deleted-user' });
    prismaMock.user.findUnique.resolves(null);

    let error: unknown;
    try {
      await guard.canActivate(context);
    } catch (err) {
      error = err;
    }

    expect(error).to.be.instanceOf(UnauthorizedException);
    expect((error as UnauthorizedException).message).to.equal('User not found');
  });

  it('rotates session using refresh token when access token is expired', async () => {
    const { context, req, res } = createMockContext({
      accessToken: 'expired-token',
      refreshToken: 'valid-refresh-token',
    });
    tokenServiceMock.verifyAccessToken.rejects(new Error('Expired'));
    authServiceMock.refreshTokens.resolves({
      user: mockUser,
      tokens: { accessToken: 'new-acc', refreshToken: 'new-ref' },
    });

    const result = await guard.canActivate(context);

    expect(result).to.be.true;
    expect((req as unknown as { user: SafeUser }).user).to.deep.equal(mockUser);
    expect((res.cookie as sinon.SinonStub).called).to.be.true;
  });

  it('throws UnauthorizedException when both tokens are missing', async () => {
    const { context } = createMockContext({}, {});

    let error: unknown;
    try {
      await guard.canActivate(context);
    } catch (err) {
      error = err;
    }

    expect(error).to.be.instanceOf(UnauthorizedException);
    expect((error as UnauthorizedException).message).to.equal(
      'JWT token is missing',
    );
  });
});
