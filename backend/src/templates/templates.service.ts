import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { NOTE_TEMPLATES, type NoteTemplate } from './templates.data.js';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectPinoLogger(TemplatesService.name)
    private readonly logger: PinoLogger,
  ) {}

  findAll(): NoteTemplate[] {
    return NOTE_TEMPLATES;
  }

  findOne(id: string): NoteTemplate {
    const template = NOTE_TEMPLATES.find((t) => t.id === id);
    if (!template) {
      this.logger.warn({ templateId: id }, 'Template not found');
      throw new NotFoundException('Template not found');
    }
    return template;
  }
}
