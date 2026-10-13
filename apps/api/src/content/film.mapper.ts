import { Injectable } from '@nestjs/common';
import type { FilmSummary } from '@ecine/contracts';
import type { Prisma } from '../generated/prisma/client.js';
import { iso, MediaUrls, pickTranslation } from './content.helpers.js';

export function filmSummaryInclude(locales: string[]) {
  return {
    translations: { where: { locale: { in: locales } } },
    poster: true,
    categories: {
      include: { category: { include: { translations: { where: { locale: { in: locales } } } } } },
    },
  } satisfies Prisma.FilmInclude;
}

export type FilmWithSummary = Prisma.FilmGetPayload<{
  include: ReturnType<typeof filmSummaryInclude>;
}>;

@Injectable()
export class FilmMapper {
  constructor(private readonly media: MediaUrls) {}

  summary(film: FilmWithSummary, locale: string): FilmSummary {
    return {
      id: film.id,
      slug: film.slug,
      kind: film.kind,
      title: pickTranslation(film.translations, locale)?.title ?? film.originalTitle ?? film.slug,
      year: film.year,
      runtimeSec: film.runtimeSec,
      poster: this.media.image(film.poster),
      categories: film.categories.map(({ category }) => ({
        slug: category.slug,
        name: pickTranslation(category.translations, locale)?.name ?? category.slug,
      })),
      publishedAt: iso(film.publishAt),
      releaseAt: iso(film.releaseAt),
    };
  }
}
