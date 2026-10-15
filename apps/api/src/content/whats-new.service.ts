import { Injectable } from '@nestjs/common';
import type { WhatsNew } from '@ecine/contracts';
import { PrismaService } from '../prisma/prisma.service.js';
import { CacheService } from '../redis/cache.service.js';
import { isFilmLanguage, localesFor, pickTranslation, visibleWhere } from './content.helpers.js';
import { articleSummaryInclude, EditorialService } from './editorial.service.js';
import { FilmMapper, filmSummaryInclude } from './film.mapper.js';

/** Au plus 30 films annoncés et 30 événements : Nouveautés n'est pas un catalogue. */
const MAX_ITEMS = 30;

/**
 * Nouveautés (docs/design/04, Nouveautés) : films annoncés, sortie la plus proche d'abord ; événements
 * à venir (les passés sont masqués), prochain d'abord. Les actualités gardent leur propre liste.
 */
@Injectable()
export class WhatsNewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly films: FilmMapper,
    private readonly editorial: EditorialService,
  ) {}

  whatsNew(locale: string): Promise<WhatsNew> {
    return this.cache.wrap('whats-new', locale, 120, async () => {
      const now = new Date();
      const locales = localesFor(locale);
      const [films, events] = await Promise.all([
        this.prisma.film.findMany({
          where: { ...visibleWhere(now), releaseAt: { gt: now } },
          orderBy: [{ releaseAt: 'asc' }, { id: 'asc' }],
          take: MAX_ITEMS,
          include: filmSummaryInclude(locales),
        }),
        this.prisma.article.findMany({
          where: { ...visibleWhere(now), kind: 'EVENT', eventStart: { gte: now } },
          orderBy: [{ eventStart: 'asc' }, { id: 'asc' }],
          take: MAX_ITEMS,
          include: {
            ...articleSummaryInclude(locales),
            featuredFilm: {
              select: {
                slug: true,
                deletedAt: true,
                state: true,
                publishAt: true,
                translations: {
                  where: { locale: { in: locales } },
                  select: { locale: true, title: true },
                },
              },
            },
          },
        }),
      ]);
      return {
        films: films.map((film) => ({
          ...this.films.summary(film, locale),
          // Filtré par la requête : une date future est toujours présente.
          releaseAt: (film.releaseAt ?? now).toISOString(),
          synopsis: pickTranslation(film.translations, locale)?.synopsis ?? '',
          audioLanguages: film.audioLanguages.filter(isFilmLanguage),
        })),
        events: events.map((article) => {
          const linked = article.featuredFilm;
          const linkedVisible =
            linked !== null &&
            linked.deletedAt === null &&
            (linked.state === 'PUBLISHED' || linked.state === 'SCHEDULED') &&
            linked.publishAt !== null &&
            linked.publishAt <= now;
          return {
            ...this.editorial.articleSummary(article, locale),
            eventStart: (article.eventStart ?? now).toISOString(),
            featuredFilm:
              linked && linkedVisible
                ? {
                    slug: linked.slug,
                    title: pickTranslation(linked.translations, locale)?.title ?? linked.slug,
                  }
                : null,
          };
        }),
      };
    });
  }
}
