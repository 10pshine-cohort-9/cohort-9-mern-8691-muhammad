import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string | string[];
}

// This acts as our final safety filter to ensure every error leaves as a clean JSON response instead of a raw stacked error.
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    @InjectPinoLogger(GlobalExceptionFilter.name)
    private readonly logger: PinoLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      isHttp && status < 500
        ? this.extractMessage(exception.getResponse())
        : 'Internal server error';

    if (status >= 500) {
      this.logger.error(exception, 'Unhandled exception');
    } else {
      this.logger.warn({ status, message }, 'HTTP exception');
    }

    const payload: ApiErrorResponse = {
      success: false,
      statusCode: status,
      message,
    };

    response.status(status).json(payload);
  }

  private extractMessage(exceptionResponse: unknown): string | string[] {
    if (
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      return (exceptionResponse as { message: string | string[] }).message;
    }
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }
    return 'An error occurred';
  }
}
