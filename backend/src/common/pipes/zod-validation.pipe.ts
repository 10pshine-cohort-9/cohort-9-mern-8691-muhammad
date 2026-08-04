import { UnprocessableEntityException } from '@nestjs/common';
import { createZodValidationPipe } from 'nestjs-zod';
import type { ZodError } from 'zod';

/**
 * Global validation pipe using Zod schemas for DTO parsing and validation.
 * Custom exception transforms Zod validation issues into an
 * UnprocessableEntityException (HTTP 422) with a normal string array of validation messages.
 */
export const ZodValidationPipe = createZodValidationPipe({
  createValidationException: (error: ZodError) =>
    new UnprocessableEntityException(error.issues.map((issue) => issue.message)),
});
