import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

export interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

/**
 * An exception filter working globally to fliter out any server issure from going to frontend.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    @InjectPinoLogger(GlobalExceptionFilter.name)
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(GlobalExceptionFilter.name);
  }

  /**
   * Actual exception handler function filtering out the server issues but logging detailed
   * errors in development mode
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;

    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    let rawMessage: string | string[];

    if (isHttpException) {
      rawMessage = this.extractHttpMessage(exception.getResponse());
    } else if (exception instanceof Error) {
      rawMessage = exception.message;
    } else {
      rawMessage = 'Internal Server Error';
    }

    const logMessage = Array.isArray(rawMessage)
      ? rawMessage.join(', ')
      : rawMessage;
    const errorName = isHttpException ? exception.name : 'InternalServerError';

    const clientMessage = status >= 500 ? 'Internal Server Error' : rawMessage;

    const path = request.url.split('?')[0];

    const body: ErrorResponseBody = {
      statusCode: status,
      message: clientMessage,
      error: errorName,
      path,
      timestamp: new Date().toISOString(),
    };

    const logContext = {
      statusCode: status,
      path,
      method: request.method,
      userId: request.user?.id,
    };

    if (status >= 500) {
      this.logger.error(
        {
          ...logContext,
          stack: exception instanceof Error ? exception.stack : undefined,
        },
        `Error: ${logMessage}`,
      );
    } else {
      this.logger.warn(logContext, `Error: ${logMessage}`);
    }

    response.status(status).json(body);
  }

  /**
   * Exception message extractor with the fallback of a generic message.
   */
  private extractHttpMessage(exceptionResponse: unknown): string | string[] {
    if (
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      return (
        exceptionResponse as {
          message: string | string[];
        }
      ).message;
    }

    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    return 'Unexpected Error Occurred';
  }
}
