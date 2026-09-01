import { createZodDto } from 'nestjs-zod';
import {
  NotificationListResponseSchema,
  NotificationSchema,
  QueryNotificationsSchema,
  UnreadCountResponseSchema,
} from './notifications.schemas.js';

export class QueryNotificationsDto extends createZodDto(
  QueryNotificationsSchema,
) {}
export class NotificationResponseDto extends createZodDto(NotificationSchema) {}
export class NotificationListResponseDto extends createZodDto(
  NotificationListResponseSchema,
) {}
export class UnreadCountResponseDto extends createZodDto(
  UnreadCountResponseSchema,
) {}
