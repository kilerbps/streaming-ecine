import type { Metadata } from 'next';
import Link from 'next/link';
import {
  adminRowSchema,
  contactMessageSchema,
  hasRole,
  pageSchema,
  reportSchema,
  statsOverviewSchema,
  type PublishState,
} from '@ecine/contracts';
import { USER_ROLE_LABELS } from '@/components/admin/labels';
import { PageHeader } from '@/components/admin/page-header';
import { LoadProblem } from '@/components/admin/problems';
import { param, statsDays } from '@/components/admin/query';
import { PeriodSwitch, StatsPanels } from '@/components/admin/stats';
import { Icon, type IconName } from '@/components/ui/icon';
import { LinkButton } from '@/components/ui/link-button';
import { adminLoad, type Loaded } from '@/server/actions/admin/core';
import { getViewer } from '@/server/data';

export const metadata: Metadata = { title: 'Tableau de bord' };

const LIMIT = 50;

/** Nombre d'éléments (plafonné à 50 : « 50+ » au-delà ; l'API n'expose pas de compteur dédié). */
function countOf(
  result: Loaded<{ items: unknown[]; nextCursor: string | null }>,
  keep: (item: never) => boolean = () => true,
): string {
  if (!result.ok) return '—';
  const n = (result.data.items as never[]).filter(keep).length;
  return result.data.nextCursor ? `${n}+` : String(n);
}

function rows(path: string, state: PublishState) {
  return adminLoad(pageSchema(adminRowSchema), path, { state, limit: LIMIT });
}

function CountTile({
  label,
  value,
  href,
  icon,
  hint,
}: {
  label: string;
  value: string;
  href: string;
  icon: IconName;
  hint?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 border border-border bg-surface-1 p-4 hover:border-border-strong hover:bg-surface-2"
    >
      <span className="flex items-center justify-between text-sm text-muted">
        {label}
        <Icon name={icon} size={18} />
      </span>
      <span className="font-sans text-3xl font-semibold tabular-nums">{value}</span>
      {hint ? <span className="text-sm text-muted group-hover:text-text">{hint}</span> : null}
    </Link>
  );
}

/** Tableau de bord : ce qui attend une action (brouillons, planifiés, signalements, messages) et, pour les administrateurs, la fréquentation. */
export default async function AdminDashboardPage({ searchParams }: PageProps<'/admin'>) {
  const viewer = await getViewer();
  if (!viewer) return null;
  const isEditor = hasRole(viewer.role, 'EDITOR');
  const isAdmin = hasRole(viewer.role, 'ADMIN');
  const days = statsDays(param(await searchParams, 'days'));

  const [
    filmDrafts,
    articleDrafts,
    postDrafts,
    filmsScheduled,
    articlesScheduled,
    postsScheduled,
    reports,
    messages,
    stats,
  ] = await Promise.all([
    isEditor ? rows('/admin/films', 'DRAFT') : null,
    isEditor ? rows('/admin/articles', 'DRAFT') : null,
    isEditor ? rows('/admin/posts', 'DRAFT') : null,
    isEditor ? rows('/admin/films', 'SCHEDULED') : null,
    isEditor ? rows('/admin/articles', 'SCHEDULED') : null,
    isEditor ? rows('/admin/posts', 'SCHEDULED') : null,
    adminLoad(pageSchema(reportSchema), '/admin/reports', { state: 'OPEN', limit: LIMIT }),
    isEditor
      ? adminLoad(pageSchema(contactMessageSchema), '/admin/contact-messages', { limit: LIMIT })
      : null,
    isAdmin ? adminLoad(statsOverviewSchema, '/admin/stats/overview', { days }) : null,
  ]);
  if (!reports.ok && reports.kind !== 'unavailable') return <LoadProblem failure={reports} />;

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description={`Bonjour ${viewer.displayName} · ${USER_ROLE_LABELS[viewer.role]}`}
        actions={
          isEditor ? (
            <>
              <LinkButton href="/admin/films/nouveau" variant="secondary" icon="plus">
                Nouveau film
              </LinkButton>
              <LinkButton href="/admin/actualites/nouveau" variant="secondary" icon="plus">
                Nouvelle actualité
              </LinkButton>
              <LinkButton href="/admin/publications/nouveau" variant="secondary" icon="plus">
                Nouvelle publication
              </LinkButton>
            </>
          ) : null
        }
      />

      <section aria-labelledby="a-faire" className="mb-10">
        <h2 id="a-faire" className="mb-4 font-serif text-2xl">
          À traiter
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CountTile
            label="Signalements ouverts"
            value={countOf(reports)}
            href="/admin/signalements"
            icon="flag"
            hint="Ouvrir la file de modération"
          />
          {messages ? (
            <CountTile
              label="Messages à traiter"
              value={countOf(messages, (m: { handledAt: string | null }) => m.handledAt === null)}
              href="/admin/messages"
              icon="mail"
              hint="Formulaire de contact"
            />
          ) : null}
          {filmDrafts ? (
            <CountTile
              label="Films en brouillon"
              value={countOf(filmDrafts)}
              href="/admin/films?state=DRAFT"
              icon="film"
            />
          ) : null}
          {articleDrafts ? (
            <CountTile
              label="Actualités en brouillon"
              value={countOf(articleDrafts)}
              href="/admin/actualites?state=DRAFT"
              icon="news"
            />
          ) : null}
          {postDrafts ? (
            <CountTile
              label="Publications en brouillon"
              value={countOf(postDrafts)}
              href="/admin/publications?state=DRAFT"
              icon="image"
            />
          ) : null}
          {filmsScheduled ? (
            <CountTile
              label="Films planifiés"
              value={countOf(filmsScheduled)}
              href="/admin/films?state=SCHEDULED"
              icon="calendar"
            />
          ) : null}
          {articlesScheduled ? (
            <CountTile
              label="Actualités planifiées"
              value={countOf(articlesScheduled)}
              href="/admin/actualites?state=SCHEDULED"
              icon="calendar"
            />
          ) : null}
          {postsScheduled ? (
            <CountTile
              label="Publications planifiées"
              value={countOf(postsScheduled)}
              href="/admin/publications?state=SCHEDULED"
              icon="calendar"
            />
          ) : null}
        </div>
      </section>

      {stats ? (
        <section aria-labelledby="frequentation">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 id="frequentation" className="font-serif text-2xl">
                Fréquentation
              </h2>
              <p className="text-sm text-muted">
                {days} derniers jours ·{' '}
                <Link href={`/admin/statistiques?days=${days}`} className="underline">
                  statistiques détaillées
                </Link>
              </p>
            </div>
            <PeriodSwitch days={days} basePath="/admin" />
          </div>
          {stats.ok ? <StatsPanels stats={stats.data} compact /> : <LoadProblem failure={stats} />}
        </section>
      ) : null}
    </>
  );
}
