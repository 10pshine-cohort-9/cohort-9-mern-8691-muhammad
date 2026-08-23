import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { type Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { clearAuthCookies } from '../utils/cookies.util.js';

/**
 * This interceptor is to be used on logout routes to clear the auth cookies
 * from response object upon successful response.
 */
@Injectable()
export class ClearAuthCookiesInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const response = http.getResponse<Response>();

    return next.handle().pipe(
      tap(() => {
        clearAuthCookies(response);
      }),
    );
  }
}
