import type { Metadata } from 'next';
import { pageSchema, redirectSchema } from '@ecine/contracts';
import { ListFilters } from '@/components/admin/list-filters';
import { PageHeader } from '@/components/admin/page-header';
import { AccessDenied, LoadProblem } from '@/components/admin/problems';
import { parseListQuery } from '@/components/admin/query';
import { RedirectsManager } from '@/components/admin/redirects-manager';
import { adminLoad, viewerHasRole } from '@/server/actions/admin/core';

export const metadata: Metadata = { title: 'Redirections' };

export default async function AdminRedirectsPage({
  searchParams,
}: PageProps<'/admin/redirections'>) {
  if (!(await viewerHasRole('EDITOR'))) return <AccessDenied />;
  const { q } = parseListQuery(await searchParams);
  const page = await adminLoad(pageSchema(redirectSchema), '/admin/redirects', { q, limit: 25 });
  return (
    <>
      <PageHeader
        title="Redirections"
        description="Aucun lien publié ne doit mener à une page introuvable."
      />
      <ListFilters
        action="/admin/redirections"
        q={q}
        withState={false}
        withDeleted={false}
        searchLabel="Rechercher une adresse"
      />
      {page.ok ? <RedirectsManager initial={page.data} q={q} /> : <LoadProblem failure={page} />}
    </>
  );
}
