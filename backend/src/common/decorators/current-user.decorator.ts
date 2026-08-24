import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { SafeUser } from '../../auth/auth.types.js';
import type { Request } from 'express';

/**
 * Custom parameter decorator retrieving the authenticated user attached to the HTTP request context.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SafeUser | undefined => {
    const request: Request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
