import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type {
  ContactMessage,
  CursorQuery,
  Page,
  Report,
  ReportListQuery,
  reportUpdateInputSchema,
} from '@ecine/contracts';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import { iso } from '../content/content.helpers.js';
import { ProblemException } from '../common/problem.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { type ContentEntity, ContentEventsService } from '../revalidate/content-events.service.js';
import { createdBefore, decodeAdminCursor, pageOf } from './admin.helpers.js';

type ReportUpdateInput = z.infer<typeof reportUpdateInputSchema>;

const reportSelect = {
  id: true,
  targetType: true,
  targetId: true,
  reason: true,
  details: true,
  state: true,
  createdAt: true,
} as const;
type ReportRow = Prisma.ReportGetPayload<{ select: typeof reportSelect }>;

function toReport(report: ReportRow): Report {
  return {
    id: report.id,
    targetType: report.targetType,
    targetId: report.targetId,
    reason: report.reason,
    details: report.details,
    state: report.state,
    createdAt: report.createdAt.toISOString(),
  };
}

/** Contenu masqué suite à un signalement (pour l'audit et la revalidation). */
interface HiddenTarget {
  entity: ContentEntity;
  auditEntity: string;
  slug: string | null;
  before: string;
}

/** File de modération (FR-106) et messages de contact (FR-072). Le signaleur n'est jamais exposé. */
@Injectable()
export class AdminModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: ContentEventsService,
  ) {}

  async reports(q: ReportListQuery): Promise<Page<Report>> {
    const rows = await this.prisma.report.findMany({
      where: { state: q.state, ...createdBefore(decodeAdminCursor(q.cursor)) },
      select: reportSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: q.limit + 1,
    });
    return pageOf(rows, q.limit, (r) => r.createdAt, toReport);
  }

  /** Traite un signalement ; `HIDE_CONTENT` archive le contenu visé et clôt ses autres signalements ouverts. */
  async updateReport(req: Request, id: string, input: ReportUpdateInput): Promise<Report> {
    const report = await this.prisma.report.findUnique({ where: { id }, select: reportSelect });
    if (!report) throw ProblemException.notFound('Ce signalement est introuvable.');
    if (input.action === 'HIDE_CONTENT' && input.state !== 'RESOLVED') {
      throw ProblemException.badRequest(
        'Pour masquer le contenu, le signalement doit être marqué comme résolu.',
        [{ path: 'state', message: 'Choisissez « résolu » pour masquer le contenu.' }],
      );
    }

    const { updated, hidden } = await this.prisma.$transaction(async (tx) => {
      const target =
        input.action === 'HIDE_CONTENT'
          ? await this.hide(tx, report.targetType, report.targetId)
          : null;
      const row = await tx.report.update({
        where: { id },
        data: { state: input.state },
        select: reportSelect,
      });
      if (target) {
        await tx.report.updateMany({
          where: { targetType: report.targetType, targetId: report.targetId, state: 'OPEN' },
          data: { state: 'RESOLVED' },
        });
      }
      return { updated: row, hidden: target };
    });

    await this.audit.log(req, {
      action: input.state === 'RESOLVED' ? 'report.resolve' : 'report.reject',
      entity: 'Report',
      entityId: id,
      meta: {
        before: { state: report.state },
        after: { state: input.state },
        action: input.action,
        targetType: report.targetType,
        targetId: report.targetId,
      },
    });
    if (hidden) {
      await this.audit.log(req, {
        action: `${hidden.entity}.hide`,
        entity: hidden.auditEntity,
        entityId: report.targetId,
        meta: { before: { state: hidden.before }, after: { state: 'ARCHIVED' }, reportId: id },
      });
      await this.events.changed(hidden.entity, [hidden.slug]);
    }
    return toReport(updated);
  }

  async messages(q: CursorQuery): Promise<Page<ContactMessage>> {
    const rows = await this.prisma.contactMessage.findMany({
      where: createdBefore(decodeAdminCursor(q.cursor)),
      select: {
        id: true,
        name: true,
        email: true,
        subject: true,
        body: true,
        handledAt: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: q.limit + 1,
    });
    return pageOf(
      rows,
      q.limit,
      (m) => m.createdAt,
      (m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        subject: m.subject,
        body: m.body,
        handledAt: iso(m.handledAt),
        createdAt: m.createdAt.toISOString(),
      }),
    );
  }

  async markHandled(req: Request, id: string): Promise<ContactMessage> {
    const message = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!message) throw ProblemException.notFound('Ce message est introuvable.');
    const handledAt = message.handledAt ?? new Date();
    if (!message.handledAt) {
      await this.prisma.contactMessage.update({ where: { id }, data: { handledAt } });
      await this.audit.log(req, {
        action: 'contact.handle',
        entity: 'ContactMessage',
        entityId: id,
      });
    }
    return {
      id: message.id,
      name: message.name,
      email: message.email,
      subject: message.subject,
      body: message.body,
      handledAt: handledAt.toISOString(),
      createdAt: message.createdAt.toISOString(),
    };
  }

  /** Archive la cible du signalement (le contenu quitte le site, restauration possible par un éditeur). */
  private async hide(
    tx: Prisma.TransactionClient,
    targetType: string,
    targetId: string,
  ): Promise<HiddenTarget> {
    const where = { id: targetId };
    const data = { state: 'ARCHIVED' as const };
    const missing = () => ProblemException.notFound('Le contenu signalé est introuvable.');
    switch (targetType) {
      case 'FILM': {
        const film = await tx.film.findUnique({ where, select: { slug: true, state: true } });
        if (!film) throw missing();
        await tx.film.update({ where, data });
        return { entity: 'film', auditEntity: 'Film', slug: film.slug, before: film.state };
      }
      case 'ARTICLE': {
        const article = await tx.article.findUnique({ where, select: { slug: true, state: true } });
        if (!article) throw missing();
        await tx.article.update({ where, data });
        return {
          entity: 'article',
          auditEntity: 'Article',
          slug: article.slug,
          before: article.state,
        };
      }
      case 'POST': {
        const post = await tx.post.findUnique({ where, select: { state: true } });
        if (!post) throw missing();
        await tx.post.update({ where, data });
        return { entity: 'post', auditEntity: 'Post', slug: null, before: post.state };
      }
      case 'PERSON': {
        const person = await tx.person.findUnique({ where, select: { slug: true, state: true } });
        if (!person) throw missing();
        await tx.person.update({ where, data });
        return { entity: 'person', auditEntity: 'Person', slug: person.slug, before: person.state };
      }
      default:
        throw ProblemException.badRequest('Ce type de contenu ne peut pas être masqué.');
    }
  }
}
