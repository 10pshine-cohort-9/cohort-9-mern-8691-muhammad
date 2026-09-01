import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { NotificationType } from '../generated/prisma/enums.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  NotificationResponse,
  QueryNotificationsInput,
} from './notifications.types.js';
import type { PaginatedResult } from '../notes/notes.types.js';

export interface CollaboratorInvitedPayload {
  noteId: string;
  noteTitle: string;
  inviterName: string;
  permission: 'READ' | 'WRITE';
}

export interface PermissionChangedPayload {
  noteId: string;
  noteTitle: string;
  permission: 'READ' | 'WRITE';
  changedByName: string;
}

export interface CollaboratorRemovedPayload {
  noteId: string;
  noteTitle: string;
  removedByName: string;
}

export interface NoteEditedPayload {
  noteId: string;
  noteTitle: string;
  editorName: string;
}

export type NotificationPayload =
  | CollaboratorInvitedPayload
  | PermissionChangedPayload
  | CollaboratorRemovedPayload
  | NoteEditedPayload;

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(NotificationsService.name)
    private readonly logger: PinoLogger,
  ) {}

  async create(
    userId: string,
    type: NotificationType,
    payload: NotificationPayload,
  ): Promise<NotificationResponse> {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        payload: payload as unknown as Prisma.InputJsonValue,
      },
    });
    this.logger.info(
      { userId, type, notificationId: notification.id },
      'Notification created',
    );
    return notification as NotificationResponse;
  }

  async findAll(
    userId: string,
    input: QueryNotificationsInput,
  ): Promise<PaginatedResult<NotificationResponse>> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;

    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(input.unreadOnly ? { readAt: null } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: data as NotificationResponse[],
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(
    userId: string,
    notificationId: string,
  ): Promise<NotificationResponse> {
    const existing = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    this.assertOwner(existing, userId, notificationId);

    if (existing.readAt) return existing as NotificationResponse;

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
    this.logger.info({ userId, notificationId }, 'Notification marked read');
    return updated as NotificationResponse;
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    this.logger.info(
      { userId, count: result.count },
      'All notifications marked read',
    );
    return { updated: result.count };
  }

  async remove(userId: string, notificationId: string): Promise<void> {
    const existing = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    this.assertOwner(existing, userId, notificationId);

    await this.prisma.notification.delete({ where: { id: notificationId } });
    this.logger.info({ userId, notificationId }, 'Notification deleted');
  }

  private assertOwner(
    notification: { userId: string } | null,
    userId: string,
    notificationId: string,
  ): asserts notification is NonNullable<typeof notification> {
    if (notification?.userId !== userId) {
      this.logger.warn(
        { userId, notificationId },
        'Notification not found or not owned by user',
      );
      throw new NotFoundException('Notification not found');
    }
  }
}
