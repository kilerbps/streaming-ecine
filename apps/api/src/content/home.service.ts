import { Injectable } from '@nestjs/common';
import type { Home, HomeFeatured, HomeRow, PersonSummary } from '@ecine/contracts';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CacheService } from '../redis/cache.service.js';
import {
  isFilmLanguage,
  localesFor,
  MediaUrls,
  pickTranslation,
  playableWhere,
  visibleWhere,
} from './content.helpers.js';
import { FilmMapper, filmSummaryInclude } from './film.mapper.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Règles d'affichage des rangées (docs/design/04-ecrans-publics.md, Accueil, « Ordre des rangées »).
 * Une rangée sous son seuil n'est pas affichée : jamais de rangée maigre.
 */
export const HOME_RULES = {
  featuredMax: 5,
  /** 12 rangées au plus, Reprendre (ajoutée par le site) comprise. */
  rowsMax: 11,
  tilesMax: 20,
  top10Min: 10,
  newWindowDays: 30,
  newMin: 6,
  shortsMaxRuntimeSec: 15 * 60,
  shortsMin: 6,
  soonMin: 1,
  talentsMin: 6,
  editorialMin: 1,
  categoryMin: 6,
} as const;

/** Rangées dans l'ordre de la spécification ; les rangées éditoriales gardent leur ordre choisi. */
export function orderHomeRows(rows: {
  top10: HomeRow | null;
  fresh: HomeRow | null;
  shorts: HomeRow | null;
  soon: HomeRow | null;
  talents: HomeRow | null;
  editorial: HomeRow[];
  categories: HomeRow[];
}): HomeRow[] {
  return [
    rows.top10,
    rows.fresh,
    rows.shorts,
    rows.soon,
    rows.talents,
    ...rows.editorial,
    ...rows.categories,
  ]
    .filter((row): row is HomeRow => row !== null)
    .slice(0, HOME_RULES.rowsMax);
}

@Injectable()
export class HomeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly mapper: FilmMapper,
    private readonly media: MediaUrls,
  ) {}

  home(locale: string): Promise<Home> {
    return this.cache.wrap('home', locale, 120, async () => {
      const now = new Date();
      const [featured, top10, fresh, shorts, soon, talents, editorial, categories] =
        await Promise.all([
          this.featured(locale, now),
          this.top10(locale, now),
          this.filmRow(locale, 'new', HOME_RULES.newMin, {
            where: {
              ...playableWhere(now),
              publishAt: {
                lte: now,
                gte: new Date(now.getTime() - HOME_RULES.newWindowDays * DAY_MS),
              },
            },
            orderBy: [{ publishAt: 'desc' }, { id: 'desc' }],
          }),
          this.filmRow(locale, 'shorts', HOME_RULES.shortsMin, {
            where: {
              ...playableWhere(now),
              kind: 'SHORT',
              runtimeSec: { lte: HOME_RULES.shortsMaxRuntimeSec },
            },
            orderBy: [{ publishAt: 'desc' }, { id: 'desc' }],
          }),
          this.filmRow(locale, 'soon', HOME_RULES.soonMin, {
            where: { ...visibleWhere(now), releaseAt: { gt: now } },
            orderBy: [{ releaseAt: 'asc' }, { id: 'asc' }],
          }),
          this.talents(locale, now),
          this.editorial(locale, now),
          this.categories(locale, now),
        ]);
      return {
        featured,
        rows: orderHomeRows({ top10, fresh, shorts, soon, talents, editorial, categories }),
      };
    });
  }

  /** Affiche à la une : emplacements programmés en cours, complétés par les derniers films publiés. */
  private async featured(locale: string, now: Date): Promise<HomeFeatured[]> {
    const locales = localesFor(locale);
    const include = {
      ...filmSummaryInclude(locales),
      titleImage: true,
      videos: { where: { state: 'READY' as const }, take: 1, select: { id: true } },
    } satisfies Prisma.FilmInclude;
    const [slots, latest] = await Promise.all([
      this.prisma.featuredSlot.findMany({
        where: {
          startsAt: { lte: now },
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
          film: visibleWhere(now),
        },
        orderBy: [{ position: 'asc' }, { startsAt: 'desc' }],
        include: { film: { include } },
      }),
      this.prisma.film.findMany({
        where: visibleWhere(now),
        orderBy: [{ publishAt: 'desc' }, { id: 'desc' }],
        take: HOME_RULES.featuredMax,
        include,
      }),
    ]);
    const films = [...slots.map((slot) => slot.film), ...latest].filter(
      (film, index, all) => all.findIndex((f) => f.id === film.id) === index,
    );
    return films.slice(0, HOME_RULES.featuredMax).map((film) => ({
      film: this.mapper.summary(film, locale),
      tagline: pickTranslation(film.translations, locale)?.tagline ?? null,
      titleImage: this.media.image(film.titleImage),
      audioLanguages: film.audioLanguages.filter(isFilmLanguage),
      playable: film.videos.length > 0 && (film.releaseAt === null || film.releaseAt <= now),
    }));
  }

  /** Top 10 : dernier instantané quotidien (calculé par le worker), affiché s'il compte 10 titres. */
  private async top10(locale: string, now: Date): Promise<HomeRow | null> {
    const last = await this.prisma.topTenEntry.findFirst({
      orderBy: { day: 'desc' },
      select: { day: true },
    });
    if (!last) return null;
    const entries = await this.prisma.topTenEntry.findMany({
      where: { day: last.day, film: visibleWhere(now) },
      orderBy: { rank: 'asc' },
      include: { film: { include: filmSummaryInclude(localesFor(locale)) } },
    });
    if (entries.length < HOME_RULES.top10Min) return null;
    return { kind: 'top10', films: entries.map((e) => this.mapper.summary(e.film, locale)) };
  }

  private async filmRow(
    locale: string,
    kind: 'new' | 'shorts' | 'soon',
    min: number,
    query: { where: Prisma.FilmWhereInput; orderBy: Prisma.FilmOrderByWithRelationInput[] },
  ): Promise<HomeRow | null> {
    const films = await this.prisma.film.findMany({
      ...query,
      take: HOME_RULES.tilesMax,
      include: filmSummaryInclude(localesFor(locale)),
    });
    if (films.length < min) return null;
    return { kind, films: films.map((f) => this.mapper.summary(f, locale)) };
  }

  private async talents(locale: string, now: Date): Promise<HomeRow | null> {
    const rows = await this.prisma.homeTalent.findMany({
      where: { person: { state: 'PUBLISHED', deletedAt: null } },
      orderBy: { position: 'asc' },
      include: {
        person: {
          include: {
            translations: { where: { locale: { in: localesFor(locale) } } },
            photo: true,
            credits: { where: { film: visibleWhere(now) }, select: { role: true } },
          },
        },
      },
    });
    if (rows.length < HOME_RULES.talentsMin) return null;
    const people: PersonSummary[] = rows.map(({ person }) => ({
      id: person.id,
      slug: person.slug,
      name: pickTranslation(person.translations, locale)?.name ?? person.slug,
      photo: this.media.image(person.photo),
      roles: [...new Set(person.credits.map((c) => c.role))],
    }));
    return { kind: 'talents', people };
  }

  /** Rangées éditoriales en cours de programmation, dans l'ordre choisi par l'équipe. */
  private async editorial(locale: string, now: Date): Promise<HomeRow[]> {
    const locales = localesFor(locale);
    const rows = await this.prisma.homeRow.findMany({
      where: {
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        ],
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      include: {
        translations: { where: { locale: { in: locales } } },
        items: {
          where: { film: visibleWhere(now) },
          orderBy: { position: 'asc' },
          take: HOME_RULES.tilesMax,
          include: { film: { include: filmSummaryInclude(locales) } },
        },
      },
    });
    return rows
      .filter((row) => row.items.length >= HOME_RULES.editorialMin)
      .map((row) => ({
        kind: 'editorial' as const,
        id: row.id,
        title: pickTranslation(row.translations, locale)?.title ?? '',
        films: row.items.map((item) => this.mapper.summary(item.film, locale)),
      }))
      .filter((row) => row.title !== '');
  }

  /**
   * Rangées par catégorie (6 titres lisibles au moins), les plus fournies d'abord. L'ordre par
   * affinité de la personne viendra avec l'historique de personnalisation (ADR-0012, point 2).
   */
  private async categories(locale: string, now: Date): Promise<HomeRow[]> {
    const locales = localesFor(locale);
    const playable = { film: playableWhere(now) };
    const categories = await this.prisma.category.findMany({
      where: { films: { some: playable } },
      include: {
        translations: { where: { locale: { in: locales } } },
        films: {
          where: playable,
          orderBy: { film: { publishAt: 'desc' } },
          take: HOME_RULES.tilesMax,
          include: { film: { include: filmSummaryInclude(locales) } },
        },
      },
    });
    return categories
      .filter((c) => c.films.length >= HOME_RULES.categoryMin)
      .sort((a, b) => b.films.length - a.films.length || a.slug.localeCompare(b.slug))
      .map((c) => ({
        kind: 'category' as const,
        slug: c.slug,
        name: pickTranslation(c.translations, locale)?.name ?? c.slug,
        films: c.films.map(({ film }) => this.mapper.summary(film, locale)),
      }));
  }
}
