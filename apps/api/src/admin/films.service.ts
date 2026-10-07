import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import {
  DEFAULT_LOCALE,
  type AdminFilm,
  type AdminListQuery,
  type AdminRow,
  type FilmInput,
  type FilmKind,
  type Page,
  type PublishCheck,
  type PublishState,
} from '@ecine/contracts';
import { AuditService } from '../audit/audit.service.js';
import { ProblemException } from '../common/problem.js';
import { iso, MediaUrls } from '../content/content.helpers.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ContentEventsService } from '../revalidate/content-events.service.js';
import {
  assertImages,
  assertNotDeleted,
  auditDiff,
  type AuditSnapshot,
  containsInsensitive,
  decodeAdminCursor,
  duplicates,
  pageOf,
  publicPath,
  redirectSlugChange,
  scheduleDate,
  updatedBefore,
} from './admin.helpers.js';
import {
  assertPublishable,
  filmPublishIssues,
  publishAtOnPublish,
  type PublishIssue,
  toPublishCheck,
} from './publish-checks.js';

const FR = DEFAULT_LOCALE;

const KIND_LABELS: Record<FilmKind, string> = {
  FEATURE: 'Long métrage',
  SHORT: 'Court métrage',
  DOCUMENTARY: 'Documentaire',
  SERIES_EPISODE: 'Épisode',
};

const adminFilmInclude = {
  translations: { where: { locale: FR } },
  poster: true,
  categories: { select: { categoryId: true }, orderBy: { categoryId: 'asc' } },
  credits: {
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
    include: {
      person: {
        select: { slug: true, translations: { where: { locale: FR }, select: { name: true } } },
      },
    },
  },
  videos: {
    orderBy: { createdAt: 'desc' },
    select: { id: true, state: true, durationSec: true, error: true, createdAt: true },
  },
} satisfies Prisma.FilmInclude;
type AdminFilmRow = Prisma.FilmGetPayload<{ include: typeof adminFilmInclude }>;

/** Champs propres au film (hors traduction et relations). */
function filmScalars(input: FilmInput) {
  return {
    slug: input.slug,
    kind: input.kind,
    originalTitle: input.originalTitle || null,
    year: input.year ?? null,
    runtimeSec: input.runtimeSec ?? null,
    ageRating: input.ageRating || null,
    trailerUrl: input.trailerUrl ?? null,
    rightsNote: input.rightsNote,
    rightsOk: input.rightsOk,
    posterId: input.posterId ?? null,
    seoNoIndex: input.seoNoIndex,
  };
}

function filmTranslation(input: FilmInput) {
  return {
    title: input.title,
    synopsis: input.synopsis,
    seoTitle: input.seoTitle || null,
    seoDescription: input.seoDescription || null,
  };
}

function filmRelations(input: FilmInput) {
  return {
    categories: [...new Set(input.categoryIds)].map((categoryId) => ({ categoryId })),
    credits: input.credits.map((c) => ({
      personId: c.personId,
      role: c.role,
      character: c.character || null,
      position: c.position,
    })),
  };
}

/** Résumé pour le journal d'audit (avant/après), sans donnée sensible. */
function snapshot(film: AdminFilm): AuditSnapshot {
  return {
    slug: film.slug,
    kind: film.kind,
    state: film.state,
    title: film.title,
    synopsis: film.synopsis,
    originalTitle: film.originalTitle,
    year: film.year,
    runtimeSec: film.runtimeSec,
    ageRating: film.ageRating,
    trailerUrl: film.trailerUrl,
    rightsNote: film.rightsNote,
    rightsOk: film.rightsOk,
    posterId: film.poster?.id ?? null,
    categoryIds: film.categoryIds,
    credits: film.credits.map((c) => [c.personId, c.role, c.character ?? ''].join(':')),
    seoTitle: film.seoTitle,
    seoDescription: film.seoDescription,
    seoNoIndex: film.seoNoIndex,
  };
}

/** Films et courts-métrages : CRUD, contrôles de publication, planification, corbeille (FR-100, FR-107). */
@Injectable()
export class AdminFilmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaUrls,
    private readonly audit: AuditService,
    private readonly events: ContentEventsService,
  ) {}

  async list(q: AdminListQuery): Promise<Page<AdminRow>> {
    const rows = await this.prisma.film.findMany({
      where: {
        ...(q.includeDeleted === 'true' ? {} : { deletedAt: null }),
        ...(q.state ? { state: q.state } : {}),
        ...(q.q ? { translations: { some: { locale: FR, title: containsInsensitive(q.q) } } } : {}),
        ...updatedBefore(decodeAdminCursor(q.cursor)),
      },
      select: {
        id: true,
        slug: true,
        kind: true,
        state: true,
        year: true,
        updatedAt: true,
        deletedAt: true,
        translations: { where: { locale: FR }, select: { title: true } },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: q.limit + 1,
    });
    return pageOf(
      rows,
      q.limit,
      (f) => f.updatedAt,
      (f) => ({
        id: f.id,
        slug: f.slug,
        title: f.translations[0]?.title ?? f.slug,
        state: f.state,
        updatedAt: f.updatedAt.toISOString(),
        deletedAt: iso(f.deletedAt),
        meta: f.year ? `${KIND_LABELS[f.kind]} · ${f.year}` : KIND_LABELS[f.kind],
      }),
    );
  }

  async get(id: string): Promise<AdminFilm> {
    const film = await this.prisma.film.findUnique({ where: { id }, include: adminFilmInclude });
    if (!film) throw ProblemException.notFound('Ce film est introuvable.');
    return this.toAdmin(film);
  }

  async create(req: Request, input: FilmInput): Promise<AdminFilm> {
    const relations = filmRelations(input);
    const id = await this.prisma.$transaction(async (tx) => {
      await this.assertSlugFree(tx, input.slug);
      await this.assertReferences(tx, input);
      const film = await tx.film.create({
        data: {
          ...filmScalars(input),
          state: 'DRAFT',
          translations: { create: { locale: FR, ...filmTranslation(input) } },
          categories: { create: relations.categories },
          credits: { create: relations.credits },
        },
        select: { id: true },
      });
      return film.id;
    });
    const created = await this.get(id);
    await this.audit.log(req, {
      action: 'film.create',
      entity: 'Film',
      entityId: id,
      meta: auditDiff({}, snapshot(created)),
    });
    await this.events.changed('film', [created.slug]);
    return created;
  }

  async update(req: Request, id: string, input: FilmInput): Promise<AdminFilm> {
    const before = await this.get(id);
    assertNotDeleted(
      { deletedAt: before.deletedAt ? new Date(before.deletedAt) : null },
      'Restaurez ce film avant de le modifier.',
    );
    const relations = filmRelations(input);
    const slugChanged = input.slug !== before.slug;
    // Droits retirés sur un film visible : retour immédiat en brouillon (jamais de diffusion sans autorisation).
    const withdraw =
      !input.rightsOk && (before.state === 'PUBLISHED' || before.state === 'SCHEDULED');

    await this.prisma.$transaction(async (tx) => {
      if (slugChanged) await this.assertSlugFree(tx, input.slug);
      await this.assertReferences(tx, input);
      const translation = filmTranslation(input);
      await tx.film.update({
        where: { id },
        data: {
          ...filmScalars(input),
          ...(withdraw ? { state: 'DRAFT' as const } : {}),
          translations: {
            upsert: {
              where: { filmId_locale: { filmId: id, locale: FR } },
              create: { locale: FR, ...translation },
              update: translation,
            },
          },
          categories: { deleteMany: {}, create: relations.categories },
          credits: { deleteMany: {}, create: relations.credits },
        },
      });
      if (slugChanged)
        await redirectSlugChange(tx, publicPath.film(before.slug), publicPath.film(input.slug));
    });

    const after = await this.get(id);
    await this.audit.log(req, {
      action: 'film.update',
      entity: 'Film',
      entityId: id,
      meta: auditDiff(snapshot(before), snapshot(after)),
    });
    await this.events.changed('film', [before.slug, after.slug]);
    return after;
  }

  /** Suppression douce (corbeille) : le film disparaît du site, restauration possible. */
  async remove(req: Request, id: string): Promise<void> {
    const film = await this.find(id);
    if (film.deletedAt) return;
    await this.prisma.film.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log(req, {
      action: 'film.delete',
      entity: 'Film',
      entityId: id,
      meta: { slug: film.slug, state: film.state },
    });
    await this.events.changed('film', [film.slug]);
  }

  /** Restauration en brouillon : la remise en ligne repasse par les contrôles de publication. */
  async restore(req: Request, id: string): Promise<AdminFilm> {
    const film = await this.find(id);
    if (!film.deletedAt) return this.get(id);
    await this.prisma.film.update({ where: { id }, data: { deletedAt: null, state: 'DRAFT' } });
    await this.audit.log(req, {
      action: 'film.restore',
      entity: 'Film',
      entityId: id,
      meta: { slug: film.slug, before: film.state, after: 'DRAFT' },
    });
    await this.events.changed('film', [film.slug]);
    return this.get(id);
  }

  async check(id: string): Promise<PublishCheck> {
    const { issues } = await this.inspect(id);
    return toPublishCheck(issues);
  }

  async publish(req: Request, id: string): Promise<AdminFilm> {
    const { film, issues } = await this.inspect(id);
    assertNotDeleted(film, 'Restaurez ce film avant de le publier.');
    assertPublishable(issues);
    return this.applyState(req, film, 'publish', {
      state: 'PUBLISHED',
      publishAt: publishAtOnPublish(film.publishAt, new Date()),
    });
  }

  async schedule(req: Request, id: string, publishAtIso: string): Promise<AdminFilm> {
    const publishAt = scheduleDate(publishAtIso);
    const { film, issues } = await this.inspect(id);
    assertNotDeleted(film, 'Restaurez ce film avant de le planifier.');
    assertPublishable(issues);
    return this.applyState(req, film, 'schedule', { state: 'SCHEDULED', publishAt });
  }

  async unpublish(req: Request, id: string): Promise<AdminFilm> {
    const film = await this.find(id);
    assertNotDeleted(film, 'Restaurez ce film avant de le modifier.');
    return this.applyState(req, film, 'unpublish', { state: 'DRAFT' });
  }

  async archive(req: Request, id: string): Promise<AdminFilm> {
    const film = await this.find(id);
    assertNotDeleted(film, 'Restaurez ce film avant de le modifier.');
    return this.applyState(req, film, 'archive', { state: 'ARCHIVED' });
  }

  private async applyState(
    req: Request,
    film: { id: string; slug: string; state: PublishState },
    action: string,
    data: { state: PublishState; publishAt?: Date },
  ): Promise<AdminFilm> {
    await this.prisma.film.update({ where: { id: film.id }, data });
    await this.audit.log(req, {
      action: `film.${action}`,
      entity: 'Film',
      entityId: film.id,
      meta: {
        before: { state: film.state },
        after: { state: data.state, publishAt: data.publishAt?.toISOString() ?? null },
      },
    });
    await this.events.changed('film', [film.slug]);
    return this.get(film.id);
  }

  private async find(
    id: string,
  ): Promise<{ id: string; slug: string; state: PublishState; deletedAt: Date | null }> {
    const film = await this.prisma.film.findUnique({
      where: { id },
      select: { id: true, slug: true, state: true, deletedAt: true },
    });
    if (!film) throw ProblemException.notFound('Ce film est introuvable.');
    return film;
  }

  /** Faits nécessaires aux contrôles de publication (une requête + une pour le doublon SEO). */
  private async inspect(id: string) {
    const film = await this.prisma.film.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        state: true,
        publishAt: true,
        deletedAt: true,
        rightsOk: true,
        trailerUrl: true,
        translations: {
          where: { locale: FR },
          select: { title: true, synopsis: true, seoTitle: true },
        },
        poster: { select: { kind: true, alt: true, decorative: true, width: true, height: true } },
        _count: { select: { videos: { where: { state: 'READY' } } } },
      },
    });
    if (!film) throw ProblemException.notFound('Ce film est introuvable.');
    const t = film.translations[0];
    const seoTitle = t?.seoTitle?.trim() || null;
    const seoTitleTaken = seoTitle
      ? (await this.prisma.filmTranslation.count({
          where: {
            locale: FR,
            seoTitle: { equals: seoTitle, mode: 'insensitive' },
            filmId: { not: id },
            film: { deletedAt: null },
          },
        })) > 0
      : false;
    // Une affiche non traitée (sans dimensions) n'est pas affichable : considérée comme absente.
    const poster =
      film.poster && film.poster.kind === 'IMAGE' && film.poster.width && film.poster.height
        ? film.poster
        : null;
    const issues: PublishIssue[] = filmPublishIssues({
      title: t?.title,
      synopsis: t?.synopsis,
      poster,
      rightsOk: film.rightsOk,
      readyVideos: film._count.videos,
      trailerUrl: film.trailerUrl,
      seoTitle,
      seoTitleTaken,
    });
    return { film, issues };
  }

  private async assertSlugFree(tx: Prisma.TransactionClient, slug: string): Promise<void> {
    const taken = await tx.film.findUnique({ where: { slug }, select: { id: true } });
    if (taken) throw ProblemException.conflict('Ce slug est déjà utilisé par un autre film.');
  }

  /** Affiche, catégories et personnes créditées doivent exister (400 avec le champ en cause). */
  private async assertReferences(tx: Prisma.TransactionClient, input: FilmInput): Promise<void> {
    await assertImages(tx, input.posterId ? [{ id: input.posterId, path: 'posterId' }] : [], false);
    const errors: Array<{ path: string; message: string }> = [];

    if (input.categoryIds.length > 0) {
      const found = await tx.category.findMany({
        where: { id: { in: input.categoryIds } },
        select: { id: true },
      });
      const known = new Set(found.map((c) => c.id));
      input.categoryIds.forEach((categoryId, i) => {
        if (!known.has(categoryId))
          errors.push({ path: `categoryIds.${i}`, message: 'Catégorie introuvable.' });
      });
    }

    if (input.credits.length > 0) {
      const found = await tx.person.findMany({
        where: { id: { in: input.credits.map((c) => c.personId) } },
        select: { id: true },
      });
      const known = new Set(found.map((p) => p.id));
      input.credits.forEach((credit, i) => {
        if (!known.has(credit.personId))
          errors.push({ path: `credits.${i}.personId`, message: 'Personne introuvable.' });
      });
      if (
        duplicates(input.credits.map((c) => [c.personId, c.role, c.character ?? ''].join('|')))
          .length > 0
      ) {
        errors.push({
          path: 'credits',
          message: 'Un crédit est saisi deux fois (même personne, même rôle, même personnage).',
        });
      }
    }

    if (errors.length > 0)
      throw ProblemException.badRequest('Certaines informations sont invalides.', errors);
  }

  private toAdmin(film: AdminFilmRow): AdminFilm {
    const t = film.translations[0];
    return {
      id: film.id,
      slug: film.slug,
      kind: film.kind,
      state: film.state,
      publishAt: iso(film.publishAt),
      title: t?.title ?? '',
      synopsis: t?.synopsis ?? '',
      originalTitle: film.originalTitle,
      year: film.year,
      runtimeSec: film.runtimeSec,
      ageRating: film.ageRating,
      trailerUrl: film.trailerUrl,
      rightsNote: film.rightsNote,
      rightsOk: film.rightsOk,
      poster: this.media.imageWithId(film.poster),
      categoryIds: film.categories.map((c) => c.categoryId),
      credits: film.credits.map((c) => ({
        personId: c.personId,
        personName: c.person.translations[0]?.name ?? c.person.slug,
        role: c.role,
        character: c.character,
        position: c.position,
      })),
      videos: film.videos.map((v) => ({
        id: v.id,
        state: v.state,
        durationSec: v.durationSec,
        error: v.error,
        createdAt: v.createdAt.toISOString(),
      })),
      seoTitle: t?.seoTitle ?? null,
      seoDescription: t?.seoDescription ?? null,
      seoNoIndex: film.seoNoIndex,
      updatedAt: film.updatedAt.toISOString(),
      deletedAt: iso(film.deletedAt),
    };
  }
}
