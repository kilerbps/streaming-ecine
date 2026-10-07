import type { Metadata } from 'next';
import { adminRowSchema, pageSchema } from '@ecine/contracts';
import { ContentTable } from '@/components/admin/content-table';
import { ListFilters } from '@/components/admin/list-filters';
import { PageHeader } from '@/components/admin/page-header';
import { AccessDenied, LoadProblem } from '@/components/admin/problems';
import { parseListQuery } from '@/components/admin/query';
import { LinkButton } from '@/components/ui/link-button';
import { adminLoad, viewerHasRole } from '@/server/actions/admin/core';

export const metadata: Metadata = { title: 'Pages' };

export default async function AdminStaticPagesPage({ searchParams }: PageProps<'/admin/pages'>) {
  if (!(await viewerHasRole('EDITOR'))) return <AccessDenied />;
  const { q, state } = parseListQuery(await searchParams);
  const query = { q, state };
  const page = await adminLoad(pageSchema(adminRowSchema), '/admin/pages', { ...query, limit: 25 });
  return (
    <>
      <PageHeader
        title="Pages du site"
        description="À propos, mentions légales, confidentialité, conditions, cookies. Chaque modification crée une nouvelle version."
        actions={
          <LinkButton href="/admin/pages/nouveau" variant="primary" icon="plus">
            Nouvelle page
          </LinkButton>
        }
      />
      <ListFilters action="/admin/pages" q={q} state={state} withDeleted={false} />
      {page.ok ? (
        <ContentTable
          kind="pages"
          initial={page.data}
          query={query}
          empty={{ title: 'Aucune page', body: 'Créez une page avec « Nouvelle page ».' }}
        />
      ) : (
        <LoadProblem failure={page} />
      )}
    </>
  );
}
