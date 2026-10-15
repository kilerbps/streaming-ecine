import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { ENV, type Env } from '../config/env.js';
import { visibleWhere } from '../content/content.helpers.js';
import { MailService } from '../mail/mail.service.js';
import { mailTemplates } from '../mail/mail.templates.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { type ContentEntity, ContentEventsService } from '../revalidate/content-events.service.js';

const TICK_MS = 60_000;
/** Rappels envoyés par passage : le reste part au passage suivant. */
const REMINDERS_PER_TICK = 200;

/**
 * Publication planifiée : toutes les 60 s, les films, actualités et publications `SCHEDULED` dont l'heure
 * est passée passent en `PUBLISHED`, puis caches et pages Next.js sont invalidés. Idempotent (mise à jour
 * conditionnelle) : sans effet de bord si plusieurs instances tournent. Désactivé en test.
 *
 * Sorties annoncées : quand l'heure de sortie d'un film passe, caches et pages sont invalidés (il
 * devient lisible) et les rappels « Me le rappeler » partent par e-mail, une seule fois chacun.
 */
@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  /** Dernière vérification des sorties ; au démarrage, les 10 dernières minutes sont rattrapées. */
  private releasesCheckedAt = new Date(Date.now() - 10 * 60_000);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: ContentEventsService,
    private readonly mail: MailService,
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
      await this.releaseAnnounced(now);
      await this.sendReminders(now);
    } catch (err) {
      // Nouvel essai au prochain passage : une base momentanément indisponible ne doit pas arrêter l'API.
      this.logger.warn(`Publication planifiée reportée : ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  /** Films dont l'heure de sortie vient de passer : invalidation pour qu'ils deviennent lisibles. */
  private async releaseAnnounced(now: Date): Promise<void> {
    const released = await this.prisma.film.findMany({
      where: { ...visibleWhere(now), releaseAt: { gt: this.releasesCheckedAt, lte: now } },
      select: { slug: true },
    });
    this.releasesCheckedAt = now;
    if (released.length === 0) return;
    await this.events.changed(
      'film',
      released.map((f) => f.slug),
    );
    this.logger.log(`${released.length} film(s) sorti(s) à l'heure annoncée`);
  }

  /** Rappels dus : chacun est réservé (notifiedAt) avant l'envoi, pour ne jamais partir deux fois. */
  private async sendReminders(now: Date): Promise<void> {
    const due = await this.prisma.reminder.findMany({
      where: { notifiedAt: null, film: { ...visibleWhere(now), releaseAt: { lte: now } } },
      take: REMINDERS_PER_TICK,
      include: {
        user: { select: { email: true, displayName: true } },
        film: {
          select: {
            slug: true,
            originalTitle: true,
            translations: { where: { locale: 'fr' }, select: { title: true } },
          },
        },
      },
    });
    for (const reminder of due) {
      const { count } = await this.prisma.reminder.updateMany({
        where: { userId: reminder.userId, filmId: reminder.filmId, notifiedAt: null },
        data: { notifiedAt: now },
      });
      if (count === 0) continue;
      const title =
        reminder.film.translations[0]?.title ?? reminder.film.originalTitle ?? reminder.film.slug;
      const link = new URL(`/fr/films/${reminder.film.slug}`, this.env.APP_URL).toString();
      try {
        await this.mail.send(
          mailTemplates.filmReleased(reminder.user.email, reminder.user.displayName, title, link),
        );
      } catch (err) {
        this.logger.warn(`Rappel non envoyé (${reminder.filmId}) : ${(err as Error).message}`);
      }
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
