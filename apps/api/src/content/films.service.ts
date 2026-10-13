import { Injectable } from '@nestjs/common';
import type { Category, FilmDetail, FilmListQuery, FilmSummary, Page } from '@ecine/contracts';
import { z } from 'zod';
import { decodeCursor, encodeCursor } from '../common/cursor.js';
import { ProblemException } from '../common/problem.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CacheService } from '../redis/cache.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import {
  isFilmLanguage,
  iso,
  localesFor,
  MediaUrls,
  pickTranslation,
  visibleWhere,
} from './content.helpers.js';
import { FilmMapper, filmSummaryInclude } from './film.mapper.js';

const listCursor = z.object({ p: z.iso.datetime(), i: z.string() });

@Injectable()
export class FilmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly mapper: FilmMapper,
    private readonly media: MediaUrls,
  ) {}

  list(query: FilmListQuery, locale: string): Promise<Page<FilmSummary>> {
    const key = `${locale}:${query.kind ?? ''}:${query.category ?? ''}:${query.year ?? ''}:${query.limit}:${query.cursor ?? ''}`;
    return this.cache.wrap('films', key, 120, async () => {
      const cursor = decodeCursor(query.cursor, listCursor);
      const where: Prisma.FilmWhereInput = {
        ...visibleWhere(),
        ...(query.kind ? { kind: query.kind } : {}),
        ...(query.year ? { year: query.year } : {}),
        ...(query.category ? { categories: { some: { category: { slug: query.category } } } } : {}),
        ...(cursor
          ? {
              OR: [
                { publishAt: { lt: new Date(cursor.p) } },
                { publishAt: new Date(cursor.p), id: { lt: cursor.i } },
              ],
            }
          : {}),
      };
      const films = await this.prisma.film.findMany({
        where,
        include: filmSummaryInclude(localesFor(locale)),
        orderBy: [{ publishAt: 'desc' }, { id: 'desc' }],
        take: query.limit + 1,
      });
      const hasMore = films.length > query.limit;
      const page = films.slice(0, query.limit);
      const last = page.at(-1);
      return {
        items: page.map((f) => this.mapper.summary(f, locale)),
        nextCursor:
          hasMore && last?.publishAt
            ? encodeCursor({ p: last.publishAt.toISOString(), i: last.id })
            : null,
      };
    });
  }

  async detail(slug: string, locale: string): Promise<FilmDetail> {
    const base = await this.cache.wrap(
      'films',
      `detail:${locale}:${slug}`,
      300,
      async (): Promise<Omit<FilmDetail, 'likeCount'>> => {
        const locales = localesFor(locale);
        const film = await this.prisma.film.findFirst({
          where: { slug, ...visibleWhere() },
          include: {
            ...filmSummaryInclude(locales),
            titleImage: true,
            credits: {
              where: { person: { deletedAt: null, state: 'PUBLISHED' } },
              orderBy: [{ position: 'asc' }, { id: 'asc' }],
              include: {
                person: {
                  include: { translations: { where: { locale: { in: locales } } }, photo: true },
                },
              },
            },
            videos: {
              where: { state: 'READY' },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { id: true },
            },
          },
        });
        if (!film) throw ProblemException.notFound('Ce film est introuvable.');
        const t = pickTranslation(film.translations, locale);
        // Film annoncé (« Bientôt ») : sa page est visible, mais il n'est pas lisible avant sa sortie.
        const upcoming = film.releaseAt !== null && film.releaseAt > new Date();
        return {
          ...this.mapper.summary(film, locale),
          originalTitle: film.originalTitle,
          synopsis: t?.synopsis ?? '',
          tagline: t?.tagline ?? null,
          ageRating: film.ageRating,
          audioLanguages: film.audioLanguages.filter(isFilmLanguage),
          subtitleLanguages: film.subtitleLanguages.filter(isFilmLanguage),
          filmingLocation: film.filmingLocation,
          titleImage: this.media.image(film.titleImage),
          creditsStartSec: film.creditsStartSec,
          availableUntil: iso(film.availableUntil),
          trailerUrl: film.trailerUrl,
          videoId: upcoming ? null : (film.videos[0]?.id ?? null),
          credits: film.credits.map((c) => ({
            role: c.role,
            character: c.character,
            person: {
              slug: c.person.slug,
              name: pickTranslation(c.person.translations, locale)?.name ?? c.person.slug,
              photo: this.media.image(c.person.photo),
            },
          })),
          seo: {
            title: t?.seoTitle ?? null,
            description: t?.seoDescription ?? null,
            noIndex: film.seoNoIndex,
          },
          updatedAt: film.updatedAt.toISOString(),
        };
      },
    );
    // Compteur calculé à chaque lecture (index likes(targetType, targetId)) : jamais périmé.
    const likeCount = await this.prisma.like.count({
      where: { targetType: 'FILM', targetId: base.id },
    });
    return { ...base, likeCount };
  }

  categories(locale: string): Promise<Category[]> {
    return this.cache.wrap('categories', locale, 600, async () => {
      const categories = await this.prisma.category.findMany({
        where: { films: { some: { film: visibleWhere() } } },
        include: { translations: { where: { locale: { in: localesFor(locale) } } } },
        orderBy: { slug: 'asc' },
      });
      return categories.map((c) => ({
        slug: c.slug,
        name: pickTranslation(c.translations, locale)?.name ?? c.slug,
      }));
    });
  }
}
