import { Body, Controller, Get, Param, Patch, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  contactMessageSchema,
  cursorQuerySchema,
  idSchema,
  pageSchema,
  reportListQuerySchema,
  reportSchema,
  reportUpdateInputSchema,
  type ContactMessage,
  type CursorQuery,
  type Page,
  type Report,
  type ReportListQuery,
} from '@ecine/contracts';
import type { z } from 'zod';
import { BodySchema, QuerySchema, Returns } from '../common/contract.decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { Roles } from '../auth/decorators.js';
import { AdminModerationService } from './moderation.service.js';

@ApiTags('admin')
@Roles('MODERATOR')
@Controller('admin/reports')
export class AdminReportsController {
  constructor(private readonly moderation: AdminModerationService) {}

  @Get()
  @QuerySchema(reportListQuerySchema)
  @Returns(pageSchema(reportSchema))
  list(@Query(new ZodPipe(reportListQuerySchema)) q: ReportListQuery): Promise<Page<Report>> {
    return this.moderation.reports(q);
  }

  @Patch(':id')
  @BodySchema(reportUpdateInputSchema)
  @Returns(reportSchema)
  update(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Body(new ZodPipe(reportUpdateInputSchema)) input: z.infer<typeof reportUpdateInputSchema>,
    @Req() req: Request,
  ): Promise<Report> {
    return this.moderation.updateReport(req, id, input);
  }
}

@ApiTags('admin')
@Roles('EDITOR')
@Controller('admin/contact-messages')
export class AdminContactMessagesController {
  constructor(private readonly moderation: AdminModerationService) {}

  @Get()
  @QuerySchema(cursorQuerySchema)
  @Returns(pageSchema(contactMessageSchema))
  list(@Query(new ZodPipe(cursorQuerySchema)) q: CursorQuery): Promise<Page<ContactMessage>> {
    return this.moderation.messages(q);
  }

  @Patch(':id/handled')
  @Returns(contactMessageSchema)
  handled(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Req() req: Request,
  ): Promise<ContactMessage> {
    return this.moderation.markHandled(req, id);
  }
}
