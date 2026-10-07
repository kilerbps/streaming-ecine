import type { Metadata } from 'next';
import { adminRowSchema, pageSchema } from '@ecine/contracts';
import { ContentTable } from '@/components/admin/content-table';
import { ListFilters } from '@/components/admin/list-filters';
import { PageHeader } from '@/components/admin/page-header';
import { AccessDenied, LoadProblem } from '@/components/admin/problems';
import { parseListQuery } from '@/components/admin/query';
import { LinkButton } from '@/components/ui/link-button';
import { adminLoad, viewerHasRole } from '@/server/actions/admin/core';

export const metadata: Metadata = { title: 'Films' };

export default async function AdminFilmsPage({ searchParams }: PageProps<'/admin/films'>) {
  if (!(await viewerHasRole('EDITOR'))) return <AccessDenied />;
  const query = parseListQuery(await searchParams);
  const page = await adminLoad(pageSchema(adminRowSchema), '/admin/films', { ...query, limit: 25 });
  return (
    <>
      <PageHeader
        title="Films et courts-métrages"
        description="Les plus récemment modifiés en premier."
        actions={
          <LinkButton href="/admin/films/nouveau" variant="primary" icon="plus">
            Nouveau film
          </LinkButton>
        }
      />
      <ListFilters
        action="/admin/films"
        q={query.q}
        state={query.state}
        includeDeleted={query.includeDeleted === 'true'}
      />
      {page.ok ? (
        <ContentTable
          kind="films"
          initial={page.data}
          query={query}
          empty={{
            title: 'Aucun film pour l’instant',
            body: 'Créez la première fiche avec « Nouveau film ».',
          }}
        />
      ) : (
        <LoadProblem failure={page} />
      )}
    </>
  );
}
