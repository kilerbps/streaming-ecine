import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type {
  AdminListQuery,
  AdminPost,
  AdminRow,
  Page,
  PostInput,
  PublishCheck,
  PublishState,
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
  duplicates,
  excerpt,
  pageOf,
  scheduleDate,
  updatedBefore,
} from './admin.helpers.js';
import {
  assertPublishable,
  imageFacts,
  postPublishIssues,
  publishAtOnPublish,
  toPublishCheck,
} from './publish-checks.js';

const adminPostInclude = {
  images: { orderBy: { position: 'asc' }, include: { media: true } },
} satisfies Prisma.PostInclude;
type AdminPostRow = Prisma.PostGetPayload<{ include: typeof adminPostInclude }>;

function snapshot(post: AdminPostRow): AuditSnapshot {
  return {
    state: post.state,
    caption: post.caption,
    imageIds: post.images.map((i) => i.mediaId),
    pinnedUntil: iso(post.pinnedUntil),
  };
}

/**
 * Publications photo + texte du feed (FR-102). Chaque image doit avoir un texte alternatif
 * (ou être marquée décorative) dès l'enregistrement ; l'épinglage se règle avec `pinnedUntil`.
 */
@Injectable()
export class AdminPostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaUrls,
    private readonly audit: AuditService,
    private readonly events: ContentEventsService,
  ) {}

  async list(q: AdminListQuery): Promise<Page<AdminRow>> {
    const now = new Date();
    const rows = await this.prisma.post.findMany({
      where: {
        ...(q.includeDeleted === 'true' ? {} : { deletedAt: null }),
        ...(q.state ? { state: q.state } : {}),
        ...(q.q ? { caption: containsInsensitive(q.q) } : {}),
        ...updatedBefore(decodeAdminCursor(q.cursor)),
      },
      select: {
        id: true,
        state: true,
        caption: true,
        pinnedUntil: true,
        updatedAt: true,
        deletedAt: true,
        _count: { select: { images: true } },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: q.limit + 1,
    });
    return pageOf(
      rows,
      q.limit,
      (p) => p.updatedAt,
      (p) => {
        const images = p._count.images === 1 ? '1 image' : `${p._count.images} images`;
        return {
          id: p.id,
          slug: null,
          title: excerpt(p.caption),
          state: p.state,
          updatedAt: p.updatedAt.toISOString(),
          deletedAt: iso(p.deletedAt),
          meta: p.pinnedUntil && p.pinnedUntil > now ? `${images} · épinglée` : images,
        };
      },
    );
  }

  async get(id: string): Promise<AdminPost> {
    return this.toAdmin(await this.load(id));
  }

  async create(req: Request, user: AuthUser, input: PostInput): Promise<AdminPost> {
    const id = await this.prisma.$transaction(async (tx) => {
      await this.assertImages(tx, input.imageIds);
      const post = await tx.post.create({
        data: {
          state: 'DRAFT',
          authorId: user.id,
          caption: input.caption,
          pinnedUntil: input.pinnedUntil ? new Date(input.pinnedUntil) : null,
          images: { create: input.imageIds.map((mediaId, position) => ({ mediaId, position })) },
        },
        select: { id: true },
      });
      return post.id;
    });
    const created = await this.load(id);
    await this.audit.log(req, {
      action: 'post.create',
      entity: 'Post',
      entityId: id,
      meta: auditDiff({}, snapshot(created)),
    });
    await this.events.changed('post');
    return this.toAdmin(created);
  }

  async update(req: Request, id: string, input: PostInput): Promise<AdminPost> {
    const before = await this.load(id);
    assertNotDeleted(before, 'Restaurez cette publication avant de la modifier.');
    await this.prisma.$transaction(async (tx) => {
      await this.assertImages(tx, input.imageIds);
      await tx.post.update({
        where: { id },
        data: {
          caption: input.caption,
          pinnedUntil: input.pinnedUntil ? new Date(input.pinnedUntil) : null,
          images: {
            deleteMany: {},
            create: input.imageIds.map((mediaId, position) => ({ mediaId, position })),
          },
        },
      });
    });
    const after = await this.load(id);
    await this.audit.log(req, {
      action: 'post.update',
      entity: 'Post',
      entityId: id,
      meta: auditDiff(snapshot(before), snapshot(after)),
    });
    await this.events.changed('post');
    return this.toAdmin(after);
  }

  async remove(req: Request, id: string): Promise<void> {
    const post = await this.find(id);
    if (post.deletedAt) return;
    await this.prisma.post.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log(req, {
      action: 'post.delete',
      entity: 'Post',
      entityId: id,
      meta: { state: post.state },
    });
    await this.events.changed('post');
  }

  async restore(req: Request, id: string): Promise<AdminPost> {
    const post = await this.find(id);
    if (!post.deletedAt) return this.get(id);
    await this.prisma.post.update({ where: { id }, data: { deletedAt: null, state: 'DRAFT' } });
    await this.audit.log(req, {
      action: 'post.restore',
      entity: 'Post',
      entityId: id,
      meta: { before: post.state, after: 'DRAFT' },
    });
    await this.events.changed('post');
    return this.get(id);
  }

  async check(id: string): Promise<PublishCheck> {
    return toPublishCheck(this.issues(await this.load(id)));
  }

  async publish(req: Request, id: string): Promise<AdminPost> {
    const post = await this.load(id);
    assertNotDeleted(post, 'Restaurez cette publication avant de la publier.');
    assertPublishable(this.issues(post));
    return this.applyState(req, post, 'publish', {
      state: 'PUBLISHED',
      publishAt: publishAtOnPublish(post.publishAt, new Date()),
    });
  }

  async schedule(req: Request, id: string, publishAtIso: string): Promise<AdminPost> {
    const publishAt = scheduleDate(publishAtIso);
    const post = await this.load(id);
    assertNotDeleted(post, 'Restaurez cette publication avant de la planifier.');
    assertPublishable(this.issues(post));
    return this.applyState(req, post, 'schedule', { state: 'SCHEDULED', publishAt });
  }

  async unpublish(req: Request, id: string): Promise<AdminPost> {
    const post = await this.find(id);
    assertNotDeleted(post, 'Restaurez cette publication avant de la modifier.');
    return this.applyState(req, post, 'unpublish', { state: 'DRAFT' });
  }

  async archive(req: Request, id: string): Promise<AdminPost> {
    const post = await this.find(id);
    assertNotDeleted(post, 'Restaurez cette publication avant de la modifier.');
    return this.applyState(req, post, 'archive', { state: 'ARCHIVED' });
  }

  private async applyState(
    req: Request,
    post: { id: string; state: PublishState },
    action: string,
    data: { state: PublishState; publishAt?: Date },
  ): Promise<AdminPost> {
    await this.prisma.post.update({ where: { id: post.id }, data });
    await this.audit.log(req, {
      action: `post.${action}`,
      entity: 'Post',
      entityId: post.id,
      meta: {
        before: { state: post.state },
        after: { state: data.state, publishAt: data.publishAt?.toISOString() ?? null },
      },
    });
    await this.events.changed('post');
    return this.get(post.id);
  }

  private issues(post: AdminPostRow) {
    return postPublishIssues({
      caption: post.caption,
      images: post.images.map((i) => imageFacts(i.media)),
    });
  }

  private async find(
    id: string,
  ): Promise<{ id: string; state: PublishState; deletedAt: Date | null }> {
    const post = await this.prisma.post.findUnique({
      where: { id },
      select: { id: true, state: true, deletedAt: true },
    });
    if (!post) throw ProblemException.notFound('Cette publication est introuvable.');
    return post;
  }

  private async load(id: string): Promise<AdminPostRow> {
    const post = await this.prisma.post.findUnique({ where: { id }, include: adminPostInclude });
    if (!post) throw ProblemException.notFound('Cette publication est introuvable.');
    return post;
  }

  /** Images distinctes, de type image, avec texte alternatif ou marquées décoratives (sinon 400). */
  private async assertImages(tx: Prisma.TransactionClient, imageIds: string[]): Promise<void> {
    if (duplicates(imageIds).length > 0) {
      throw ProblemException.badRequest('Certaines informations sont invalides.', [
        { path: 'imageIds', message: 'Une image est ajoutée deux fois.' },
      ]);
    }
    await assertImages(
      tx,
      imageIds.map((id, i) => ({ id, path: `imageIds.${i}` })),
      true,
    );
  }

  private toAdmin(post: AdminPostRow): AdminPost {
    return {
      id: post.id,
      state: post.state,
      publishAt: iso(post.publishAt),
      caption: post.caption,
      images: post.images.map((i) => this.media.imageWithId(i.media)).filter((i) => i !== null),
      pinnedUntil: iso(post.pinnedUntil),
      createdAt: post.createdAt.toISOString(),
      deletedAt: iso(post.deletedAt),
    };
  }
}
