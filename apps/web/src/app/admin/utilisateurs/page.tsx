import type { Metadata } from 'next';
import { adminUserSchema, pageSchema } from '@ecine/contracts';
import { ListFilters } from '@/components/admin/list-filters';
import { PageHeader } from '@/components/admin/page-header';
import { AccessDenied, LoadProblem } from '@/components/admin/problems';
import { parseListQuery } from '@/components/admin/query';
import { UsersList } from '@/components/admin/users-list';
import { adminLoad, viewerHasRole } from '@/server/actions/admin/core';
import { getViewer } from '@/server/data';

export const metadata: Metadata = { title: 'Utilisateurs' };

export default async function AdminUsersPage({ searchParams }: PageProps<'/admin/utilisateurs'>) {
  if (!(await viewerHasRole('ADMIN')))
    return <AccessDenied message="La gestion des comptes est réservée aux administrateurs." />;
  const { q } = parseListQuery(await searchParams);
  const [page, viewer] = await Promise.all([
    adminLoad(pageSchema(adminUserSchema), '/admin/users', { q, limit: 25 }),
    getViewer(),
  ]);
  return (
    <>
      <PageHeader
        title="Utilisateurs et rôles"
        description="Les administrateurs doivent activer la double authentification. Chaque changement est inscrit au journal."
      />
      <ListFilters
        action="/admin/utilisateurs"
        q={q}
        withState={false}
        withDeleted={false}
        searchLabel="Rechercher par adresse e-mail"
      />
      {page.ok && viewer ? (
        <UsersList initial={page.data} q={q} viewer={{ id: viewer.id, role: viewer.role }} />
      ) : null}
      {!page.ok ? <LoadProblem failure={page} /> : null}
    </>
  );
}
