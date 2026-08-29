import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';
import { NotificationsService } from './notifications.service.js';
import {
  NotificationListResponseDto,
  NotificationResponseDto,
  QueryNotificationsDto,
  UnreadCountResponseDto,
} from './notifications.dto.js';
import type { NotificationResponse } from './notifications.types.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { SafeUser } from '../auth/auth.types.js';
import type { PaginatedResult } from '../notes/notes.types.js';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ZodSerializerDto(NotificationListResponseDto)
  async findAll(
    @CurrentUser() user: SafeUser,
    @Query() query: QueryNotificationsDto,
  ): Promise<PaginatedResult<NotificationResponse>> {
    return this.notificationsService.findAll(user.id, query);
  }

  @Get('unread-count')
  @ZodSerializerDto(UnreadCountResponseDto)
  async unreadCount(@CurrentUser() user: SafeUser): Promise<{ count: number }> {
    const count = await this.notificationsService.unreadCount(user.id);
    return { count };
  }

  @Patch(':id/read')
  @ZodSerializerDto(NotificationResponseDto)
  async markRead(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
  ): Promise<NotificationResponse> {
    return this.notificationsService.markRead(user.id, id);
  }

  @Patch('read-all')
  async markAllRead(
    @CurrentUser() user: SafeUser,
  ): Promise<{ updated: number }> {
    return this.notificationsService.markAllRead(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.notificationsService.remove(user.id, id);
  }
}
