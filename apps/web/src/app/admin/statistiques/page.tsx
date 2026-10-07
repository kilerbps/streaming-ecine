import type { Metadata } from 'next';
import { statsOverviewSchema } from '@ecine/contracts';
import { PageHeader } from '@/components/admin/page-header';
import { AccessDenied, LoadProblem } from '@/components/admin/problems';
import { param, statsDays } from '@/components/admin/query';
import { PeriodSwitch, StatsPanels } from '@/components/admin/stats';
import { adminLoad, viewerHasRole } from '@/server/actions/admin/core';

export const metadata: Metadata = { title: 'Statistiques' };

export default async function AdminStatsPage({ searchParams }: PageProps<'/admin/statistiques'>) {
  if (!(await viewerHasRole('ADMIN')))
    return <AccessDenied message="Les statistiques sont réservées aux administrateurs." />;
  const days = statsDays(param(await searchParams, 'days'));
  const stats = await adminLoad(statsOverviewSchema, '/admin/stats/overview', { days });
  return (
    <>
      <PageHeader
        title="Statistiques"
        description={`Fréquentation et lectures des ${days} derniers jours.`}
        actions={<PeriodSwitch days={days} basePath="/admin/statistiques" />}
      />
      {stats.ok ? <StatsPanels stats={stats.data} /> : <LoadProblem failure={stats} />}
    </>
  );
}
