import * as z from 'zod';
import { TiptapContentSchema } from '../notes/notes.schemas.js';

export const TEMPLATE_CATEGORIES = [
  'work',
  'personal',
  'engineering',
  'writing',
] as const;

export const TemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum(TEMPLATE_CATEGORIES),
  title: z.string(),
  content: TiptapContentSchema,
  tags: z.array(z.string()),
});
