import { Injectable } from '@nestjs/common';
import {
  DEFAULT_LOCALE,
  type AuditEntry,
  type CursorQuery,
  type Page,
  type StatsOverview,
} from '@ecine/contracts';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  createdBefore,
  type DailyStats,
  decodeAdminCursor,
  fillDaily,
  pageOf,
  statsWindow,
  toCsv,
} from './admin.helpers.js';

const EVENT_TYPES = ['page_view', 'play_start', 'play_complete'] as const;
const TOP_LIMIT = 10;

/** Journal d'audit (lecture seule) et statistiques agrégées sans donnée personnelle (FR-103, FR-104). */
@Injectable()
export class AdminInsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async auditLog(q: CursorQuery): Promise<Page<AuditEntry>> {
    const rows = await this.prisma.auditLog.findMany({
      where: createdBefore(decodeAdminCursor(q.cursor)),
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        createdAt: true,
        actor: { select: { displayName: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: q.limit + 1,
    });
    return pageOf(
      rows,
      q.limit,
      (r) => r.createdAt,
      (r) => ({
        id: r.id,
        actor: r.actor?.displayName ?? null,
        action: r.action,
        entity: r.entity,
        entityId: r.entityId,
        createdAt: r.createdAt.toISOString(),
      }),
    );
  }

  async overview(days: number): Promise<StatsOverview> {
    const { since, dayKeys } = statsWindow(days);
    const range = { createdAt: { gte: since } };
    const [daily, totals, members, topFilms, devices, referrers] = await Promise.all([
      this.daily(since, dayKeys),
      this.prisma.analyticsEvent.groupBy({
        by: ['type'],
        where: { ...range, type: { in: [...EVENT_TYPES] } },
        _count: { _all: true },
      }),
      this.prisma.user.count({ where: { role: 'MEMBER', deletedAt: null } }),
      this.topFilms(since),
      this.prisma.analyticsEvent.groupBy({
        by: ['device'],
        where: { ...range, type: 'page_view' },
        _count: { _all: true },
      }),
      this.prisma.analyticsEvent.groupBy({
        by: ['referrer'],
        where: { ...range, type: 'page_view', referrer: { not: null } },
        _count: { referrer: true },
        orderBy: { _count: { referrer: 'desc' } },
        take: TOP_LIMIT,
      }),
    ]);
    const total = (type: (typeof EVENT_TYPES)[number]) =>
      totals.find((t) => t.type === type)?._count._all ?? 0;
    return {
      days,
      visits: total('page_view'),
      playStarts: total('play_start'),
      playCompletes: total('play_complete'),
      members,
      daily: daily.map((d) => ({ date: d.date, visits: d.visits, playStarts: d.playStarts })),
      topFilms,
      devices: devices
        .map((d) => ({ device: d.device ?? 'inconnu', count: d._count._all }))
        .sort((a, b) => b.count - a.count),
      referrers: referrers.map((r) => ({ referrer: r.referrer ?? '', count: r._count.referrer })),
    };
  }

  /** Export CSV des séries quotidiennes (en-têtes en français, une ligne par jour). */
  async exportCsv(days: number): Promise<string> {
    const { since, dayKeys } = statsWindow(days);
    const daily = await this.daily(since, dayKeys);
    return toCsv(
      ['date', 'visites', 'lectures_lancees', 'lectures_terminees'],
      daily.map((d) => [d.date, d.visits, d.playStarts, d.playCompletes]),
    );
  }

  /** Séries quotidiennes en une requête paramétrée (seau = jour civil UTC), jours vides complétés. */
  private async daily(since: Date, dayKeys: string[]): Promise<DailyStats[]> {
    const rows = await this.prisma.$queryRaw<DailyStats[]>(Prisma.sql`
      SELECT to_char(date_trunc('day', e."createdAt"), 'YYYY-MM-DD') AS "date",
             (count(*) FILTER (WHERE e.type = 'page_view'))::int AS "visits",
             (count(*) FILTER (WHERE e.type = 'play_start'))::int AS "playStarts",
             (count(*) FILTER (WHERE e.type = 'play_complete'))::int AS "playCompletes"
      FROM analytics_events e
      WHERE e."createdAt" >= ${since} AND e.type IN (${Prisma.join([...EVENT_TYPES])})
      GROUP BY 1
      ORDER BY 1`);
    return fillDaily(dayKeys, rows);
  }

  /** Films les plus lancés : agrégat sur les événements puis une requête pour les titres (pas de N+1). */
  private async topFilms(since: Date): Promise<StatsOverview['topFilms']> {
    const plays = await this.prisma.analyticsEvent.groupBy({
      by: ['targetId'],
      where: {
        createdAt: { gte: since },
        type: 'play_start',
        targetType: 'FILM',
        targetId: { not: null },
      },
      _count: { targetId: true },
      orderBy: { _count: { targetId: 'desc' } },
      take: TOP_LIMIT,
    });
    const ids = plays.map((p) => p.targetId).filter((id): id is string => id !== null);
    if (ids.length === 0) return [];
    const films = await this.prisma.film.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        slug: true,
        translations: { where: { locale: DEFAULT_LOCALE }, select: { title: true } },
      },
    });
    const titles = new Map(films.map((f) => [f.id, f.translations[0]?.title ?? f.slug]));
    return plays
      .filter(
        (p): p is typeof p & { targetId: string } => p.targetId !== null && titles.has(p.targetId),
      )
      .map((p) => ({
        id: p.targetId,
        title: titles.get(p.targetId) ?? '',
        plays: p._count.targetId,
      }));
  }
}
