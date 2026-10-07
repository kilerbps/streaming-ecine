import type { Metadata } from 'next';
import Link from 'next/link';
import { pageSchema, reportSchema, type Report } from '@ecine/contracts';
import { REPORT_STATE_LABELS } from '@/components/admin/labels';
import { PageHeader } from '@/components/admin/page-header';
import { AccessDenied, LoadProblem } from '@/components/admin/problems';
import { param } from '@/components/admin/query';
import { ReportsList } from '@/components/admin/reports-list';
import { adminLoad, viewerHasRole } from '@/server/actions/admin/core';

export const metadata: Metadata = { title: 'Signalements' };

const STATES: Report['state'][] = ['OPEN', 'RESOLVED', 'REJECTED'];

export default async function AdminReportsPage({ searchParams }: PageProps<'/admin/signalements'>) {
  if (!(await viewerHasRole('MODERATOR'))) return <AccessDenied />;
  const requested = param(await searchParams, 'state');
  const state = STATES.find((s) => s === requested) ?? 'OPEN';
  const [page, canEdit] = await Promise.all([
    adminLoad(pageSchema(reportSchema), '/admin/reports', { state, limit: 25 }),
    viewerHasRole('EDITOR'),
  ]);
  return (
    <>
      <PageHeader
        title="Signalements"
        description="Contenus signalés par les membres (droits, contenu inapproprié, spam). Le signaleur n’est jamais affiché."
      />
      <nav aria-label="Filtrer par état" className="mb-6 flex border-b border-border">
        {STATES.map((s) => (
          <Link
            key={s}
            href={s === 'OPEN' ? '/admin/signalements' : `/admin/signalements?state=${s}`}
            aria-current={s === state ? 'page' : undefined}
            className={`-mb-px min-h-11 content-center border-b-2 px-4 text-sm ${s === state ? 'border-accent text-text' : 'border-transparent text-muted hover:text-text'}`}
          >
            {REPORT_STATE_LABELS[s]}
          </Link>
        ))}
      </nav>
      {page.ok ? (
        <ReportsList key={state} initial={page.data} state={state} canEdit={canEdit} />
      ) : (
        <LoadProblem failure={page} />
      )}
    </>
  );
}
