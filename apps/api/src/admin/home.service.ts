import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { DEFAULT_LOCALE, type AdminHome, type AdminPick, type HomeInput } from '@ecine/contracts';
import { AuditService } from '../audit/audit.service.js';
import { ProblemException } from '../common/problem.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ContentEventsService } from '../revalidate/content-events.service.js';

const FR = DEFAULT_LOCALE;

const filmPickInclude = {
  translations: { where: { locale: FR }, select: { title: true } },
} satisfies Prisma.FilmInclude;
type FilmPickRow = Prisma.FilmGetPayload<{ include: typeof filmPickInclude }>;

function filmPick(film: FilmPickRow): AdminPick {
  return {
    id: film.id,
    title: film.translations[0]?.title ?? film.originalTitle ?? film.slug,
    meta: [film.year, film.deletedAt ? 'à la corbeille' : null].filter(Boolean).join(' · ') || null,
  };
}

const iso = (date: Date | null) => (date ? date.toISOString() : null);

/**
 * Programmation de l'accueil (docs/design/05-admin.md, Accueil) : affiche à la une, rangées
 * éditoriales et talents à l'honneur, enregistrés ensemble. Les rangées automatiques et le Top 10
 * sont calculés : l'équipe les consulte, sans pouvoir les modifier.
 */
@Injectable()
export class AdminHomeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: ContentEventsService,
  ) {}

  async get(): Promise<AdminHome> {
    const [slots, rows, talents, last] = await Promise.all([
      this.prisma.featuredSlot.findMany({
        orderBy: [{ position: 'asc' }, { startsAt: 'asc' }],
        include: { film: { include: filmPickInclude } },
      }),
      this.prisma.homeRow.findMany({
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        include: {
          translations: { where: { locale: FR } },
          items: { orderBy: { position: 'asc' }, include: { film: { include: filmPickInclude } } },
        },
      }),
      this.prisma.homeTalent.findMany({
        orderBy: { position: 'asc' },
        include: { person: { include: { translations: { where: { locale: FR } } } } },
      }),
      this.prisma.topTenEntry.findFirst({ orderBy: { day: 'desc' }, select: { day: true } }),
    ]);
    const top10 = last
      ? await this.prisma.topTenEntry.findMany({
          where: { day: last.day },
          orderBy: { rank: 'asc' },
          include: { film: { include: filmPickInclude } },
        })
      : [];
    return {
      featured: slots.map((slot) => ({
        film: filmPick(slot.film),
        startsAt: slot.startsAt.toISOString(),
        endsAt: iso(slot.endsAt),
        previewVideo: slot.previewVideo,
      })),
      rows: rows.map((row) => ({
        id: row.id,
        title: row.translations[0]?.title ?? '',
        startsAt: iso(row.startsAt),
        endsAt: iso(row.endsAt),
        films: row.items.map((item) => filmPick(item.film)),
      })),
      talents: talents.map(({ person }) => ({
        id: person.id,
        title: person.translations[0]?.name ?? person.slug,
        meta: person.state === 'PUBLISHED' && !person.deletedAt ? null : 'non publié',
      })),
      top10: last
        ? {
            day: last.day.toISOString().slice(0, 10),
            entries: top10.map((entry) => ({
              rank: entry.rank,
              title: filmPick(entry.film).title,
              viewers: entry.viewers,
            })),
          }
        : null,
    };
  }

  /** Remplace toute la programmation en une transaction ; s'applique dès l'enregistrement. */
  async update(req: Request, input: HomeInput): Promise<AdminHome> {
    const filmIds = [
      ...new Set([...input.featured.map((s) => s.filmId), ...input.rows.flatMap((r) => r.filmIds)]),
    ];
    const [films, people] = await Promise.all([
      this.prisma.film.findMany({
        where: { id: { in: filmIds }, deletedAt: null },
        select: { id: true },
      }),
      this.prisma.person.findMany({
        where: { id: { in: input.talentIds }, deletedAt: null, state: 'PUBLISHED' },
        select: { id: true },
      }),
    ]);
    if (films.length !== filmIds.length) {
      throw ProblemException.badRequest('Un des films choisis est introuvable ou à la corbeille.');
    }
    if (people.length !== input.talentIds.length) {
      throw ProblemException.badRequest('Un des talents choisis est introuvable ou non publié.');
    }
    const keptRowIds = input.rows.flatMap((row) => (row.id ? [row.id] : []));
    if (keptRowIds.length > 0) {
      const existing = await this.prisma.homeRow.count({ where: { id: { in: keptRowIds } } });
      if (existing !== keptRowIds.length) {
        throw ProblemException.badRequest("Une des rangées n'existe plus : rechargez la page.");
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.featuredSlot.deleteMany({});
      await tx.featuredSlot.createMany({
        data: input.featured.map((slot, index) => ({
          filmId: slot.filmId,
          position: index + 1,
          startsAt: new Date(slot.startsAt),
          endsAt: slot.endsAt ? new Date(slot.endsAt) : null,
          previewVideo: slot.previewVideo,
        })),
      });

      await tx.homeRow.deleteMany({ where: { id: { notIn: keptRowIds } } });
      for (const [index, row] of input.rows.entries()) {
        const data = {
          position: index + 1,
          startsAt: row.startsAt ? new Date(row.startsAt) : null,
          endsAt: row.endsAt ? new Date(row.endsAt) : null,
        };
        const items = row.filmIds.map((filmId, position) => ({ filmId, position: position + 1 }));
        if (row.id) {
          await tx.homeRowItem.deleteMany({ where: { rowId: row.id } });
          await tx.homeRow.update({
            where: { id: row.id },
            data: {
              ...data,
              translations: {
                upsert: {
                  where: { rowId_locale: { rowId: row.id, locale: FR } },
                  create: { locale: FR, title: row.title },
                  update: { title: row.title },
                },
              },
              items: { create: items },
            },
          });
        } else {
          await tx.homeRow.create({
            data: {
              ...data,
              translations: { create: { locale: FR, title: row.title } },
              items: { create: items },
            },
          });
        }
      }

      await tx.homeTalent.deleteMany({});
      await tx.homeTalent.createMany({
        data: input.talentIds.map((personId, index) => ({ personId, position: index + 1 })),
      });
    });

    await this.audit.log(req, {
      action: 'home.update',
      entity: 'Home',
      meta: {
        featured: input.featured.map((s) => s.filmId),
        rows: input.rows.map((r) => ({ title: r.title, films: r.filmIds.length })),
        talents: input.talentIds.length,
      },
    });
    await this.events.changed('home');
    return this.get();
  }
}
