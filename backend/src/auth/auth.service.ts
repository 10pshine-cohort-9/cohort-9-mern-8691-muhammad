import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import ms, { type StringValue } from 'ms';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2';
import { createHash } from 'node:crypto';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';
import { TokenService } from '../token/token.service.js';
import { setAuthCookies } from '../common/utils/cookies.util.js';
import type {
  SignUpInput,
  LoginInput,
  ChangePasswordInput,
  UpdateProfileInput,
  SafeUser,
  AuthTokens,
} from './auth.types.js';

@Injectable()
export class AuthService {
  private readonly refreshExpiresInMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly config: ConfigService,
    @InjectPinoLogger(AuthService.name) private readonly logger: PinoLogger,
  ) {
    const refreshExpiresInStr =
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';
    this.refreshExpiresInMs =
      ms(refreshExpiresInStr as StringValue) ?? 7 * 24 * 60 * 60 * 1000;
  }

  async signUp(input: SignUpInput): Promise<SafeUser> {
    const email = input.email.toLowerCase().trim();
    const username = input.username.trim();

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existing) {
      if (existing.email === email) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }
      throw new ConflictException('Username is already taken');
    }

    const passwordHash = await argon2Hash(input.password);
    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        name: input.name?.trim() ?? null,
        passwordHash,
      },
    });

    this.logger.info({ userId: user.id }, 'User registered successfully');
    return this.prisma.sanitizeUser(user);
  }

  async login(input: LoginInput): Promise<SafeUser> {
    const identifier = input.identifier.toLowerCase().trim();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await argon2Verify(
      user.passwordHash,
      input.password,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    this.logger.info({ userId: user.id }, 'User logged in');
    return this.prisma.sanitizeUser(user);
  }

  async issueAndSetAuthCookies(user: SafeUser, res: Response): Promise<void> {
    const tokens = await this.issueTokens(user.id, user.email);
    setAuthCookies(res, tokens);
  }

  async getProfile(userId: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.prisma.sanitizeUser(user);
  }

  async updateProfile(
    userId: string,
    input: UpdateProfileInput,
  ): Promise<SafeUser> {
    if (input.username) {
      const existing = await this.prisma.user.findFirst({
        where: {
          username: input.username,
          NOT: { id: userId },
        },
      });
      if (existing) {
        throw new ConflictException('Username is already taken');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        username: input.username?.trim(),
        name: input.name !== undefined ? input.name.trim() || null : undefined,
      },
    });
    return this.prisma.sanitizeUser(user);
  }

  async changePassword(
    userId: string,
    input: ChangePasswordInput,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isMatch = await argon2Verify(
      user.passwordHash,
      input.currentPassword,
    );
    if (!isMatch) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await argon2Hash(input.newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.deleteMany({
        where: { userId },
      }),
    ]);

    return { message: 'Password updated successfully' };
  }

  async refreshTokens(
    refreshToken: string,
  ): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    const payload = await this.tokens.verifyRefreshToken(refreshToken);
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (
      tokenRecord?.userId !== payload.sub ||
      tokenRecord.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    await this.prisma.refreshToken.delete({ where: { id: tokenRecord.id } });
    const tokens = await this.issueTokens(user.id, user.email);
    return { user: this.prisma.sanitizeUser(user), tokens };
  }

  async logout(
    userId: string,
    refreshToken?: string,
  ): Promise<{ message: string }> {
    if (refreshToken) {
      const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
      await this.prisma.refreshToken.deleteMany({
        where: { userId, tokenHash },
      });
    }
    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string): Promise<{ message: string }> {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    return { message: 'Logged out from all devices successfully' };
  }

  async listUsers(currentUserId: string): Promise<SafeUser[]> {
    const users = await this.prisma.user.findMany({
      where: {
        id: { not: currentUserId },
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
      },
      orderBy: { username: 'asc' },
    });
    return users;
  }

  private async issueTokens(
    userId: string,
    email: string,
  ): Promise<AuthTokens> {
    const accessToken = await this.tokens.signAccessToken({
      sub: userId,
      email,
    });
    const refreshToken = await this.tokens.signRefreshToken({
      sub: userId,
      email,
    });

    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId,
        expiresAt: new Date(Date.now() + this.refreshExpiresInMs),
      },
    });

    return { accessToken, refreshToken };
  }
}
