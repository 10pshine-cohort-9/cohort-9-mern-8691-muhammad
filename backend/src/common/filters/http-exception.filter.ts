import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(@InjectPinoLogger(GlobalExceptionFilter.name) private readonly logger: PinoLogger) {
    this.logger.setContext(GlobalExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException ? exception.getResponse() : null;
    const message = this.extractMessage(exceptionResponse, exception);
    const errorName = isHttpException ? exception.name : 'InternalServerError';

    const body: ErrorResponseBody = {
      statusCode: status,
      message,
      error: errorName,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    const logContext = {
      statusCode: status,
      path: request.url,
      method: request.method,
      userId: (request as unknown as { user?: { id: string } }).user?.id,
    };

    if (status >= 500) {
      this.logger.error(
        { ...logContext, stack: exception instanceof Error ? exception.stack : undefined },
        `Unhandled exception: ${message}`,
      );
    } else {
      this.logger.warn(logContext, `Handled exception: ${message}`);
    }

    response.status(status).json(body);
  }

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
