import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

/**
 * Interface for standardized JSON error response returned as API Error Response.
 */
interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

/**
 * Global exception filter catching all errors.
 * Logs error details via Pino logger and returns JSON response payload.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  /**
   * Constructs the global exception filter.
   *
   * @param {PinoLogger} logger Logger instance injected by nestjs-pino.
   */
  constructor(@InjectPinoLogger(GlobalExceptionFilter.name) private readonly logger: PinoLogger) {
    this.logger.setContext(GlobalExceptionFilter.name);
  }

  /**
   * Handles caught exceptions and formats the HTTP response.
   *
   * @param {unknown} exception Any Exception caught in the request pipeline.
   * @param {ArgumentsHost} host Context host containing HTTP request and response objects.
   * @returns {void}
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    if (!response || response.headersSent) {
      return;
    }
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException ? exception.getResponse() : null;
    const clientMessage = isHttpException
      ? this.extractMessage(exceptionResponse, exception)
      : 'Internal server error';
    const rawErrorMessage =
      exception instanceof Error
        ? exception.message
        : typeof exception === 'string'
          ? exception
          : 'Unknown error';
    const errorName = isHttpException ? exception.name : 'InternalServerError';
    const path = request.originalUrl ?? request.url;

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
      userId: (request as unknown as { user?: { id: string } }).user?.id,
    };

    if (status >= 500) {
      this.logger.error(
        { ...logContext, stack: exception instanceof Error ? exception.stack : undefined },
        `Unhandled exception: ${rawErrorMessage}`,
      );
    } else {
      this.logger.warn(logContext, `Handled exception: ${rawErrorMessage}`);
    }

    response.status(status).json(body);
  }

  /**
   * Extracts user readable error message from exception objects.
   *
   * @param {unknown} exceptionResponse Response payload from an HttpException if present.
   * @param {unknown} exception Original exception instance.
   * @returns {string | string[]} Formatted error message string.
   */
  private extractMessage(exceptionResponse: unknown, exception: unknown): string | string[] {
    if (
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      return (exceptionResponse as { message: string | string[] }).message;
    }
    if (exception instanceof Error) {
      return exception.message;
    }
    return 'Internal server error';
  }
}
