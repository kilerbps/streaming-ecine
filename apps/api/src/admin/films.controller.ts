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
  adminFilmSchema,
  adminListQuerySchema,
  adminRowSchema,
  confirmQuerySchema,
  filmInputSchema,
  idSchema,
  pageSchema,
  publishCheckSchema,
  scheduleInputSchema,
  type AdminFilm,
  type AdminListQuery,
  type AdminRow,
  type FilmInput,
  type Page,
  type PublishCheck,
} from '@ecine/contracts';
import type { z } from 'zod';
import { BodySchema, QuerySchema, Returns } from '../common/contract.decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { Roles } from '../auth/decorators.js';
import { ConfirmDeletionPipe } from './admin.helpers.js';
import { AdminFilmsService } from './films.service.js';

@ApiTags('admin')
@Roles('EDITOR')
@Controller('admin/films')
export class AdminFilmsController {
  constructor(private readonly films: AdminFilmsService) {}

  @Get()
  @QuerySchema(adminListQuerySchema)
  @Returns(pageSchema(adminRowSchema))
  list(@Query(new ZodPipe(adminListQuerySchema)) q: AdminListQuery): Promise<Page<AdminRow>> {
    return this.films.list(q);
  }

  @Get(':id')
  @Returns(adminFilmSchema)
  get(@Param('id', new ZodPipe(idSchema)) id: string): Promise<AdminFilm> {
    return this.films.get(id);
  }

  @Post()
  @BodySchema(filmInputSchema)
  @Returns(adminFilmSchema)
  create(
    @Body(new ZodPipe(filmInputSchema)) input: FilmInput,
    @Req() req: Request,
  ): Promise<AdminFilm> {
    return this.films.create(req, input);
  }

  @Patch(':id')
  @BodySchema(filmInputSchema)
  @Returns(adminFilmSchema)
  update(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Body(new ZodPipe(filmInputSchema)) input: FilmInput,
    @Req() req: Request,
  ): Promise<AdminFilm> {
    return this.films.update(req, id, input);
  }

  @Delete(':id')
  @HttpCode(204)
  @QuerySchema(confirmQuerySchema)
  remove(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Query(new ConfirmDeletionPipe()) _confirm: z.infer<typeof confirmQuerySchema>,
    @Req() req: Request,
  ): Promise<void> {
    return this.films.remove(req, id);
  }

  @Post(':id/restore')
  @HttpCode(200)
  @Returns(adminFilmSchema)
  restore(@Param('id', new ZodPipe(idSchema)) id: string, @Req() req: Request): Promise<AdminFilm> {
    return this.films.restore(req, id);
  }

  @Get(':id/publish-check')
  @Returns(publishCheckSchema)
  check(@Param('id', new ZodPipe(idSchema)) id: string): Promise<PublishCheck> {
    return this.films.check(id);
  }

  @Post(':id/publish')
  @HttpCode(200)
  @Returns(adminFilmSchema)
  publish(@Param('id', new ZodPipe(idSchema)) id: string, @Req() req: Request): Promise<AdminFilm> {
    return this.films.publish(req, id);
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  @Returns(adminFilmSchema)
  unpublish(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Req() req: Request,
  ): Promise<AdminFilm> {
    return this.films.unpublish(req, id);
  }

  @Post(':id/schedule')
  @HttpCode(200)
  @BodySchema(scheduleInputSchema)
  @Returns(adminFilmSchema)
  schedule(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Body(new ZodPipe(scheduleInputSchema)) input: z.infer<typeof scheduleInputSchema>,
    @Req() req: Request,
  ): Promise<AdminFilm> {
    return this.films.schedule(req, id, input.publishAt);
  }

  @Post(':id/archive')
  @HttpCode(200)
  @Returns(adminFilmSchema)
  archive(@Param('id', new ZodPipe(idSchema)) id: string, @Req() req: Request): Promise<AdminFilm> {
    return this.films.archive(req, id);
  }
}
