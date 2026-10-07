import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  adminArticleSchema,
  adminListQuerySchema,
  adminRowSchema,
  articleInputSchema,
  confirmQuerySchema,
  idSchema,
  pageSchema,
  publishCheckSchema,
  scheduleInputSchema,
  type AdminArticle,
  type AdminListQuery,
  type AdminRow,
  type ArticleInput,
  type Page,
  type PublishCheck,
} from '@ecine/contracts';
import type { z } from 'zod';
import { BodySchema, QuerySchema, Returns } from '../common/contract.decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { ConfirmDeletionPipe } from './admin.helpers.js';
import { AdminArticlesService } from './articles.service.js';

@ApiTags('admin')
@Roles('EDITOR')
@Controller('admin/articles')
export class AdminArticlesController {
  constructor(private readonly articles: AdminArticlesService) {}

  @Get()
  @QuerySchema(adminListQuerySchema)
  @Returns(pageSchema(adminRowSchema))
  list(@Query(new ZodPipe(adminListQuerySchema)) q: AdminListQuery): Promise<Page<AdminRow>> {
    return this.articles.list(q);
  }

  @Get(':id')
  @Returns(adminArticleSchema)
  get(@Param('id', new ZodPipe(idSchema)) id: string): Promise<AdminArticle> {
    return this.articles.get(id);
  }

  @Post()
  @BodySchema(articleInputSchema)
  @Returns(adminArticleSchema)
  create(
    @Body(new ZodPipe(articleInputSchema)) input: ArticleInput,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ): Promise<AdminArticle> {
    return this.articles.create(req, user, input);
  }

  @Patch(':id')
  @BodySchema(articleInputSchema)
  @Returns(adminArticleSchema)
  update(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Body(new ZodPipe(articleInputSchema)) input: ArticleInput,
    @Req() req: Request,
  ): Promise<AdminArticle> {
    return this.articles.update(req, id, input);
  }

  @Delete(':id')
  @HttpCode(204)
  @QuerySchema(confirmQuerySchema)
  remove(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Query(new ConfirmDeletionPipe()) _confirm: z.infer<typeof confirmQuerySchema>,
    @Req() req: Request,
  ): Promise<void> {
    return this.articles.remove(req, id);
  }

  @Post(':id/restore')
  @HttpCode(200)
  @Returns(adminArticleSchema)
  restore(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Req() req: Request,
  ): Promise<AdminArticle> {
    return this.articles.restore(req, id);
  }

  @Get(':id/publish-check')
  @Returns(publishCheckSchema)
  check(@Param('id', new ZodPipe(idSchema)) id: string): Promise<PublishCheck> {
    return this.articles.check(id);
  }

  @Post(':id/publish')
  @HttpCode(200)
  @Returns(adminArticleSchema)
  publish(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Req() req: Request,
  ): Promise<AdminArticle> {
    return this.articles.publish(req, id);
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  @Returns(adminArticleSchema)
  unpublish(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Req() req: Request,
  ): Promise<AdminArticle> {
    return this.articles.unpublish(req, id);
  }

  @Post(':id/schedule')
  @HttpCode(200)
  @BodySchema(scheduleInputSchema)
  @Returns(adminArticleSchema)
  schedule(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Body(new ZodPipe(scheduleInputSchema)) input: z.infer<typeof scheduleInputSchema>,
    @Req() req: Request,
  ): Promise<AdminArticle> {
    return this.articles.schedule(req, id, input.publishAt);
  }

  @Post(':id/archive')
  @HttpCode(200)
  @Returns(adminArticleSchema)
  archive(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Req() req: Request,
  ): Promise<AdminArticle> {
    return this.articles.archive(req, id);
  }
}
