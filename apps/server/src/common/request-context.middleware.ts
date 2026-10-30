import { randomUUID } from 'node:crypto';
import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import { DEMO_STAFF } from './demo-staff.js';
import type { RequestContext } from './request-context.js';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(request: RequestContext, response: Response, next: NextFunction): void {
    const incoming = request.header('x-request-id');
    request.requestId =
      incoming && uuidPattern.test(incoming) ? incoming : randomUUID();
    request.staff = DEMO_STAFF;
    response.setHeader('X-Request-Id', request.requestId);

    next();
  }
}
