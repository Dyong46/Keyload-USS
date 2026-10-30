import { HttpStatus, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { ApiException } from './api-exception.js';

function flattenValidationErrors(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => [
    ...Object.values(error.constraints ?? {}),
    ...flattenValidationErrors(error.children ?? []),
  ]);
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    exceptionFactory: (errors) =>
      new ApiException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        flattenValidationErrors(errors),
      ),
  });
}
