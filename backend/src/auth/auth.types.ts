import * as z from 'zod';
import {
  authResponseSchema,
  authTokensSchema,
  changePasswordSchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  safeUserSchema,
  signUpSchema,
  updateProfileSchema,
} from './auth.schemas.js';

export type LoginInput = z.infer<typeof loginSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type AuthTokens = z.infer<typeof authTokensSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type SafeUser = z.infer<typeof safeUserSchema>;
