import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import {
  DEFAULT_LOCALE,
  type AdminListQuery,
  type AdminRow,
  type AdminStaticPage,
  type Page,
  type PublishCheck,
  type PublishState,
  type staticPageInputSchema,
} from '@ecine/contracts';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import { ProblemException } from '../common/problem.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ContentEventsService } from '../revalidate/content-events.service.js';
import {
  auditDiff,
  containsInsensitive,
  decodeAdminCursor,
  pageOf,
  publicPath,
  redirectSlugChange,
  updatedBefore,
} from './admin.helpers.js';
import { assertPublishable, pagePublishIssues, toPublishCheck } from './publish-checks.js';

const FR = DEFAULT_LOCALE;
type StaticPageInput = z.infer<typeof staticPageInputSchema>;

const pageInclude = { translations: { where: { locale: FR } } } satisfies Prisma.StaticPageInclude;
type StaticPageRow = Prisma.StaticPageGetPayload<{ include: typeof pageInclude }>;

/** Pages statiques (mentions légales, confidentialité, CGU…) : chaque modification incrémente la version affichée. */
@Injectable()
export class AdminPagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: ContentEventsService,
  ) {}

  async list(q: AdminListQuery): Promise<Page<AdminRow>> {
    const rows = await this.prisma.staticPage.findMany({
      where: {
        ...(q.state ? { state: q.state } : {}),
        ...(q.q ? { translations: { some: { locale: FR, title: containsInsensitive(q.q) } } } : {}),
        ...updatedBefore(decodeAdminCursor(q.cursor)),
      },
      select: {
        id: true,
        slug: true,
        state: true,
        version: true,
        updatedAt: true,
        translations: { where: { locale: FR }, select: { title: true } },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: q.limit + 1,
    });
    return pageOf(
      rows,
      q.limit,
      (p) => p.updatedAt,
      (p) => ({
        id: p.id,
        slug: p.slug,
        title: p.translations[0]?.title ?? p.slug,
        state: p.state,
        updatedAt: p.updatedAt.toISOString(),
        deletedAt: null,
        meta: `Version ${p.version}`,
      }),
    );
  }

  async get(id: string): Promise<AdminStaticPage> {
    return this.toAdmin(await this.load(id));
  }

  async create(req: Request, input: StaticPageInput): Promise<AdminStaticPage> {
    await this.assertSlugFree(this.prisma, input.slug);
    const page = this.toAdmin(
      await this.prisma.staticPage.create({
        data: {
          slug: input.slug,
          state: 'DRAFT',
          translations: { create: { locale: FR, title: input.title, body: input.body } },
        },
        include: pageInclude,
      }),
    );
    await this.audit.log(req, {
      action: 'page.create',
      entity: 'StaticPage',
      entityId: page.id,
      meta: auditDiff({}, { slug: page.slug, title: page.title }),
    });
    await this.events.changed('page', [page.slug]);
    return page;
  }

  async update(req: Request, id: string, input: StaticPageInput): Promise<AdminStaticPage> {
    const before = this.toAdmin(await this.load(id));
    const slugChanged = input.slug !== before.slug;
    const row = await this.prisma.$transaction(async (tx) => {
      if (slugChanged) await this.assertSlugFree(tx, input.slug);
      const translation = { title: input.title, body: input.body };
      const updated = await tx.staticPage.update({
        where: { id },
        data: {
          slug: input.slug,
          version: { increment: 1 },
          translations: {
            upsert: {
              where: { pageId_locale: { pageId: id, locale: FR } },
              create: { locale: FR, ...translation },
              update: translation,
            },
          },
        },
        include: pageInclude,
      });
      if (slugChanged)
        await redirectSlugChange(tx, publicPath.page(before.slug), publicPath.page(input.slug));
      return updated;
    });
    const after = this.toAdmin(row);
    await this.audit.log(req, {
      action: 'page.update',
      entity: 'StaticPage',
      entityId: id,
      meta: auditDiff(
        { slug: before.slug, title: before.title, body: before.body, version: before.version },
        { slug: after.slug, title: after.title, body: after.body, version: after.version },
      ),
    });
    await this.events.changed('page', [before.slug, after.slug]);
    return after;
  }

  async check(id: string): Promise<PublishCheck> {
    const page = this.toAdmin(await this.load(id));
    return toPublishCheck(pagePublishIssues(page));
  }

  async publish(req: Request, id: string): Promise<AdminStaticPage> {
    const page = this.toAdmin(await this.load(id));
    assertPublishable(pagePublishIssues(page));
    return this.applyState(req, page, 'publish', 'PUBLISHED');
  }

  async unpublish(req: Request, id: string): Promise<AdminStaticPage> {
    return this.applyState(req, this.toAdmin(await this.load(id)), 'unpublish', 'DRAFT');
  }

  private async applyState(
    req: Request,
    page: AdminStaticPage,
    action: string,
    state: PublishState,
  ): Promise<AdminStaticPage> {
    const after = this.toAdmin(
      await this.prisma.staticPage.update({
        where: { id: page.id },
        data: { state },
        include: pageInclude,
      }),
    );
    await this.audit.log(req, {
      action: `page.${action}`,
      entity: 'StaticPage',
      entityId: page.id,
      meta: { before: { state: page.state }, after: { state } },
    });
    await this.events.changed('page', [page.slug]);
    return after;
  }

  private async load(id: string): Promise<StaticPageRow> {
    const page = await this.prisma.staticPage.findUnique({ where: { id }, include: pageInclude });
    if (!page) throw ProblemException.notFound('Cette page est introuvable.');
    return page;
  }

  private async assertSlugFree(db: Prisma.TransactionClient, slug: string): Promise<void> {
    const taken = await db.staticPage.findUnique({ where: { slug }, select: { id: true } });
    if (taken) throw ProblemException.conflict('Ce slug est déjà utilisé par une autre page.');
  }

  private toAdmin(page: StaticPageRow): AdminStaticPage {
    const t = page.translations[0];
    return {
      id: page.id,
      slug: page.slug,
      state: page.state,
      title: t?.title ?? '',
      body: t?.body ?? '',
      version: page.version,
      updatedAt: page.updatedAt.toISOString(),
    };
  }
}
