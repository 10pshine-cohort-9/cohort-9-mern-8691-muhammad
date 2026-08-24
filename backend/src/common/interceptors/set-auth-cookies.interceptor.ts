import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  InternalServerErrorException,
  type NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { from, type Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '../../auth/auth.service.js';
import { safeUserSchema } from '../../auth/auth.schemas.js';

/**
 * This inteceptor set auth tokens into response cookies upon successful return
 * of authenticated user
 */
@Injectable()
export class SetAuthCookiesInterceptor implements NestInterceptor {
  constructor(private readonly authService: AuthService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const response = http.getResponse<Response>();

    return next.handle().pipe(
      switchMap((data: unknown) =>
        from(
          (async () => {
            const parsed = safeUserSchema.safeParse(data);
            if (parsed.success) {
              try {
                await this.authService.issueAndSetAuthCookies(
                  parsed.data,
                  response,
                );
              } catch {
                throw new InternalServerErrorException(
                  'Failed to issue authentication credentials',
                );
              }
            }
            return data;
          })(),
        ),
      ),
    );
  }
}
