import { Injectable } from '@nestjs/common';
import type { PersonalHome, PersonalHomeInput } from '@ecine/contracts';
import { PrismaService } from '../prisma/prisma.service.js';
import { localesFor, pickTranslation, playableWhere, visibleWhere } from './content.helpers.js';
import { FilmMapper, filmSummaryInclude } from './film.mapper.js';
import { HOME_RULES } from './home.service.js';

/** « Un film regardé au-delà de 10 min » (docs/design/04, Accueil, rangée 4). */
const WATCHED_MIN_SEC = 600;
const CANDIDATES = 40;
const ROW_MAX = 10;

interface Signals {
  history: string[];
  dismissed: string[];
  tastes: string[];
}

/**
 * Partie personnelle de l'accueil (ADR-0014). Membre : son historique, ses goûts et ses « Pas pour
 * moi » en base. Visiteur : les mêmes données, lues par le site dans les cookies de l'appareil
 * (catégorie « Personnalisation » acceptée). Jamais mise en cache : propre à chaque personne.
 */
@Injectable()
export class PersonalHomeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: FilmMapper,
  ) {}

  async personal(
    input: Required<PersonalHomeInput>,
    userId: string | null,
    locale: string,
  ): Promise<PersonalHome> {
    const signals = userId ? await this.memberSignals(userId) : input;
    const [becauseWatched, categoryOrder] = await Promise.all([
      this.becauseWatched(signals, locale),
      this.categoryOrder(signals),
    ]);
    return { becauseWatched, categoryOrder, hidden: signals.dismissed };
  }

  private async memberSignals(userId: string): Promise<Signals> {
    const now = new Date();
    const [progress, dismissals, tastes] = await Promise.all([
      this.prisma.watchProgress.findMany({
        where: { userId, positionSec: { gte: WATCHED_MIN_SEC }, film: visibleWhere(now) },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: { filmId: true },
      }),
      this.prisma.filmDismissal.findMany({
        where: { userId, expiresAt: { gt: now } },
        select: { filmId: true },
      }),
      this.prisma.userTaste.findMany({
        where: { userId },
        select: { category: { select: { slug: true } } },
      }),
    ]);
    return {
      history: progress.map((p) => p.filmId),
      dismissed: dismissals.map((d) => d.filmId),
      tastes: tastes.map((t) => t.category.slug),
    };
  }

  /** Titres qui partagent des catégories ou des talents avec le dernier film regardé. */
  private async becauseWatched(
    signals: Signals,
    locale: string,
  ): Promise<PersonalHome['becauseWatched']> {
    const anchorId = signals.history[0];
    if (!anchorId) return null;
    const locales = localesFor(locale);
    const anchor = await this.prisma.film.findFirst({
      where: { id: anchorId, ...visibleWhere() },
      select: {
        slug: true,
        originalTitle: true,
        translations: { where: { locale: { in: locales } } },
        categories: { select: { categoryId: true } },
        credits: { select: { personId: true } },
      },
    });
    if (!anchor) return null;
    const categoryIds = anchor.categories.map((c) => c.categoryId);
    const personIds = [...new Set(anchor.credits.map((c) => c.personId))];
    if (categoryIds.length === 0 && personIds.length === 0) return null;
    const excluded = [...new Set([...signals.history, ...signals.dismissed])];
    const candidates = await this.prisma.film.findMany({
      where: {
        ...playableWhere(),
        id: { notIn: excluded },
        OR: [
          ...(categoryIds.length
            ? [{ categories: { some: { categoryId: { in: categoryIds } } } }]
            : []),
          ...(personIds.length ? [{ credits: { some: { personId: { in: personIds } } } }] : []),
        ],
      },
      orderBy: [{ publishAt: 'desc' }, { id: 'desc' }],
      take: CANDIDATES,
      include: {
        ...filmSummaryInclude(locales),
        credits: { select: { personId: true } },
      },
    });
    const score = (film: (typeof candidates)[number]) =>
      film.categories.filter((c) => categoryIds.includes(c.category.id)).length * 2 +
      new Set(film.credits.map((c) => c.personId).filter((id) => personIds.includes(id))).size * 3;
    const films = candidates
      .map((film, index) => ({ film, index, score: score(film) }))
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, ROW_MAX)
      .map(({ film }) => this.mapper.summary(film, locale));
    if (films.length < HOME_RULES.newMin) return null;
    const title =
      pickTranslation(anchor.translations, locale)?.title ?? anchor.originalTitle ?? anchor.slug;
    return { title, films };
  }

  /** Catégories par affinité : goûts (3 points chacun), puis catégories des films regardés (1 point). */
  private async categoryOrder(signals: Signals): Promise<string[]> {
    const scores = new Map<string, number>();
    for (const slug of signals.tastes) scores.set(slug, (scores.get(slug) ?? 0) + 3);
    if (signals.history.length > 0) {
      const watched = await this.prisma.filmCategory.findMany({
        where: { filmId: { in: signals.history } },
        select: { category: { select: { slug: true } } },
      });
      for (const { category } of watched)
        scores.set(category.slug, (scores.get(category.slug) ?? 0) + 1);
    }
    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([slug]) => slug);
  }
}
