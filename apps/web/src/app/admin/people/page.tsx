import type { Metadata } from 'next';
import { adminRowSchema, pageSchema } from '@ecine/contracts';
import { ContentTable } from '@/components/admin/content-table';
import { ListFilters } from '@/components/admin/list-filters';
import { PageHeader } from '@/components/admin/page-header';
import { AccessDenied, LoadProblem } from '@/components/admin/problems';
import { parseListQuery } from '@/components/admin/query';
import { LinkButton } from '@/components/ui/link-button';
import { adminLoad, viewerHasRole } from '@/server/actions/admin/core';

export const metadata: Metadata = { title: 'Personnes' };

export default async function AdminPeoplePage({ searchParams }: PageProps<'/admin/people'>) {
  if (!(await viewerHasRole('EDITOR'))) return <AccessDenied />;
  const query = parseListQuery(await searchParams);
  const page = await adminLoad(pageSchema(adminRowSchema), '/admin/people', {
    ...query,
    limit: 25,
  });
  return (
    <>
      <PageHeader
        title="Personnes"
        description="Actrices, acteurs, réalisateurs et équipes techniques, crédités sur les films."
        actions={
          <LinkButton href="/admin/people/nouveau" variant="primary" icon="plus">
            Nouvelle personne
          </LinkButton>
        }
      />
      <ListFilters
        action="/admin/people"
        q={query.q}
        state={query.state}
        includeDeleted={query.includeDeleted === 'true'}
        searchLabel="Rechercher par nom"
      />
      {page.ok ? (
        <ContentTable
          kind="people"
          initial={page.data}
          query={query}
          empty={{
            title: 'Aucune personne pour l’instant',
            body: 'Créez une fiche avec « Nouvelle personne ».',
          }}
        />
      ) : (
        <LoadProblem failure={page} />
      )}
    </>
  );
}
