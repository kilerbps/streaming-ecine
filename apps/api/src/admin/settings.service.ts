import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import {
  socialsSchema,
  type AdminListQuery,
  type Page,
  type Redirect,
  type redirectInputSchema,
  type SiteSettings,
  type siteSettingsInputSchema,
} from '@ecine/contracts';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import { ProblemException } from '../common/problem.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ContentEventsService } from '../revalidate/content-events.service.js';
import {
  auditDiff,
  type AuditSnapshot,
  containsInsensitive,
  createdBefore,
  decodeAdminCursor,
  pageOf,
  redirectInputProblem,
} from './admin.helpers.js';

type SiteSettingsInput = z.infer<typeof siteSettingsInputSchema>;
type RedirectInput = z.infer<typeof redirectInputSchema>;

/** Longueur maximale d'une chaîne de redirections explorée pour détecter une boucle. */
const MAX_REDIRECT_HOPS = 20;

function settingsSnapshot(settings: SiteSettings): AuditSnapshot {
  return {
    contactEmail: settings.contactEmail,
    phone: settings.phone,
    socials: Object.entries(settings.socials).map(([network, url]) => `${network}:${url}`),
    adsEnabled: settings.adsEnabled,
  };
}

/** Paramètres du site (ligne unique id = 1) et redirections manuelles (FR-105). */
@Injectable()
export class AdminSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: ContentEventsService,
  ) {}

  async settings(): Promise<SiteSettings> {
    const settings = await this.prisma.siteSettings.findUnique({ where: { id: 1 } });
    const socials = socialsSchema.safeParse(settings?.socials ?? {});
    return {
      contactEmail: settings?.contactEmail ?? '',
      phone: settings?.phone ?? null,
      socials: socials.success ? socials.data : {},
      adsEnabled: settings?.adsEnabled ?? false,
    };
  }

  async updateSettings(req: Request, input: SiteSettingsInput): Promise<SiteSettings> {
    const before = await this.settings();
    const data = {
      contactEmail: input.contactEmail,
      phone: input.phone || null,
      socials: input.socials,
      adsEnabled: input.adsEnabled,
    };
    await this.prisma.siteSettings.upsert({
      where: { id: 1 },
      create: { id: 1, ...data },
      update: data,
    });
    const after = await this.settings();
    await this.audit.log(req, {
      action: 'settings.update',
      entity: 'SiteSettings',
      entityId: '1',
      meta: auditDiff(settingsSnapshot(before), settingsSnapshot(after)),
    });
    await this.events.changed('settings');
    return after;
  }

  async redirects(q: AdminListQuery): Promise<Page<Redirect>> {
    const rows = await this.prisma.redirect.findMany({
      where: {
        ...(q.q
          ? { OR: [{ fromPath: containsInsensitive(q.q) }, { toPath: containsInsensitive(q.q) }] }
          : {}),
        ...(q.cursor ? { AND: [createdBefore(decodeAdminCursor(q.cursor))] } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: q.limit + 1,
    });
    return pageOf(
      rows,
      q.limit,
      (r) => r.createdAt,
      (r) => ({ id: r.id, fromPath: r.fromPath, toPath: r.toPath, status: r.status }),
    );
  }

  async createRedirect(req: Request, input: RedirectInput): Promise<Redirect> {
    const problem = redirectInputProblem(input.fromPath, input.toPath);
    if (problem) throw ProblemException.badRequest(problem, [{ path: 'toPath', message: problem }]);

    const redirect = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.redirect.findUnique({
        where: { fromPath: input.fromPath },
        select: { id: true },
      });
      if (existing) throw ProblemException.conflict('Une redirection existe déjà pour ce chemin.');
      // Suit la chaîne à partir de la destination (requête récursive paramétrée) : A→B refusé si B mène à A.
      const [chain] = await tx.$queryRaw<Array<{ loop: boolean }>>(Prisma.sql`
        WITH RECURSIVE chain(path, depth) AS (
          SELECT ${input.toPath}::text, 0
          UNION ALL
          SELECT r."toPath", c.depth + 1 FROM redirects r JOIN chain c ON r."fromPath" = c.path
          WHERE c.depth < ${MAX_REDIRECT_HOPS}
        )
        SELECT EXISTS (SELECT 1 FROM chain WHERE path = ${input.fromPath}) AS loop`);
      if (chain?.loop) {
        throw ProblemException.badRequest('Cette redirection créerait une boucle.', [
          {
            path: 'toPath',
            message: 'La destination redirige déjà (directement ou non) vers le chemin d’origine.',
          },
        ]);
      }
      const created = await tx.redirect.create({ data: input });
      // Pas de chaîne : les redirections qui visaient l'ancien chemin pointent directement vers la destination.
      await tx.redirect.updateMany({
        where: { toPath: input.fromPath },
        data: { toPath: input.toPath },
      });
      return created;
    });
    await this.audit.log(req, {
      action: 'redirect.create',
      entity: 'Redirect',
      entityId: redirect.id,
      meta: { ...input },
    });
    await this.events.changed('redirect');
    return {
      id: redirect.id,
      fromPath: redirect.fromPath,
      toPath: redirect.toPath,
      status: redirect.status,
    };
  }

  async removeRedirect(req: Request, id: string): Promise<void> {
    const redirect = await this.prisma.redirect.findUnique({ where: { id } });
    if (!redirect) throw ProblemException.notFound('Cette redirection est introuvable.');
    await this.prisma.redirect.delete({ where: { id } });
    await this.audit.log(req, {
      action: 'redirect.delete',
      entity: 'Redirect',
      entityId: id,
      meta: { fromPath: redirect.fromPath, toPath: redirect.toPath, status: redirect.status },
    });
    await this.events.changed('redirect');
  }
}
