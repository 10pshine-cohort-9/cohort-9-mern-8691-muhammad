import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { TokenService } from '../../token/token.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthService } from '../../auth/auth.service.js';
import { AUTH_COOKIE_NAMES, setAuthCookies } from '../utils/cookies.util.js';

/**
 * It verifies the user with available access token as well as, on invalid access token, can
 * auto rotate the tokens if refresh token is valid, attaching the authenticated user to the request object.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const accessToken =
      (request.cookies?.[AUTH_COOKIE_NAMES.ACCESS] as string | undefined) ||
      this.extractBearerToken(request);

    if (accessToken) {
      try {
        const payload = await this.tokenService.verifyAccessToken(accessToken);
        const user = await this.prisma.user.findUnique({
          where: { id: payload.sub },
        });
        if (!user) {
          throw new UnauthorizedException('User not found');
        }
        request.user = this.prisma.sanitizeUser(user);
        return true;
      } catch (err) {
        if (
          err instanceof UnauthorizedException &&
          err.message === 'User not found'
        ) {
          throw err;
        }
        // If access token is expired then we go for token rotation using
        // refresh token and logging that is not necessary here
      }
    }

    const refreshToken = request.cookies?.[AUTH_COOKIE_NAMES.REFRESH] as
      string | undefined;

    if (refreshToken) {
      try {
        const { user, tokens } =
          await this.authService.refreshTokens(refreshToken);

        setAuthCookies(response, tokens);

        request.user = user;
        return true;
      } catch {
        throw new UnauthorizedException(
          'Session expired. Please log in again.',
        );
      }
    }

    throw new UnauthorizedException('JWT token is missing');
  }

  /**
   * Extracts the JWT token from the request Authorization header.
   */
  private extractBearerToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return null;
    }
    return header.slice('Bearer '.length).trim() || null;
  }
}
