import type { INestApplication } from '@nestjs/common';
import { ApiExceptionFilter } from './api-exception.filter.js';
import { createValidationPipe } from './validation.js';

export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
}
