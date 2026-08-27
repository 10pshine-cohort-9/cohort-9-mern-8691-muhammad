import { expect } from 'chai';
import sinon from 'sinon';
import { decodeJwt, SignJWT } from 'jose';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { type JwtPayload, TokenService } from './token.service.js';

describe('TokenService', () => {
  let service: TokenService;
  let configGet: sinon.SinonStub;

  const ACCESS_SECRET = 'i-am-test-access-secret-key-32-chars-long!';
  const REFRESH_SECRET = 'i-am-test-refresh-secret-key-32-chars-long!';

  const testPayload: JwtPayload = {
    sub: 'User786',
    email: 'user786@example.com',
  };

  beforeEach(() => {
    configGet = sinon.stub();
    configGet.withArgs('JWT_ACCESS_SECRET').returns(ACCESS_SECRET);
    configGet.withArgs('JWT_REFRESH_SECRET').returns(REFRESH_SECRET);

    const config = {
      get: configGet,
    } as unknown as ConfigService;

    service = new TokenService(config);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('TokenService.Initialization', () => {
    it('throws error when access secret is missing or shorter than 32 chars', () => {
      const badConfig = {
        get: sinon
          .stub()
          .callsFake((k: string) =>
            k === 'JWT_ACCESS_SECRET' ? 'short' : REFRESH_SECRET,
          ),
      } as unknown as ConfigService;
      expect(() => new TokenService(badConfig)).to.throw(
        'JWT_ACCESS_SECRET must be set and at least 32 characters long',
      );
    });

    it('throws error when refresh secret is missing or shorter than 32 chars', () => {
      const badConfig = {
        get: sinon
          .stub()
          .callsFake((k: string) =>
            k === 'JWT_ACCESS_SECRET' ? ACCESS_SECRET : 'short',
          ),
      } as unknown as ConfigService;
      expect(() => new TokenService(badConfig)).to.throw(
        'JWT_REFRESH_SECRET must be set and at least 32 characters long',
      );
    });
  });

  describe('TokenService.SignAccessToken', () => {
    it('should sign and verify valid access token', async () => {
      const token = await service.signAccessToken(testPayload);
      expect(token).to.be.a('string');
      const result = await service.verifyAccessToken(token);
      expect(result).to.deep.equal(testPayload);
    });

    it('should use configured access token expiration', async () => {
      configGet.withArgs('JWT_ACCESS_EXPIRES_IN').returns('1h');
      const customService = new TokenService({
        get: configGet,
      } as unknown as ConfigService);
      const token = await customService.signAccessToken(testPayload);
      const decoded = decodeJwt(token);
      expect(decoded.exp! - decoded.iat!).to.equal(3600);
    });
  });

  describe('TokenService.SignRefreshToken', () => {
    it('should sign and verify valid refresh token', async () => {
      const token = await service.signRefreshToken(testPayload);
      expect(token).to.be.a('string');
      const result = await service.verifyRefreshToken(token);
      expect(result).to.deep.equal(testPayload);
    });
  });

  describe('TokenService.VerifyAccessToken', () => {
    it('should reject an expired access token', async () => {
      const now = Math.floor(Date.now() / 1000);
      const token = await new SignJWT({
        email: testPayload.email,
        tokenKind: 'access',
      })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setSubject(testPayload.sub)
        .setIssuedAt(now - 120)
        .setExpirationTime(now - 60)
        .sign(new TextEncoder().encode(ACCESS_SECRET));

      let error: unknown;
      try {
        await service.verifyAccessToken(token);
      } catch (err) {
        error = err;
      }

      expect(error).to.be.instanceOf(UnauthorizedException);
      expect((error as UnauthorizedException).message).to.equal(
        'Token has expired',
      );
    });

    it('should reject a corrupted token string', async () => {
      let error: unknown;
      try {
        await service.verifyAccessToken('hello');
      } catch (err) {
        error = err;
      }

      expect(error).to.be.instanceOf(UnauthorizedException);
      expect((error as UnauthorizedException).message).to.equal(
        'Invalid token',
      );
    });
  });
});
