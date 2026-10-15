import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  bookmarkStateSchema,
  continueWatchingItemSchema,
  cursorQuerySchema,
  filmSummarySchema,
  idSchema,
  likeParamsSchema,
  likeStateSchema,
  likeTargetTypeSchema,
  pageSchema,
  progressInputSchema,
  reminderStateSchema,
  dismissalStateSchema,
  tastesSchema,
  reportInputSchema,
  viewerStateSchema,
  type BookmarkState,
  type ContinueWatchingItem,
  type FilmSummary,
  type LikeState,
  type Page,
  type ReminderState,
  type DismissalState,
  type Tastes,
  type ViewerState,
} from '@ecine/contracts';
import { z } from 'zod';
import { BodySchema, Returns } from '../common/contract.decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators.js';
import { RequestLocale } from '../content/locale.decorator.js';
import { InteractionsService } from './interactions.service.js';

const likedIdsQuery = z.strictObject({
  type: likeTargetTypeSchema,
  ids: z
    .string()
    .max(2000)
    .transform((v) => v.split(',').filter(Boolean))
    .pipe(z.array(idSchema).max(60)),
});

function privateResponse(res: Response): void {
  res.setHeader('Cache-Control', 'no-store');
}

@ApiTags('interactions')
@Controller()
export class InteractionsController {
  constructor(private readonly interactions: InteractionsService) {}

  @Put('likes/:targetType/:targetId')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Returns(likeStateSchema)
  like(
    @CurrentUser() user: AuthUser,
    @Param(new ZodPipe(likeParamsSchema)) p: z.infer<typeof likeParamsSchema>,
  ): Promise<LikeState> {
    return this.interactions.setLike(user.id, p.targetType, p.targetId, true);
  }

  @Delete('likes/:targetType/:targetId')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Returns(likeStateSchema)
  unlike(
    @CurrentUser() user: AuthUser,
    @Param(new ZodPipe(likeParamsSchema)) p: z.infer<typeof likeParamsSchema>,
  ): Promise<LikeState> {
    return this.interactions.setLike(user.id, p.targetType, p.targetId, false);
  }

  @Get('me/likes')
  async likedIds(
    @CurrentUser() user: AuthUser,
    @Query(new ZodPipe(likedIdsQuery)) q: z.infer<typeof likedIdsQuery>,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ids: string[] }> {
    privateResponse(res);
    return { ids: await this.interactions.likedIds(user.id, q.type, q.ids) };
  }

  @Put('bookmarks/:filmId')
  @Returns(bookmarkStateSchema)
  bookmark(
    @CurrentUser() user: AuthUser,
    @Param('filmId', new ZodPipe(idSchema)) filmId: string,
  ): Promise<BookmarkState> {
    return this.interactions.setBookmark(user.id, filmId, true);
  }

  @Delete('bookmarks/:filmId')
  @Returns(bookmarkStateSchema)
  unbookmark(
    @CurrentUser() user: AuthUser,
    @Param('filmId', new ZodPipe(idSchema)) filmId: string,
  ): Promise<BookmarkState> {
    return this.interactions.setBookmark(user.id, filmId, false);
  }

  @Get('me/bookmarks')
  @Returns(pageSchema(filmSummarySchema))
  bookmarks(
    @CurrentUser() user: AuthUser,
    @Query(new ZodPipe(cursorQuerySchema.extend({ locale: z.string().optional() })))
    q: z.infer<typeof cursorQuerySchema>,
    @RequestLocale() locale: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Page<FilmSummary>> {
    privateResponse(res);
    return this.interactions.bookmarks(user.id, q.limit, q.cursor, locale);
  }

  @Put('me/reminders/:filmId')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Returns(reminderStateSchema)
  remind(
    @CurrentUser() user: AuthUser,
    @Param('filmId', new ZodPipe(idSchema)) filmId: string,
  ): Promise<ReminderState> {
    return this.interactions.setReminder(user.id, filmId, true);
  }

  @Delete('me/reminders/:filmId')
  @Returns(reminderStateSchema)
  unremind(
    @CurrentUser() user: AuthUser,
    @Param('filmId', new ZodPipe(idSchema)) filmId: string,
  ): Promise<ReminderState> {
    return this.interactions.setReminder(user.id, filmId, false);
  }

  @Put('me/dismissals/:filmId')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Returns(dismissalStateSchema)
  dismiss(
    @CurrentUser() user: AuthUser,
    @Param('filmId', new ZodPipe(idSchema)) filmId: string,
  ): Promise<DismissalState> {
    return this.interactions.setDismissal(user.id, filmId, true);
  }

  @Delete('me/dismissals/:filmId')
  @Returns(dismissalStateSchema)
  undismiss(
    @CurrentUser() user: AuthUser,
    @Param('filmId', new ZodPipe(idSchema)) filmId: string,
  ): Promise<DismissalState> {
    return this.interactions.setDismissal(user.id, filmId, false);
  }

  @Get('me/tastes')
  @Returns(tastesSchema)
  tastes(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Tastes> {
    privateResponse(res);
    return this.interactions.tastes(user.id);
  }

  @Put('me/tastes')
  @BodySchema(tastesSchema)
  @Returns(tastesSchema)
  setTastes(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(tastesSchema)) input: Tastes,
  ): Promise<Tastes> {
    return this.interactions.setTastes(user.id, input.categories);
  }

  @Get('me/reminders')
  @Returns(z.array(filmSummarySchema))
  reminders(
    @CurrentUser() user: AuthUser,
    @RequestLocale() locale: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<FilmSummary[]> {
    privateResponse(res);
    return this.interactions.reminders(user.id, locale);
  }

  @Put('me/progress/:filmId')
  @HttpCode(204)
  @BodySchema(progressInputSchema)
  async progress(
    @CurrentUser() user: AuthUser,
    @Param('filmId', new ZodPipe(idSchema)) filmId: string,
    @Body(new ZodPipe(progressInputSchema)) input: z.infer<typeof progressInputSchema>,
  ): Promise<void> {
    await this.interactions.saveProgress(user.id, filmId, input.positionSec);
  }

  @Get('me/continue-watching')
  @Returns(z.array(continueWatchingItemSchema))
  continueWatching(
    @CurrentUser() user: AuthUser,
    @RequestLocale() locale: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ContinueWatchingItem[]> {
    privateResponse(res);
    return this.interactions.continueWatching(user.id, locale);
  }

  @Get('me/films/:filmId/state')
  @Returns(viewerStateSchema)
  filmState(
    @CurrentUser() user: AuthUser,
    @Param('filmId', new ZodPipe(idSchema)) filmId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ViewerState> {
    privateResponse(res);
    return this.interactions.filmState(user.id, filmId);
  }

  @Post('reports')
  @HttpCode(202)
  @Throttle({ default: { limit: 10, ttl: 60 * 60_000 } })
  @BodySchema(reportInputSchema)
  async report(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(reportInputSchema)) input: z.infer<typeof reportInputSchema>,
  ): Promise<void> {
    await this.interactions.report(user.id, input);
  }
}
