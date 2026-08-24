import * as z from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/\d/, 'Password must contain a digit');

const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(
    /^\w+$/,
    'Username can only contain letters, numbers, and underscores',
  );

const nameSchema = z.string().trim().max(100);

export const signUpSchema = z.object({
  email: z.email('Please enter a valid email address'),
  username: usernameSchema,
  name: nameSchema.min(1, 'Name cannot be empty').optional(),
  password: passwordSchema,
});

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  username: usernameSchema.optional(),
  name: nameSchema.optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

export const logoutSchema = z.object({
  refreshToken: z.string().optional(),
});

export const safeUserSchema = z.object({
  id: z.string(),
  email: z.email(),
  username: z.string(),
  name: nameSchema.nullable().optional(),
});

export const userListItemSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string().nullable().optional(),
});
