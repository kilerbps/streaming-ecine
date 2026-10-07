import type { Metadata } from 'next';
import { ArticleEditor } from '@/components/admin/article-editor';
import { EDITOR_GRID } from '@/components/admin/editor-kit';
import { PageHeader } from '@/components/admin/page-header';
import { AccessDenied } from '@/components/admin/problems';
import { viewerHasRole } from '@/server/actions/admin/core';

export const metadata: Metadata = { title: 'Nouvelle actualité' };

export default async function NewArticlePage() {
  if (!(await viewerHasRole('EDITOR'))) return <AccessDenied />;
  return (
    <>
      <PageHeader
        title="Nouvelle actualité"
        back={{ href: '/admin/actualites', label: 'Actualités' }}
        description="Actualité, annonce ou événement : créé en brouillon."
      />
      <div className={EDITOR_GRID}>
        <ArticleEditor article={null} featuredFilm={null} check={null} />
      </div>
    </>
  );
}
