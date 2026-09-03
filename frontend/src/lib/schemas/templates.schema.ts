import * as z from "zod";
import { tiptapContentSchema } from "./notes.schema";

export const TEMPLATE_CATEGORIES = [
  "work",
  "personal",
  "engineering",
  "writing",
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export const templateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum(TEMPLATE_CATEGORIES),
  title: z.string(),
  content: tiptapContentSchema,
  tags: z.array(z.string()),
});

export type NoteTemplate = z.infer<typeof templateSchema>;
