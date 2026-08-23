import type { CookieOptions, Response } from 'express';
import type { AuthTokens } from '../../auth/auth.types.js';

export const AUTH_COOKIE_NAMES = {
  ACCESS: 'accessToken',
  REFRESH: 'refreshToken',
} as const;

export const AUTH_COOKIE_EXPIRATION = {
  ACCESS_MS: 15 * 60 * 1000, // 15 minutes
  REFRESH_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;

/**
 * This is our single source of truth for token cookies options.
 */
export function getAuthCookieOptions(
  type: 'access' | 'refresh',
): CookieOptions {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge:
      type === 'access'
        ? AUTH_COOKIE_EXPIRATION.ACCESS_MS
        : AUTH_COOKIE_EXPIRATION.REFRESH_MS,
  };
}

/**
 * This sets our auth cookies on respective Response object, uses the above options for both cookies.
 */
export function setAuthCookies(res: Response, tokens: AuthTokens): void {
  res.cookie(
    AUTH_COOKIE_NAMES.ACCESS,
    tokens.accessToken,
    getAuthCookieOptions('access'),
  );
  res.cookie(
    AUTH_COOKIE_NAMES.REFRESH,
    tokens.refreshToken,
    getAuthCookieOptions('refresh'),
  );
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAMES.ACCESS, { path: '/' });
  res.clearCookie(AUTH_COOKIE_NAMES.REFRESH, { path: '/' });
}
