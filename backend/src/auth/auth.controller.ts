import { ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import type { SafeUser } from './auth.types.js';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  SignUpDto,
  LoginDto,
  LogoutDto,
  ChangePasswordDto,
  SafeUserResponseDto,
  UpdateProfileDto,
} from './auth.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import {
  LoginRateLimit,
  StrictRateLimit,
} from '../common/decorators/rate-limiter.decorator.js';
import { SetAuthCookiesInterceptor } from '../common/interceptors/set-auth-cookies.interceptor.js';
import { ClearAuthCookiesInterceptor } from '../common/interceptors/clear-auth-cookies.interceptor.js';
import { AUTH_COOKIE_NAMES } from '../common/utils/cookies.util.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-up')
  @HttpCode(HttpStatus.CREATED)
  @StrictRateLimit()
  @UseInterceptors(SetAuthCookiesInterceptor)
  @ZodSerializerDto(SafeUserResponseDto)
  async signUp(@Body() dto: SignUpDto): Promise<SafeUser> {
    return this.authService.signUp(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @LoginRateLimit()
  @UseInterceptors(SetAuthCookiesInterceptor)
  @ZodSerializerDto(SafeUserResponseDto)
  async login(@Body() dto: LoginDto): Promise<SafeUser> {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ZodSerializerDto(SafeUserResponseDto)
  async me(@CurrentUser() user: SafeUser): Promise<SafeUser> {
    return this.authService.getProfile(user.id);
  }

  @Get('users')
  @UseGuards(JwtAuthGuard)
  async listUsers(@CurrentUser() user: SafeUser): Promise<SafeUser[]> {
    return this.authService.listUsers(user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ZodSerializerDto(SafeUserResponseDto)
  async updateProfile(
    @CurrentUser() user: SafeUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<SafeUser> {
    return this.authService.updateProfile(user.id, dto);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: SafeUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.changePassword(user.id, dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClearAuthCookiesInterceptor)
  async logout(
    @CurrentUser() user: SafeUser,
    @Body() dto: LogoutDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const token =
      dto.refreshToken ||
      (req.cookies?.[AUTH_COOKIE_NAMES.REFRESH] as string | undefined);
    return this.authService.logout(user.id, token);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClearAuthCookiesInterceptor)
  async logoutAll(@CurrentUser() user: SafeUser): Promise<{ message: string }> {
    return this.authService.logoutAll(user.id);
  }
}
