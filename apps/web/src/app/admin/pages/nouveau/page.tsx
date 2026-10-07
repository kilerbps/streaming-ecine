import type { Metadata } from 'next';
import { EDITOR_GRID } from '@/components/admin/editor-kit';
import { PageEditor } from '@/components/admin/page-editor';
import { PageHeader } from '@/components/admin/page-header';
import { AccessDenied } from '@/components/admin/problems';
import { viewerHasRole } from '@/server/actions/admin/core';

export const metadata: Metadata = { title: 'Nouvelle page' };

export default async function NewStaticPage() {
  if (!(await viewerHasRole('EDITOR'))) return <AccessDenied />;
  return (
    <>
      <PageHeader
        title="Nouvelle page"
        back={{ href: '/admin/pages', label: 'Pages' }}
        description="Créée en brouillon."
      />
      <div className={EDITOR_GRID}>
        <PageEditor page={null} check={null} />
      </div>
    </>
  );
}
