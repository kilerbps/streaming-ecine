import { Injectable } from '@nestjs/common';
import type { SearchResults } from '@ecine/contracts';
import { PrismaService } from '../prisma/prisma.service.js';
import { CacheService } from '../redis/cache.service.js';
import { Prisma } from '../generated/prisma/client.js';
import {
  localesFor,
  MediaUrls,
  pickTranslation,
  visibleWhere,
} from '../content/content.helpers.js';
import { articleSummaryInclude, EditorialService } from '../content/editorial.service.js';
import { FilmMapper, filmSummaryInclude } from '../content/film.mapper.js';

interface Hit {
  id: string;
}

/**
 * Recherche PostgreSQL (FR-060 à FR-062) : `unaccent` + `pg_trgm` (tolérance aux fautes) + plein texte
 * français. Classement : correspondance exacte > préfixe > similarité trigramme > rang plein texte.
 * Requêtes paramétrées uniquement (Prisma.sql), jamais de concaténation.
 */
@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly films: FilmMapper,
    private readonly editorial: EditorialService,
    private readonly media: MediaUrls,
  ) {}

  search(q: string, limit: number, locale: string): Promise<SearchResults> {
    const normalized = q.trim().replace(/\s+/g, ' ');
    return this.cache.wrap('search', `${locale}:${limit}:${normalized.toLowerCase()}`, 60, () =>
      this.run(normalized, limit, locale),
    );
  }

  private async run(q: string, limit: number, locale: string): Promise<SearchResults> {
    const locales = localesFor(locale);
    const now = new Date();
    const [filmHits, personHits, articleHits, categoryHits] = await Promise.all([
      this.prisma.$queryRaw<Hit[]>(Prisma.sql`
        SELECT f.id FROM films f
        JOIN film_translations t ON t."filmId" = f.id AND t.locale IN (${Prisma.join(locales)})
        WHERE f."deletedAt" IS NULL AND f.state IN ('PUBLISHED', 'SCHEDULED') AND f."publishAt" <= ${now}
          AND (
            word_similarity(f_unaccent(lower(${q})), f_unaccent(lower(t.title))) > 0.3
            OR f_unaccent(lower(t.title)) LIKE '%' || f_unaccent(lower(${q})) || '%'
            OR t.search_vector @@ websearch_to_tsquery('french', f_unaccent(${q}))
          )
        GROUP BY f.id
        ORDER BY max(${this.score(Prisma.sql`t.title`, q)} + ts_rank(t.search_vector, websearch_to_tsquery('french', f_unaccent(${q})))) DESC
        LIMIT ${limit}`),
      this.prisma.$queryRaw<Hit[]>(Prisma.sql`
        SELECT p.id FROM people p
        JOIN person_translations t ON t."personId" = p.id AND t.locale IN (${Prisma.join(locales)})
        WHERE p."deletedAt" IS NULL AND p.state = 'PUBLISHED'
          AND (word_similarity(f_unaccent(lower(${q})), f_unaccent(lower(t.name))) > 0.3
               OR f_unaccent(lower(t.name)) LIKE '%' || f_unaccent(lower(${q})) || '%')
        GROUP BY p.id
        ORDER BY max(${this.score(Prisma.sql`t.name`, q)}) DESC
        LIMIT ${limit}`),
      this.prisma.$queryRaw<Hit[]>(Prisma.sql`
        SELECT a.id FROM articles a
        JOIN article_translations t ON t."articleId" = a.id AND t.locale IN (${Prisma.join(locales)})
        WHERE a."deletedAt" IS NULL AND a.state IN ('PUBLISHED', 'SCHEDULED') AND a."publishAt" <= ${now}
          AND (word_similarity(f_unaccent(lower(${q})), f_unaccent(lower(t.title))) > 0.3
               OR f_unaccent(lower(t.title)) LIKE '%' || f_unaccent(lower(${q})) || '%'
               OR t.search_vector @@ websearch_to_tsquery('french', f_unaccent(${q})))
        GROUP BY a.id
        ORDER BY max(${this.score(Prisma.sql`t.title`, q)}) DESC
        LIMIT ${limit}`),
      this.prisma.$queryRaw<Hit[]>(Prisma.sql`
        SELECT c.id FROM categories c
        JOIN category_translations t ON t."categoryId" = c.id AND t.locale IN (${Prisma.join(locales)})
        WHERE word_similarity(f_unaccent(lower(${q})), f_unaccent(lower(t.name))) > 0.3
           OR f_unaccent(lower(t.name)) LIKE '%' || f_unaccent(lower(${q})) || '%'
        GROUP BY c.id
        LIMIT 5`),
    ]);

    const order = (hits: Hit[]) => new Map(hits.map((h, i) => [h.id, i]));
    const byRank = <T extends { id: string }>(rows: T[], rank: Map<string, number>) =>
      rows.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));

    const [films, people, articles, categories] = await Promise.all([
      this.prisma.film.findMany({
        where: { id: { in: filmHits.map((h) => h.id) }, ...visibleWhere(now) },
        include: filmSummaryInclude(locales),
      }),
      this.prisma.person.findMany({
        where: { id: { in: personHits.map((h) => h.id) } },
        include: {
          translations: { where: { locale: { in: locales } } },
          photo: true,
          credits: { select: { role: true } },
        },
      }),
      this.prisma.article.findMany({
        where: { id: { in: articleHits.map((h) => h.id) } },
        include: articleSummaryInclude(locales),
      }),
      this.prisma.category.findMany({
        where: { id: { in: categoryHits.map((h) => h.id) } },
        include: { translations: { where: { locale: { in: locales } } } },
      }),
    ]);

    return {
      q,
      films: byRank(films, order(filmHits)).map((f) => this.films.summary(f, locale)),
      people: byRank(people, order(personHits)).map((p) => ({
        id: p.id,
        slug: p.slug,
        name: pickTranslation(p.translations, locale)?.name ?? p.slug,
        photo: this.media.image(p.photo),
        roles: [...new Set(p.credits.map((c) => c.role))],
      })),
      articles: byRank(articles, order(articleHits)).map((a) =>
        this.editorial.articleSummary(a, locale),
      ),
      categories: categories.map((c) => ({
        slug: c.slug,
        name: pickTranslation(c.translations, locale)?.name ?? c.slug,
      })),
    };
  }

  /** Score : exact (3) > préfixe (2) > similarité trigramme par mot (0..1, tolère les fautes). */
  private score(column: Prisma.Sql, q: string): Prisma.Sql {
    return Prisma.sql`(
      CASE WHEN f_unaccent(lower(${column})) = f_unaccent(lower(${q})) THEN 3
           WHEN f_unaccent(lower(${column})) LIKE f_unaccent(lower(${q})) || '%' THEN 2
           ELSE 0 END
      + word_similarity(f_unaccent(lower(${q})), f_unaccent(lower(${column}))))`;
  }
}
