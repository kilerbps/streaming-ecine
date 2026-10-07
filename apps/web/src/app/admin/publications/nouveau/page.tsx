import type { Metadata } from 'next';
import { EDITOR_GRID } from '@/components/admin/editor-kit';
import { PageHeader } from '@/components/admin/page-header';
import { PostEditor } from '@/components/admin/post-editor';
import { AccessDenied } from '@/components/admin/problems';
import { viewerHasRole } from '@/server/actions/admin/core';

export const metadata: Metadata = { title: 'Nouvelle publication' };

export default async function NewPostPage() {
  if (!(await viewerHasRole('EDITOR'))) return <AccessDenied />;
  return (
    <>
      <PageHeader
        title="Nouvelle publication"
        back={{ href: '/admin/publications', label: 'Publications' }}
        description="Créée en brouillon."
      />
      <div className={EDITOR_GRID}>
        <PostEditor post={null} check={null} />
      </div>
    </>
  );
}
