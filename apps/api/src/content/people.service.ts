import { Injectable } from '@nestjs/common';
import type { CreditRole, Page, PersonDetail, PersonSummary } from '@ecine/contracts';
import { socialsSchema } from '@ecine/contracts';
import { z } from 'zod';
import { decodeCursor, encodeCursor } from '../common/cursor.js';
import { ProblemException } from '../common/problem.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CacheService } from '../redis/cache.service.js';
import { localesFor, MediaUrls, pickTranslation, visibleWhere } from './content.helpers.js';
import { FilmMapper, filmSummaryInclude } from './film.mapper.js';

const listCursor = z.object({ s: z.string() });

function uniqueRoles(roles: CreditRole[]): CreditRole[] {
  return [...new Set(roles)];
}

@Injectable()
export class PeopleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly media: MediaUrls,
    private readonly films: FilmMapper,
  ) {}

  list(limit: number, cursorRaw: string | undefined, locale: string): Promise<Page<PersonSummary>> {
    return this.cache.wrap(
      'people',
      `list:${locale}:${limit}:${cursorRaw ?? ''}`,
      300,
      async () => {
        const cursor = decodeCursor(cursorRaw, listCursor);
        const people = await this.prisma.person.findMany({
          where: {
            state: 'PUBLISHED',
            deletedAt: null,
            ...(cursor ? { slug: { gt: cursor.s } } : {}),
          },
          include: {
            translations: { where: { locale: { in: localesFor(locale) } } },
            photo: true,
            credits: { where: { film: visibleWhere() }, select: { role: true } },
          },
          orderBy: { slug: 'asc' },
          take: limit + 1,
        });
        const page = people.slice(0, limit);
        const last = page.at(-1);
        return {
          items: page.map((p) => ({
            id: p.id,
            slug: p.slug,
            name: pickTranslation(p.translations, locale)?.name ?? p.slug,
            photo: this.media.image(p.photo),
            roles: uniqueRoles(p.credits.map((c) => c.role)),
          })),
          nextCursor: people.length > limit && last ? encodeCursor({ s: last.slug }) : null,
        };
      },
    );
  }

  detail(slug: string, locale: string): Promise<PersonDetail> {
    return this.cache.wrap('people', `detail:${locale}:${slug}`, 300, async () => {
      const locales = localesFor(locale);
      const person = await this.prisma.person.findFirst({
        where: { slug, state: 'PUBLISHED', deletedAt: null },
        include: {
          translations: { where: { locale: { in: locales } } },
          photo: true,
          credits: {
            where: { film: visibleWhere() },
            include: { film: { include: filmSummaryInclude(locales) } },
            orderBy: [{ film: { year: 'desc' } }, { position: 'asc' }],
          },
        },
      });
      if (!person) throw ProblemException.notFound('Cette personne est introuvable.');
      const t = pickTranslation(person.translations, locale);
      const socials = socialsSchema.safeParse(person.socials ?? {});
      return {
        id: person.id,
        slug: person.slug,
        name: t?.name ?? person.slug,
        photo: this.media.image(person.photo),
        roles: uniqueRoles(person.credits.map((c) => c.role)),
        bio: t?.bio ?? '',
        birthYear: person.birthYear,
        socials: socials.success ? socials.data : {},
        filmography: person.credits.map((c) => ({
          role: c.role,
          character: c.character,
          film: this.films.summary(c.film, locale),
        })),
        updatedAt: person.updatedAt.toISOString(),
      };
    });
  }
}
