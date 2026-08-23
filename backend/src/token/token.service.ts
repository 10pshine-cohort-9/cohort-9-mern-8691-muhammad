import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { errors as joseErrors, jwtVerify, SignJWT } from 'jose';
import { randomUUID } from 'node:crypto';

export interface JwtPayload {
  sub: string;
  email: string;
}

type TokenKind = 'access' | 'refresh';

/**
 * TokenService handles JWT signing and verification.
 * Secret keys and expiration settings are cached at instance creation.
 */
@Injectable()
export class TokenService {
  private readonly accessTokenSecret: Uint8Array;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenSecret: Uint8Array;
  private readonly refreshTokenExpiry: string;

  constructor(private readonly config: ConfigService) {
    this.accessTokenSecret = this.initializeSecretForKind('access');
    this.refreshTokenSecret = this.initializeSecretForKind('refresh');
    this.accessTokenExpiry =
      this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';
    this.refreshTokenExpiry =
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';
  }

  async signAccessToken(payload: JwtPayload): Promise<string> {
    return this.sign(payload, 'access', this.accessTokenExpiry);
  }

  async signRefreshToken(payload: JwtPayload): Promise<string> {
    return this.sign(payload, 'refresh', this.refreshTokenExpiry);
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    return this.verify(token, 'access');
  }

  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    return this.verify(token, 'refresh');
  }

  private async sign(
    payload: JwtPayload,
    kind: TokenKind,
    expiresIn: string,
  ): Promise<string> {
    return new SignJWT({
      email: payload.email,
      tokenKind: kind,
      jti: randomUUID(),
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(payload.sub)
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(this.getSecretForKind(kind));
  }

  private async verify(token: string, kind: TokenKind): Promise<JwtPayload> {
    const secret = this.getSecretForKind(kind);
    try {
      const { payload } = await jwtVerify(token, secret);

      if (
        typeof payload.sub !== 'string' ||
        typeof payload.email !== 'string'
      ) {
        throw new UnauthorizedException('Corrupted token payload');
      }

      if (payload.tokenKind !== kind) {
        throw new UnauthorizedException('Invalid token');
      }

      return {
        sub: payload.sub,
        email: payload.email,
      };
    } catch (err) {
      if (err instanceof joseErrors.JWTExpired) {
        throw new UnauthorizedException('Token has expired');
      }
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  private initializeSecretForKind(kind: TokenKind): Uint8Array {
    const key = kind === 'access' ? 'JWT_ACCESS_SECRET' : 'JWT_REFRESH_SECRET';
    const fallback =
      kind === 'access'
        ? 'default-notes-access-secret-32-chars-min'
        : 'default-notes-refresh-secret-32-chars-min';
    const secret = this.config.get<string>(key) ?? fallback;
    return new TextEncoder().encode(secret);
  }

  private getSecretForKind(kind: TokenKind): Uint8Array {
    return kind === 'access' ? this.accessTokenSecret : this.refreshTokenSecret;
  }
}
