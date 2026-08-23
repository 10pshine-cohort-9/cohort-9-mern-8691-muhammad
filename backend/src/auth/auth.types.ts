import * as z from 'zod';
import {
  changePasswordSchema,
  loginSchema,
  logoutSchema,
  safeUserSchema,
  signUpSchema,
  updateProfileSchema,
} from './auth.schemas.js';

export type LoginInput = z.infer<typeof loginSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type SafeUser = z.infer<typeof safeUserSchema>;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
