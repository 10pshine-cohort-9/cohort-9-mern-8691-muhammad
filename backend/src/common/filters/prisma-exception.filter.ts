import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { ApiErrorResponse } from './global-exception.filter.js';

// It catches Prisma specific errors accross our services, logs error in console and returns a generic message to user.
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  constructor(
    @InjectPinoLogger(PrismaExceptionFilter.name)
    private readonly logger: PinoLogger,
  ) {}

  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, message } = this.mapPrismaError(exception);

    this.logger.warn({ code: exception.code, meta: exception.meta }, message);

    const payload: ApiErrorResponse = {
      success: false,
      statusCode: status,
      message,
    };
    response.status(status).json(payload);
  }

  private mapPrismaError(error: Prisma.PrismaClientKnownRequestError): {
    status: number;
    message: string;
  } {
    switch (error.code) {
      case 'P2002': {
        const fields = (error.meta?.target as string[])?.join(', ') ?? 'field';
        return {
          status: HttpStatus.CONFLICT,
          message: `A record with this ${fields} already exists`,
        };
      }
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'The requested record was not found',
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Related record not found — check your references',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'A database error occurred',
        };
    }
  }
}
