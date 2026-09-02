import { z } from 'zod';
import { request } from './client';
import { templateSchema, type NoteTemplate } from '../schemas';

export const templatesApi = {
  list: (): Promise<NoteTemplate[]> =>
    request('/templates', z.array(templateSchema)),
  get: (id: string): Promise<NoteTemplate> =>
    request(`/templates/${id}`, templateSchema),
};
