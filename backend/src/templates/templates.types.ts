import * as z from 'zod';
import { TemplateSchema } from './templates.schemas.js';

export type TemplateResponse = z.infer<typeof TemplateSchema>;
