import { createZodDto } from 'nestjs-zod';
import {
  changePasswordSchema,
  loginSchema,
  logoutSchema,
  safeUserSchema,
  signUpSchema,
  updateProfileSchema,
  userListResponseSchema,
} from './auth.schemas.js';

export class LoginDto extends createZodDto(loginSchema) {}
export class SignUpDto extends createZodDto(signUpSchema) {}
export class UpdateProfileDto extends createZodDto(updateProfileSchema) {}
export class ChangePasswordDto extends createZodDto(changePasswordSchema) {}
export class LogoutDto extends createZodDto(logoutSchema) {}
export class SafeUserResponseDto extends createZodDto(safeUserSchema) {}
export class UserListResponseDto extends createZodDto(userListResponseSchema) {}
