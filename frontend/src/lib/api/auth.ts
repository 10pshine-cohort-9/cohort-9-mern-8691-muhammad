import { request } from './client';
import {
  safeUserSchema,
  messageResponseSchema,
  userListResponseSchema,
  type AuthUser,
  type ChangePasswordInput,
  type LoginInput,
  type MessageResponse,
  type SignUpInput,
  type UpdateProfileInput,
  type UserListItem,
} from '../schemas';

export const authApi = {
  signUp: (data: SignUpInput): Promise<AuthUser> =>
    request('/auth/sign-up', safeUserSchema, {
      method: 'POST',
      body: JSON.stringify(data),
      auth: false,
    }),

  login: (data: LoginInput): Promise<AuthUser> =>
    request('/auth/login', safeUserSchema, {
      method: 'POST',
      body: JSON.stringify(data),
      auth: false,
    }),

  me: (): Promise<AuthUser> => request('/auth/me', safeUserSchema),

  updateProfile: (data: UpdateProfileInput): Promise<AuthUser> =>
    request('/auth/me', safeUserSchema, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  changePassword: (data: ChangePasswordInput): Promise<MessageResponse> =>
    request('/auth/change-password', messageResponseSchema, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  logout: (refreshToken?: string): Promise<MessageResponse> =>
    request('/auth/logout', messageResponseSchema, {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  logoutAll: (): Promise<MessageResponse> =>
    request('/auth/logout-all', messageResponseSchema, {
      method: 'POST',
    }),

  listUsers: (): Promise<UserListItem[]> =>
    request('/auth/users', userListResponseSchema),
};
