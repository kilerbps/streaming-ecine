import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import {
  DEFAULT_LOCALE,
  type AdminArticle,
  type AdminListQuery,
  type AdminRow,
  type ArticleInput,
  type ArticleKind,
  type Page,
  type PublishCheck,
  type PublishState,
} from '@ecine/contracts';
import { AuditService } from '../audit/audit.service.js';
import type { AuthUser } from '../auth/auth.types.js';
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
  pageOf,
  publicPath,
  redirectSlugChange,
  scheduleDate,
  updatedBefore,
} from './admin.helpers.js';
import {
  articlePublishIssues,
  assertPublishable,
  imageFacts,
  publishAtOnPublish,
  toPublishCheck,
} from './publish-checks.js';

const FR = DEFAULT_LOCALE;

const KIND_LABELS: Record<ArticleKind, string> = {
  NEWS: 'Actualité',
  ANNOUNCEMENT: 'Annonce',
  EVENT: 'Événement',
};

const adminArticleInclude = {
  translations: { where: { locale: FR } },
  cover: true,
} satisfies Prisma.ArticleInclude;
type AdminArticleRow = Prisma.ArticleGetPayload<{ include: typeof adminArticleInclude }>;

function articleScalars(input: ArticleInput) {
  return {
    slug: input.slug,
    kind: input.kind,
    coverId: input.coverId ?? null,
    eventStart: input.eventStart ? new Date(input.eventStart) : null,
    eventPlace: input.eventPlace || null,
    featuredFilmId: input.featuredFilmId ?? null,
  };
}

function articleTranslation(input: ArticleInput) {
  return {
    title: input.title,
    excerpt: input.excerpt,
    body: input.body,
    seoTitle: input.seoTitle || null,
    seoDescription: input.seoDescription || null,
  };
}

function snapshot(article: AdminArticle): AuditSnapshot {
  return {
    slug: article.slug,
    kind: article.kind,
    state: article.state,
    title: article.title,
    excerpt: article.excerpt,
    body: article.body,
    coverId: article.cover?.id ?? null,
    eventStart: article.eventStart,
    eventPlace: article.eventPlace,
    featuredFilmId: article.featuredFilmId,
    seoTitle: article.seoTitle,
    seoDescription: article.seoDescription,
  };
}

/** Actualités, annonces et événements (FR-102). L'auteur est l'éditeur qui crée l'article. */
@Injectable()
export class AdminArticlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaUrls,
    private readonly audit: AuditService,
    private readonly events: ContentEventsService,
  ) {}

  async list(q: AdminListQuery): Promise<Page<AdminRow>> {
    const rows = await this.prisma.article.findMany({
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
      (a) => a.updatedAt,
      (a) => ({
        id: a.id,
        slug: a.slug,
        title: a.translations[0]?.title ?? a.slug,
        state: a.state,
        updatedAt: a.updatedAt.toISOString(),
        deletedAt: iso(a.deletedAt),
        meta: KIND_LABELS[a.kind],
      }),
    );
  }

  async get(id: string): Promise<AdminArticle> {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: adminArticleInclude,
    });
    if (!article) throw ProblemException.notFound('Cette actualité est introuvable.');
    return this.toAdmin(article);
  }

  async create(req: Request, user: AuthUser, input: ArticleInput): Promise<AdminArticle> {
    const id = await this.prisma.$transaction(async (tx) => {
      await this.assertSlugFree(tx, input.slug);
      await this.assertReferences(tx, input);
      const article = await tx.article.create({
        data: {
          ...articleScalars(input),
          state: 'DRAFT',
          authorId: user.id,
          translations: { create: { locale: FR, ...articleTranslation(input) } },
        },
        select: { id: true },
      });
      return article.id;
    });
    const created = await this.get(id);
    await this.audit.log(req, {
      action: 'article.create',
      entity: 'Article',
      entityId: id,
      meta: auditDiff({}, snapshot(created)),
    });
    await this.events.changed('article', [created.slug]);
    return created;
  }

  async update(req: Request, id: string, input: ArticleInput): Promise<AdminArticle> {
    const before = await this.get(id);
    assertNotDeleted(
      { deletedAt: before.deletedAt ? new Date(before.deletedAt) : null },
      'Restaurez cette actualité avant de la modifier.',
    );
    const slugChanged = input.slug !== before.slug;
    await this.prisma.$transaction(async (tx) => {
      if (slugChanged) await this.assertSlugFree(tx, input.slug);
      await this.assertReferences(tx, input);
      const translation = articleTranslation(input);
      await tx.article.update({
        where: { id },
        data: {
          ...articleScalars(input),
          translations: {
            upsert: {
              where: { articleId_locale: { articleId: id, locale: FR } },
              create: { locale: FR, ...translation },
              update: translation,
            },
          },
        },
      });
      if (slugChanged)
        await redirectSlugChange(
          tx,
          publicPath.article(before.slug),
          publicPath.article(input.slug),
        );
    });
    const after = await this.get(id);
    await this.audit.log(req, {
      action: 'article.update',
      entity: 'Article',
      entityId: id,
      meta: auditDiff(snapshot(before), snapshot(after)),
    });
    await this.events.changed('article', [before.slug, after.slug]);
    return after;
  }

  async remove(req: Request, id: string): Promise<void> {
    const article = await this.find(id);
    if (article.deletedAt) return;
    await this.prisma.article.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log(req, {
      action: 'article.delete',
      entity: 'Article',
      entityId: id,
      meta: { slug: article.slug, state: article.state },
    });
    await this.events.changed('article', [article.slug]);
  }

  async restore(req: Request, id: string): Promise<AdminArticle> {
    const article = await this.find(id);
    if (!article.deletedAt) return this.get(id);
    await this.prisma.article.update({ where: { id }, data: { deletedAt: null, state: 'DRAFT' } });
    await this.audit.log(req, {
      action: 'article.restore',
      entity: 'Article',
      entityId: id,
      meta: { slug: article.slug, before: article.state, after: 'DRAFT' },
    });
    await this.events.changed('article', [article.slug]);
    return this.get(id);
  }

  async check(id: string): Promise<PublishCheck> {
    return toPublishCheck(await this.issues(id));
  }

  async publish(req: Request, id: string): Promise<AdminArticle> {
    const article = await this.find(id);
    assertNotDeleted(article, 'Restaurez cette actualité avant de la publier.');
    assertPublishable(await this.issues(id));
    return this.applyState(req, article, 'publish', {
      state: 'PUBLISHED',
      publishAt: publishAtOnPublish(article.publishAt, new Date()),
    });
  }

  async schedule(req: Request, id: string, publishAtIso: string): Promise<AdminArticle> {
    const publishAt = scheduleDate(publishAtIso);
    const article = await this.find(id);
    assertNotDeleted(article, 'Restaurez cette actualité avant de la planifier.');
    assertPublishable(await this.issues(id));
    return this.applyState(req, article, 'schedule', { state: 'SCHEDULED', publishAt });
  }

  async unpublish(req: Request, id: string): Promise<AdminArticle> {
    const article = await this.find(id);
    assertNotDeleted(article, 'Restaurez cette actualité avant de la modifier.');
    return this.applyState(req, article, 'unpublish', { state: 'DRAFT' });
  }

  async archive(req: Request, id: string): Promise<AdminArticle> {
    const article = await this.find(id);
    assertNotDeleted(article, 'Restaurez cette actualité avant de la modifier.');
    return this.applyState(req, article, 'archive', { state: 'ARCHIVED' });
  }

  private async applyState(
    req: Request,
    article: { id: string; slug: string; state: PublishState },
    action: string,
    data: { state: PublishState; publishAt?: Date },
  ): Promise<AdminArticle> {
    await this.prisma.article.update({ where: { id: article.id }, data });
    await this.audit.log(req, {
      action: `article.${action}`,
      entity: 'Article',
      entityId: article.id,
      meta: {
        before: { state: article.state },
        after: { state: data.state, publishAt: data.publishAt?.toISOString() ?? null },
      },
    });
    await this.events.changed('article', [article.slug]);
    return this.get(article.id);
  }

  private async find(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      select: { id: true, slug: true, state: true, publishAt: true, deletedAt: true },
    });
    if (!article) throw ProblemException.notFound('Cette actualité est introuvable.');
    return article;
  }

  private async issues(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      select: {
        translations: { where: { locale: FR }, select: { title: true, excerpt: true, body: true } },
        cover: { select: { kind: true, alt: true, decorative: true } },
      },
    });
    if (!article) throw ProblemException.notFound('Cette actualité est introuvable.');
    const t = article.translations[0];
    return articlePublishIssues({
      title: t?.title,
      excerpt: t?.excerpt,
      body: t?.body,
      cover: imageFacts(article.cover),
    });
  }

  private async assertSlugFree(tx: Prisma.TransactionClient, slug: string): Promise<void> {
    const taken = await tx.article.findUnique({ where: { slug }, select: { id: true } });
    if (taken) throw ProblemException.conflict('Ce slug est déjà utilisé par une autre actualité.');
  }

  private async assertReferences(tx: Prisma.TransactionClient, input: ArticleInput): Promise<void> {
    await assertImages(tx, input.coverId ? [{ id: input.coverId, path: 'coverId' }] : [], false);
    if (input.featuredFilmId) {
      const film = await tx.film.findFirst({
        where: { id: input.featuredFilmId, deletedAt: null },
        select: { id: true },
      });
      if (!film) {
        throw ProblemException.badRequest('Certaines informations sont invalides.', [
          { path: 'featuredFilmId', message: 'Film introuvable.' },
        ]);
      }
    }
  }

  private toAdmin(article: AdminArticleRow): AdminArticle {
    const t = article.translations[0];
    return {
      id: article.id,
      slug: article.slug,
      kind: article.kind,
      state: article.state,
      publishAt: iso(article.publishAt),
      title: t?.title ?? '',
      excerpt: t?.excerpt ?? '',
      body: t?.body ?? '',
      cover: this.media.imageWithId(article.cover),
      eventStart: iso(article.eventStart),
      eventPlace: article.eventPlace,
      featuredFilmId: article.featuredFilmId,
      seoTitle: t?.seoTitle ?? null,
      seoDescription: t?.seoDescription ?? null,
      updatedAt: article.updatedAt.toISOString(),
      deletedAt: iso(article.deletedAt),
    };
  }
}
