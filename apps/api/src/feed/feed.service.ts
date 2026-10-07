import { Injectable } from '@nestjs/common';
import type { FeedItem, FeedPage, FeedQuery } from '@ecine/contracts';
import { decodeCursor, encodeCursor } from '../common/cursor.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CacheService } from '../redis/cache.service.js';
import { localesFor, pickTranslation, visibleWhere } from '../content/content.helpers.js';
import {
  EditorialService,
  articleSummaryInclude,
  postInclude,
} from '../content/editorial.service.js';
import { FilmMapper, filmSummaryInclude } from '../content/film.mapper.js';
import {
  buildFeedPage,
  type FeedEntry,
  feedCursorSchema,
  normalizeSeed,
  type PlacedEntry,
} from './feed.algorithm.js';

const MAX_PINNED = 3;

@Injectable()
export class FeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly films: FilmMapper,
    private readonly editorial: EditorialService,
  ) {}

  async page(query: FeedQuery, locale: string): Promise<FeedPage> {
    const seed = normalizeSeed(query.seed);
    const cursor = decodeCursor(query.cursor, feedCursorSchema);
    const { entries, pinned } = await this.index();
    const { items, next } = buildFeedPage(entries, cursor, query.limit, seed);

    // Épinglés en tête de la première page uniquement (exclus du flux principal).
    const placed: Array<PlacedEntry & { pinned: boolean }> = [
      ...(cursor ? [] : pinned.map((p) => ({ ...p, surprise: false, pinned: true }))),
      ...items.map((i) => ({ ...i, pinned: false })),
    ];
    return {
      items: await this.hydrate(placed, locale),
      nextCursor: next ? encodeCursor(next) : null,
    };
  }

  /** Index léger des contenus visibles (type, id, date), mis en cache 60 s. */
  private index(): Promise<{ entries: FeedEntry[]; pinned: FeedEntry[] }> {
    return this.cache.wrap('feed', 'index', 60, async () => {
      const now = new Date();
      const where = visibleWhere(now);
      const select = { id: true, publishAt: true } as const;
      const [films, posts, articles] = await Promise.all([
        this.prisma.film.findMany({ where, select }),
        this.prisma.post.findMany({ where, select: { ...select, pinnedUntil: true } }),
        this.prisma.article.findMany({ where, select }),
      ]);
      const toEntry = (type: FeedEntry['type']) => (r: { id: string; publishAt: Date | null }) => ({
        type,
        id: r.id,
        publishAt: (r.publishAt ?? now).toISOString(),
      });
      const isPinned = (p: { pinnedUntil: Date | null }) =>
        Boolean(p.pinnedUntil && p.pinnedUntil > now);
      const byRecency = (a: FeedEntry, b: FeedEntry) =>
        a.publishAt === b.publishAt ? (a.id < b.id ? 1 : -1) : a.publishAt < b.publishAt ? 1 : -1;
      const entries = [
        ...films.map(toEntry('film')),
        ...posts.filter((p) => !isPinned(p)).map(toEntry('post')),
        ...articles.map(toEntry('article')),
      ].sort(byRecency);
      const pinned = posts
        .filter(isPinned)
        .map(toEntry('post'))
        .sort(byRecency)
        .slice(0, MAX_PINNED);
      return { entries, pinned };
    });
  }

  private async hydrate(
    placed: Array<PlacedEntry & { pinned: boolean }>,
    locale: string,
  ): Promise<FeedItem[]> {
    const ids = (type: FeedEntry['type']) => placed.filter((p) => p.type === type).map((p) => p.id);
    const locales = localesFor(locale);
    const [films, posts, articles, postLikes] = await Promise.all([
      this.prisma.film.findMany({
        where: { id: { in: ids('film') } },
        include: {
          ...filmSummaryInclude(locales),
          videos: {
            where: { state: 'READY' },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true },
          },
        },
      }),
      this.prisma.post.findMany({ where: { id: { in: ids('post') } }, include: postInclude }),
      this.prisma.article.findMany({
        where: { id: { in: ids('article') } },
        include: articleSummaryInclude(locales),
      }),
      this.prisma.like.groupBy({
        by: ['targetId'],
        where: { targetType: 'POST', targetId: { in: ids('post') } },
        _count: { _all: true },
      }),
    ]);
    const filmById = new Map(films.map((f) => [f.id, f]));
    const postById = new Map(posts.map((p) => [p.id, p]));
    const articleById = new Map(articles.map((a) => [a.id, a]));
    const likesByPost = new Map(postLikes.map((l) => [l.targetId, l._count._all]));

    const items: FeedItem[] = [];
    for (const entry of placed) {
      const base = {
        key: `${entry.type}:${entry.id}`,
        surprise: entry.surprise,
        pinned: entry.pinned,
      };
      if (entry.type === 'film') {
        const film = filmById.get(entry.id);
        if (!film) continue;
        items.push({
          ...base,
          type: 'film',
          film: {
            ...this.films.summary(film, locale),
            synopsis: pickTranslation(film.translations, locale)?.synopsis ?? '',
            videoId: film.videos[0]?.id ?? null,
          },
        });
      } else if (entry.type === 'post') {
        const post = postById.get(entry.id);
        if (!post) continue;
        items.push({
          ...base,
          type: 'post',
          post: this.editorial.postView(post, likesByPost.get(post.id) ?? 0),
        });
      } else {
        const article = articleById.get(entry.id);
        if (!article) continue;
        items.push({
          ...base,
          type: 'article',
          article: this.editorial.articleSummary(article, locale),
        });
      }
    }
    return items;
  }
}
