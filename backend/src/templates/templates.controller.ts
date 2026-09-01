import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';
import { TemplatesService } from './templates.service.js';
import type { NoteTemplate } from './templates.data.js';
import { TemplateResponseDto } from './templates.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';

@ApiTags('templates')
@ApiBearerAuth()
@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  findAll(): NoteTemplate[] {
    return this.templatesService.findAll();
  }

  @Get(':id')
  @ZodSerializerDto(TemplateResponseDto)
  findOne(@Param('id') id: string): NoteTemplate {
    return this.templatesService.findOne(id);
  }
}
