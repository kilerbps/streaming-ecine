import Link from 'next/link';
import type { StatsOverview } from '@ecine/contracts';
import { Icon } from '@/components/ui/icon';
import { formatCount, formatDay } from './format';

/**
 * Statistiques agrégées (sans donnée personnelle), rendues côté serveur en aplats :
 * une seule série par graphique (pas de légende, le titre la nomme), un seul axe, valeurs exactes
 * au survol et dans un tableau dépliable. Couleur des barres = token d'accent ; textes en tokens de texte.
 */

const PERIODS = [7, 30, 90] as const;

/** Arrondi « propre » du haut d'axe (1, 2, 5 × 10ⁿ). */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((m) => m * power >= value) ?? 10;
  return step * power;
}

function percent(part: number, total: number): string {
  return total > 0 ? `${Math.round((part / total) * 100)} %` : '—';
}

export function PeriodSwitch({ days, basePath }: { days: number; basePath: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <nav aria-label="Période" className="flex border border-border">
        {PERIODS.map((d) => (
          <Link
            key={d}
            href={`${basePath}?days=${d}`}
            aria-current={d === days ? 'page' : undefined}
            className={`min-h-11 content-center px-4 text-sm ${d === days ? 'bg-text text-bg' : 'text-muted hover:bg-surface-2 hover:text-text'}`}
          >
            {d} jours
          </Link>
        ))}
      </nav>
      <a
        href={`/admin/statistiques/export?days=${days}`}
        className="inline-flex min-h-11 items-center gap-2 border border-border-strong px-4 text-sm hover:bg-surface-2"
        download
      >
        <Icon name="download" size={18} />
        Exporter en CSV
      </a>
    </div>
  );
}

function StatTile({ label, value, detail }: { label: string; value: number; detail?: string }) {
  return (
    <div className="border border-border bg-surface-1 p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 font-sans text-3xl font-semibold tabular-nums">{formatCount(value)}</p>
      {detail ? <p className="mt-1 text-sm text-muted">{detail}</p> : null}
    </div>
  );
}

/** Colonnes par jour (une série) : survol = valeur exacte ; tableau des données dépliable. */
function DailyColumns({
  title,
  unit,
  points,
}: {
  title: string;
  unit: string;
  points: Array<{ date: string; value: number }>;
}) {
  const top = niceMax(Math.max(0, ...points.map((p) => p.value)));
  const mid = Math.floor(points.length / 2);
  return (
    <figure className="border border-border bg-surface-1 p-4">
      <figcaption className="font-medium">{title}</figcaption>
      <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
        <div
          className="flex h-40 flex-col justify-between text-right font-mono text-xs text-muted"
          aria-hidden="true"
        >
          <span>{formatCount(top)}</span>
          <span>0</span>
        </div>
        <div className="relative flex h-40 items-end gap-[2px] border-t border-b border-border">
          {points.map((p) => (
            <div
              key={p.date}
              className="group relative flex h-full min-w-0 flex-1 items-end justify-center"
            >
              <div
                className="w-full max-w-6 rounded-t-xs bg-accent"
                style={{ height: `${(p.value / top) * 100}%` }}
              />
              <div
                role="tooltip"
                className="pointer-events-none absolute bottom-full z-10 mb-1 hidden border border-border-strong bg-surface-2 px-2 py-1 text-xs whitespace-nowrap text-text group-hover:block"
              >
                {formatDay(p.date)} · {formatCount(p.value)} {unit}
              </div>
            </div>
          ))}
        </div>
        <div />
        <div className="mt-1 flex justify-between font-mono text-xs text-muted" aria-hidden="true">
          <span>{points[0] ? formatDay(points[0].date) : ''}</span>
          <span>{points[mid] ? formatDay(points[mid].date) : ''}</span>
          <span>{points.at(-1) ? formatDay(points.at(-1)!.date) : ''}</span>
        </div>
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted hover:text-text">Voir les données</summary>
        <div className="mt-2 max-h-64 overflow-y-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="py-1 font-normal text-muted">
                  Jour
                </th>
                <th scope="col" className="py-1 text-right font-normal text-muted">
                  {unit}
                </th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.date} className="border-b border-border last:border-b-0">
                  <td className="py-1">{formatDay(p.date)}</td>
                  <td className="py-1 text-right font-mono">{formatCount(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

/** Barres horizontales classées, valeur en bout de barre. */
function RankedBars({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: Array<{ label: string; value: number; href?: string }>;
  empty: string;
}) {
  const top = Math.max(1, ...rows.map((r) => r.value));
  return (
    <figure className="border border-border bg-surface-1 p-4">
      <figcaption className="font-medium">{title}</figcaption>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{empty}</p>
      ) : (
        <ol className="mt-4 flex flex-col gap-3">
          {rows.map((row) => (
            <li
              key={row.label}
              className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] items-center gap-3 text-sm md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]"
            >
              <span className="truncate" title={row.label}>
                {row.href ? (
                  <Link href={row.href} className="underline-offset-4 hover:underline">
                    {row.label}
                  </Link>
                ) : (
                  row.label
                )}
              </span>
              <span className="flex items-center gap-2">
                <span
                  className="h-3 rounded-r-xs bg-accent"
                  style={{ width: `${Math.max(2, (row.value / top) * 85)}%` }}
                  aria-hidden="true"
                />
                <span className="font-mono text-xs">{formatCount(row.value)}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </figure>
  );
}

const DEVICE_LABELS: Record<string, string> = {
  mobile: 'Mobile',
  tablet: 'Tablette',
  desktop: 'Ordinateur',
  unknown: 'Inconnu',
  inconnu: 'Inconnu',
};

/** Vue d'ensemble : chiffres clés, évolution quotidienne, top films, appareils, sources. */
export function StatsPanels({
  stats,
  compact = false,
}: {
  stats: StatsOverview;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Visites" value={stats.visits} detail={`sur ${stats.days} jours`} />
        <StatTile label="Lectures lancées" value={stats.playStarts} />
        <StatTile
          label="Lectures terminées"
          value={stats.playCompletes}
          detail={
            stats.playStarts > 0
              ? `${percent(stats.playCompletes, stats.playStarts)} des lectures lancées`
              : undefined
          }
        />
        <StatTile
          label="Membres inscrits"
          value={stats.members}
          detail="au total, depuis le lancement"
        />
      </div>
      <div
        className={`grid gap-6 ${compact ? 'lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]' : 'lg:grid-cols-2'}`}
      >
        <DailyColumns
          title="Visites par jour"
          unit="visites"
          points={stats.daily.map((d) => ({ date: d.date, value: d.visits }))}
        />
        {compact ? null : (
          <DailyColumns
            title="Lectures lancées par jour"
            unit="lectures"
            points={stats.daily.map((d) => ({ date: d.date, value: d.playStarts }))}
          />
        )}
        <RankedBars
          title="Films les plus regardés (lectures lancées)"
          rows={stats.topFilms.map((f) => ({
            label: f.title,
            value: f.plays,
            href: `/admin/films/${f.id}`,
          }))}
          empty="Aucune lecture sur la période."
        />
        {compact ? null : (
          <>
            <RankedBars
              title="Appareils"
              rows={stats.devices.map((d) => ({
                label: DEVICE_LABELS[d.device] ?? d.device,
                value: d.count,
              }))}
              empty="Aucune donnée sur la période."
            />
            <RankedBars
              title="Sources de trafic"
              rows={stats.referrers.map((r) => ({
                label: r.referrer || 'Accès direct',
                value: r.count,
              }))}
              empty="Aucune donnée sur la période."
            />
          </>
        )}
      </div>
      <p className="text-sm text-muted">
        Données agrégées et anonymes (aucune donnée personnelle), mesurées selon le consentement des
        visiteurs. Les jours sont comptés en temps universel (UTC).
      </p>
    </div>
  );
}
