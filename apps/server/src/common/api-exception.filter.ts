import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import type { RequestContext } from './request-context.js';

type ExceptionBody = { code?: unknown; message?: unknown };

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestContext>();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const source =
      exception instanceof HttpException
        ? exception.getResponse()
        : { code: 'INTERNAL_ERROR', message: 'Internal server error' };
    const body: ExceptionBody =
      typeof source === 'string' ? { message: source } : source;
    const code =
      typeof body.code === 'string'
        ? body.code
        : status === HttpStatus.INTERNAL_SERVER_ERROR
          ? 'INTERNAL_ERROR'
          : 'HTTP_ERROR';
    const message =
      typeof body.message === 'string' || Array.isArray(body.message)
        ? (body.message as string | string[])
        : 'Request failed';

    if (status >= 500) {
      this.logger.error({
        requestId: request.requestId,
        method: request.method,
        path: request.path,
        statusCode: status,
        code,
      });
    }

    response.status(status).json({
      statusCode: status,
      code,
      message,
      requestId: request.requestId,
    });
  }
}
