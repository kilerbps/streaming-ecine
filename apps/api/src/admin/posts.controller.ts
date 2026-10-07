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
  adminListQuerySchema,
  adminPostSchema,
  adminRowSchema,
  confirmQuerySchema,
  idSchema,
  pageSchema,
  postInputSchema,
  publishCheckSchema,
  scheduleInputSchema,
  type AdminListQuery,
  type AdminPost,
  type AdminRow,
  type Page,
  type PostInput,
  type PublishCheck,
} from '@ecine/contracts';
import type { z } from 'zod';
import { BodySchema, QuerySchema, Returns } from '../common/contract.decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { ConfirmDeletionPipe } from './admin.helpers.js';
import { AdminPostsService } from './posts.service.js';

@ApiTags('admin')
@Roles('EDITOR')
@Controller('admin/posts')
export class AdminPostsController {
  constructor(private readonly posts: AdminPostsService) {}

  @Get()
  @QuerySchema(adminListQuerySchema)
  @Returns(pageSchema(adminRowSchema))
  list(@Query(new ZodPipe(adminListQuerySchema)) q: AdminListQuery): Promise<Page<AdminRow>> {
    return this.posts.list(q);
  }

  @Get(':id')
  @Returns(adminPostSchema)
  get(@Param('id', new ZodPipe(idSchema)) id: string): Promise<AdminPost> {
    return this.posts.get(id);
  }

  @Post()
  @BodySchema(postInputSchema)
  @Returns(adminPostSchema)
  create(
    @Body(new ZodPipe(postInputSchema)) input: PostInput,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ): Promise<AdminPost> {
    return this.posts.create(req, user, input);
  }

  @Patch(':id')
  @BodySchema(postInputSchema)
  @Returns(adminPostSchema)
  update(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Body(new ZodPipe(postInputSchema)) input: PostInput,
    @Req() req: Request,
  ): Promise<AdminPost> {
    return this.posts.update(req, id, input);
  }

  @Delete(':id')
  @HttpCode(204)
  @QuerySchema(confirmQuerySchema)
  remove(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Query(new ConfirmDeletionPipe()) _confirm: z.infer<typeof confirmQuerySchema>,
    @Req() req: Request,
  ): Promise<void> {
    return this.posts.remove(req, id);
  }

  @Post(':id/restore')
  @HttpCode(200)
  @Returns(adminPostSchema)
  restore(@Param('id', new ZodPipe(idSchema)) id: string, @Req() req: Request): Promise<AdminPost> {
    return this.posts.restore(req, id);
  }

  @Get(':id/publish-check')
  @Returns(publishCheckSchema)
  check(@Param('id', new ZodPipe(idSchema)) id: string): Promise<PublishCheck> {
    return this.posts.check(id);
  }

  @Post(':id/publish')
  @HttpCode(200)
  @Returns(adminPostSchema)
  publish(@Param('id', new ZodPipe(idSchema)) id: string, @Req() req: Request): Promise<AdminPost> {
    return this.posts.publish(req, id);
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  @Returns(adminPostSchema)
  unpublish(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Req() req: Request,
  ): Promise<AdminPost> {
    return this.posts.unpublish(req, id);
  }

  @Post(':id/schedule')
  @HttpCode(200)
  @BodySchema(scheduleInputSchema)
  @Returns(adminPostSchema)
  schedule(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Body(new ZodPipe(scheduleInputSchema)) input: z.infer<typeof scheduleInputSchema>,
    @Req() req: Request,
  ): Promise<AdminPost> {
    return this.posts.schedule(req, id, input.publishAt);
  }

  @Post(':id/archive')
  @HttpCode(200)
  @Returns(adminPostSchema)
  archive(@Param('id', new ZodPipe(idSchema)) id: string, @Req() req: Request): Promise<AdminPost> {
    return this.posts.archive(req, id);
  }
}
