import type { Metadata } from 'next';
import { adminStaticPageSchema, publishCheckSchema } from '@ecine/contracts';
import { StateBadge } from '@/components/admin/badges';
import { EDITOR_GRID } from '@/components/admin/editor-kit';
import { PageEditor } from '@/components/admin/page-editor';
import { PageHeader } from '@/components/admin/page-header';
import { AccessDenied, LoadProblem } from '@/components/admin/problems';
import { adminLoad, enc, viewerHasRole } from '@/server/actions/admin/core';

export const metadata: Metadata = { title: 'Page' };

export default async function EditStaticPage({ params }: PageProps<'/admin/pages/[id]'>) {
  if (!(await viewerHasRole('EDITOR'))) return <AccessDenied />;
  const { id } = await params;
  const [page, check] = await Promise.all([
    adminLoad(adminStaticPageSchema, `/admin/pages/${enc(id)}`),
    adminLoad(publishCheckSchema, `/admin/pages/${enc(id)}/publish-check`),
  ]);
  if (!page.ok) return <LoadProblem failure={page} />;
  return (
    <>
      <PageHeader
        title={page.data.title || 'Page sans titre'}
        back={{ href: '/admin/pages', label: 'Pages' }}
        badges={
          <>
            <StateBadge state={page.data.state} />
            <span className="meta">Version {page.data.version}</span>
          </>
        }
      />
      <div className={EDITOR_GRID}>
        <PageEditor
          key={page.data.updatedAt}
          page={page.data}
          check={check.ok ? check.data : null}
        />
      </div>
    </>
  );
}
