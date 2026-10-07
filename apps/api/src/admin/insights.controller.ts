import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  auditEntrySchema,
  cursorQuerySchema,
  pageSchema,
  statsOverviewSchema,
  statsQuerySchema,
  type AuditEntry,
  type CursorQuery,
  type Page,
  type StatsOverview,
} from '@ecine/contracts';
import type { z } from 'zod';
import { QuerySchema, Returns } from '../common/contract.decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { Roles } from '../auth/decorators.js';
import { AdminInsightsService } from './insights.service.js';

@ApiTags('admin')
@Roles('ADMIN')
@Controller('admin')
export class AdminInsightsController {
  constructor(private readonly insights: AdminInsightsService) {}

  @Get('audit-log')
  @QuerySchema(cursorQuerySchema)
  @Returns(pageSchema(auditEntrySchema))
  auditLog(@Query(new ZodPipe(cursorQuerySchema)) q: CursorQuery): Promise<Page<AuditEntry>> {
    return this.insights.auditLog(q);
  }

  @Get('stats/overview')
  @QuerySchema(statsQuerySchema)
  @Returns(statsOverviewSchema)
  overview(
    @Query(new ZodPipe(statsQuerySchema)) q: z.infer<typeof statsQuerySchema>,
  ): Promise<StatsOverview> {
    return this.insights.overview(q.days);
  }

  @Get('stats/export.csv')
  @ApiProduces('text/csv')
  @QuerySchema(statsQuerySchema)
  exportCsv(
    @Query(new ZodPipe(statsQuerySchema)) q: z.infer<typeof statsQuerySchema>,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="e-cine-statistiques-${q.days}j.csv"`,
    );
    return this.insights.exportCsv(q.days);
  }
}
