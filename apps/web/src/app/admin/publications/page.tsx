import type { Metadata } from 'next';
import { adminRowSchema, pageSchema } from '@ecine/contracts';
import { ContentTable } from '@/components/admin/content-table';
import { ListFilters } from '@/components/admin/list-filters';
import { PageHeader } from '@/components/admin/page-header';
import { AccessDenied, LoadProblem } from '@/components/admin/problems';
import { parseListQuery } from '@/components/admin/query';
import { LinkButton } from '@/components/ui/link-button';
import { adminLoad, viewerHasRole } from '@/server/actions/admin/core';

export const metadata: Metadata = { title: 'Publications' };

export default async function AdminPostsPage({ searchParams }: PageProps<'/admin/publications'>) {
  if (!(await viewerHasRole('EDITOR'))) return <AccessDenied />;
  const query = parseListQuery(await searchParams);
  const page = await adminLoad(pageSchema(adminRowSchema), '/admin/posts', { ...query, limit: 25 });
  return (
    <>
      <PageHeader
        title="Publications du fil"
        description="Photos et textes courts mêlés aux films dans le fil d’accueil."
        actions={
          <LinkButton href="/admin/publications/nouveau" variant="primary" icon="plus">
            Nouvelle publication
          </LinkButton>
        }
      />
      <ListFilters
        action="/admin/publications"
        q={query.q}
        state={query.state}
        includeDeleted={query.includeDeleted === 'true'}
        searchLabel="Rechercher dans les légendes"
      />
      {page.ok ? (
        <ContentTable
          kind="posts"
          initial={page.data}
          query={query}
          empty={{
            title: 'Aucune publication pour l’instant',
            body: 'Partagez des photos de tournage avec « Nouvelle publication ».',
          }}
        />
      ) : (
        <LoadProblem failure={page} />
      )}
    </>
  );
}
