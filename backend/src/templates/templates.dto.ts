import { createZodDto } from 'nestjs-zod';
import { TemplateSchema } from './templates.schemas.js';

export class TemplateResponseDto extends createZodDto(TemplateSchema) {}
