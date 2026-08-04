import { UnprocessableEntityException } from '@nestjs/common';
import { createZodValidationPipe } from 'nestjs-zod';
import type { ZodError } from 'zod';

export const ZodValidationPipe = createZodValidationPipe({
  createValidationException: (error: ZodError) =>
    new UnprocessableEntityException(error.issues.map((issue) => issue.message)),
});
