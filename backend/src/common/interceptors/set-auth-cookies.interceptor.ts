import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { from, type Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '../../auth/auth.service.js';
import type { SafeUser } from '../../auth/auth.types.js';

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
            const user = data as SafeUser | undefined;
            if (user) {
              await this.authService.issueAndSetAuthCookies(user, response);
            }
            return data;
          })(),
        ),
      ),
    );
  }
}
