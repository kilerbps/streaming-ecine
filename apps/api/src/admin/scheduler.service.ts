import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { ENV, type Env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { type ContentEntity, ContentEventsService } from '../revalidate/content-events.service.js';

const TICK_MS = 60_000;

/**
 * Publication planifiée : toutes les 60 s, les films, actualités et publications `SCHEDULED` dont l'heure
 * est passée passent en `PUBLISHED`, puis caches et pages Next.js sont invalidés. Idempotent (mise à jour
 * conditionnelle) : sans effet de bord si plusieurs instances tournent. Désactivé en test.
 */
@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: ContentEventsService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  onModuleInit(): void {
    if (this.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.tick(), TICK_MS);
    // N'empêche pas l'arrêt propre du processus.
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async tick(now = new Date()): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const due = { state: 'SCHEDULED' as const, publishAt: { lte: now }, deletedAt: null };
      const [films, articles, posts] = await Promise.all([
        this.prisma.film.findMany({ where: due, select: { id: true, slug: true } }),
        this.prisma.article.findMany({ where: due, select: { id: true, slug: true } }),
        this.prisma.post.findMany({ where: due, select: { id: true } }),
      ]);
      await this.release('film', 'Film', films, (ids) =>
        this.prisma.film.updateMany({
          where: { ...due, id: { in: ids } },
          data: { state: 'PUBLISHED' },
        }),
      );
      await this.release('article', 'Article', articles, (ids) =>
        this.prisma.article.updateMany({
          where: { ...due, id: { in: ids } },
          data: { state: 'PUBLISHED' },
        }),
      );
      await this.release('post', 'Post', posts, (ids) =>
        this.prisma.post.updateMany({
          where: { ...due, id: { in: ids } },
          data: { state: 'PUBLISHED' },
        }),
      );
    } catch (err) {
      // Nouvel essai au prochain passage : une base momentanément indisponible ne doit pas arrêter l'API.
      this.logger.warn(`Publication planifiée reportée : ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  private async release(
    entity: ContentEntity,
    auditEntity: string,
    rows: Array<{ id: string; slug?: string }>,
    update: (ids: string[]) => Promise<{ count: number }>,
  ): Promise<void> {
    if (rows.length === 0) return;
    const { count } = await update(rows.map((r) => r.id));
    // Déjà traité par une autre instance : rien à journaliser ni à invalider.
    if (count === 0) return;
    await Promise.all(
      rows.map((r) =>
        this.audit.log(null, {
          action: `${entity}.auto_publish`,
          entity: auditEntity,
          entityId: r.id,
          actorId: null,
        }),
      ),
    );
    await this.events.changed(
      entity,
      rows.map((r) => r.slug),
    );
    this.logger.log(`${count} contenu(s) « ${entity} » publié(s) à l'heure prévue`);
  }
}
