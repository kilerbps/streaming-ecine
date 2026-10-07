import type { Metadata } from 'next';
import { adminRowSchema, pageSchema } from '@ecine/contracts';
import { ContentTable } from '@/components/admin/content-table';
import { ListFilters } from '@/components/admin/list-filters';
import { PageHeader } from '@/components/admin/page-header';
import { AccessDenied, LoadProblem } from '@/components/admin/problems';
import { parseListQuery } from '@/components/admin/query';
import { LinkButton } from '@/components/ui/link-button';
import { adminLoad, viewerHasRole } from '@/server/actions/admin/core';

export const metadata: Metadata = { title: 'Actualités' };

export default async function AdminArticlesPage({ searchParams }: PageProps<'/admin/actualites'>) {
  if (!(await viewerHasRole('EDITOR'))) return <AccessDenied />;
  const query = parseListQuery(await searchParams);
  const page = await adminLoad(pageSchema(adminRowSchema), '/admin/articles', {
    ...query,
    limit: 25,
  });
  return (
    <>
      <PageHeader
        title="Actualités, annonces et événements"
        actions={
          <LinkButton href="/admin/actualites/nouveau" variant="primary" icon="plus">
            Nouvelle actualité
          </LinkButton>
        }
      />
      <ListFilters
        action="/admin/actualites"
        q={query.q}
        state={query.state}
        includeDeleted={query.includeDeleted === 'true'}
      />
      {page.ok ? (
        <ContentTable
          kind="articles"
          initial={page.data}
          query={query}
          empty={{
            title: 'Aucune actualité pour l’instant',
            body: 'Rédigez la première avec « Nouvelle actualité ».',
          }}
        />
      ) : (
        <LoadProblem failure={page} />
      )}
    </>
  );
}
