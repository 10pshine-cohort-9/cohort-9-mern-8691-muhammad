import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { SetAuthCookiesInterceptor } from '../common/interceptors/set-auth-cookies.interceptor.js';
import { ClearAuthCookiesInterceptor } from '../common/interceptors/clear-auth-cookies.interceptor.js';

@Global()
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    SetAuthCookiesInterceptor,
    ClearAuthCookiesInterceptor,
  ],
  exports: [
    AuthService,
    SetAuthCookiesInterceptor,
    ClearAuthCookiesInterceptor,
  ],
})
export class AuthModule {}
