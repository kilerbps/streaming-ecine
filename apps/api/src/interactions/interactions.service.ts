import { Injectable } from '@nestjs/common';
import type {
  BookmarkState,
  ContinueWatchingItem,
  FilmSummary,
  LikeState,
  LikeTargetType,
  Page,
  ReminderState,
  ReportInput,
  ViewerState,
} from '@ecine/contracts';
import { z } from 'zod';
import { decodeCursor, encodeCursor } from '../common/cursor.js';
import { ProblemException } from '../common/problem.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { localesFor, visibleWhere } from '../content/content.helpers.js';
import { FilmMapper, filmSummaryInclude } from '../content/film.mapper.js';

const PROGRESS_MIN_INTERVAL_SEC = 10;
const bookmarkCursor = z.object({ d: z.iso.datetime(), f: z.string() });

/**
 * Interactions d'un membre. Chaque méthode reçoit l'identifiant de l'utilisateur authentifié :
 * un membre ne peut lire ou modifier que ses propres données (contrôle BOLA dans le service).
 */
@Injectable()
export class InteractionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly films: FilmMapper,
  ) {}

  async setLike(
    userId: string,
    targetType: LikeTargetType,
    targetId: string,
    liked: boolean,
  ): Promise<LikeState> {
    await this.assertTargetVisible(targetType, targetId);
    if (liked) {
      await this.prisma.like.upsert({
        where: { userId_targetType_targetId: { userId, targetType, targetId } },
        create: { userId, targetType, targetId },
        update: {},
      });
    } else {
      await this.prisma.like.deleteMany({ where: { userId, targetType, targetId } });
    }
    const likeCount = await this.prisma.like.count({ where: { targetType, targetId } });
    return { liked, likeCount };
  }

  async likedIds(userId: string, targetType: LikeTargetType, ids: string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const likes = await this.prisma.like.findMany({
      where: { userId, targetType, targetId: { in: ids } },
      select: { targetId: true },
    });
    return likes.map((l) => l.targetId);
  }

  async setBookmark(userId: string, filmId: string, bookmarked: boolean): Promise<BookmarkState> {
    await this.assertTargetVisible('FILM', filmId);
    if (bookmarked) {
      await this.prisma.bookmark.upsert({
        where: { userId_filmId: { userId, filmId } },
        create: { userId, filmId },
        update: {},
      });
    } else {
      await this.prisma.bookmark.deleteMany({ where: { userId, filmId } });
    }
    return { bookmarked };
  }

  async bookmarks(
    userId: string,
    limit: number,
    cursorRaw: string | undefined,
    locale: string,
  ): Promise<Page<FilmSummary>> {
    const cursor = decodeCursor(cursorRaw, bookmarkCursor);
    const rows = await this.prisma.bookmark.findMany({
      where: {
        userId,
        film: visibleWhere(),
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: new Date(cursor.d) } },
                { createdAt: new Date(cursor.d), filmId: { lt: cursor.f } },
              ],
            }
          : {}),
      },
      include: { film: { include: filmSummaryInclude(localesFor(locale)) } },
      orderBy: [{ createdAt: 'desc' }, { filmId: 'desc' }],
      take: limit + 1,
    });
    const page = rows.slice(0, limit);
    const last = page.at(-1);
    return {
      items: page.map((b) => this.films.summary(b.film, locale)),
      nextCursor:
        rows.length > limit && last
          ? encodeCursor({ d: last.createdAt.toISOString(), f: last.filmId })
          : null,
    };
  }

  /** Progression : au plus une écriture toutes les 10 s par film (les excédents sont ignorés). */
  async saveProgress(userId: string, filmId: string, positionSec: number): Promise<void> {
    try {
      const fresh = await this.redis.client.set(
        `rl:progress:${userId}:${filmId}`,
        '1',
        'EX',
        PROGRESS_MIN_INTERVAL_SEC,
        'NX',
      );
      if (fresh !== 'OK') return;
    } catch {
      // Redis indisponible : on écrit quand même (la base reste la source de vérité).
    }
    await this.assertTargetVisible('FILM', filmId);
    await this.prisma.watchProgress.upsert({
      where: { userId_filmId: { userId, filmId } },
      create: { userId, filmId, positionSec },
      update: { positionSec },
    });
  }

  /**
   * « Me le rappeler » : seulement pour un film annoncé (sortie future). Le rappel est envoyé par
   * e-mail le jour de la sortie (SchedulerService), puis il quitte la liste.
   */
  async setReminder(userId: string, filmId: string, reminded: boolean): Promise<ReminderState> {
    if (!reminded) {
      await this.prisma.reminder.deleteMany({ where: { userId, filmId } });
      return { reminded: false };
    }
    const film = await this.prisma.film.findFirst({
      where: { id: filmId, ...visibleWhere() },
      select: { releaseAt: true },
    });
    if (!film) throw ProblemException.notFound('Ce film est introuvable.');
    if (!film.releaseAt || film.releaseAt <= new Date()) {
      throw ProblemException.conflict('Ce film est déjà disponible : vous pouvez le regarder.');
    }
    await this.prisma.reminder.upsert({
      where: { userId_filmId: { userId, filmId } },
      create: { userId, filmId },
      update: { notifiedAt: null },
    });
    return { reminded: true };
  }

  /** Rappels en attente (Moi → Mes rappels, état des boutons de Nouveautés), sortie la plus proche d'abord. */
  async reminders(userId: string, locale: string): Promise<FilmSummary[]> {
    const rows = await this.prisma.reminder.findMany({
      where: { userId, notifiedAt: null, film: visibleWhere() },
      include: { film: { include: filmSummaryInclude(localesFor(locale)) } },
      orderBy: [{ film: { releaseAt: 'asc' } }, { createdAt: 'asc' }],
      take: 50,
    });
    return rows.map((r) => this.films.summary(r.film, locale));
  }

  async continueWatching(userId: string, locale: string): Promise<ContinueWatchingItem[]> {
    const rows = await this.prisma.watchProgress.findMany({
      where: { userId, positionSec: { gt: 5 }, film: visibleWhere() },
      include: { film: { include: filmSummaryInclude(localesFor(locale)) } },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
    return rows
      .filter((r) => !r.film.runtimeSec || r.positionSec < r.film.runtimeSec * 0.95)
      .map((r) => ({
        film: this.films.summary(r.film, locale),
        positionSec: r.positionSec,
        updatedAt: r.updatedAt.toISOString(),
      }));
  }

  async filmState(userId: string, filmId: string): Promise<ViewerState> {
    const [like, bookmark, progress] = await Promise.all([
      this.prisma.like.findUnique({
        where: { userId_targetType_targetId: { userId, targetType: 'FILM', targetId: filmId } },
      }),
      this.prisma.bookmark.findUnique({ where: { userId_filmId: { userId, filmId } } }),
      this.prisma.watchProgress.findUnique({ where: { userId_filmId: { userId, filmId } } }),
    ]);
    return {
      liked: Boolean(like),
      bookmarked: Boolean(bookmark),
      positionSec: progress?.positionSec ?? null,
    };
  }

  async report(userId: string, input: ReportInput): Promise<void> {
    if (input.targetType !== 'PERSON')
      await this.assertTargetVisible(input.targetType, input.targetId);
    await this.prisma.report.create({
      data: {
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        details: input.details ?? null,
        reporterId: userId,
      },
    });
  }

  private async assertTargetVisible(type: LikeTargetType, id: string): Promise<void> {
    const where = { id, ...visibleWhere() };
    const exists =
      type === 'FILM'
        ? await this.prisma.film.count({ where })
        : type === 'POST'
          ? await this.prisma.post.count({ where })
          : await this.prisma.article.count({ where });
    if (exists === 0) throw ProblemException.notFound('Ce contenu est introuvable.');
  }
}
