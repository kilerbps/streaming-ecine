import type { Metadata } from 'next';
import { adminPostSchema, publishCheckSchema } from '@ecine/contracts';
import { StateBadge } from '@/components/admin/badges';
import { EDITOR_GRID } from '@/components/admin/editor-kit';
import { fingerprint, formatShort } from '@/components/admin/format';
import { PageHeader } from '@/components/admin/page-header';
import { PostEditor } from '@/components/admin/post-editor';
import { AccessDenied, LoadProblem } from '@/components/admin/problems';
import { adminLoad, enc, viewerHasRole } from '@/server/actions/admin/core';

export const metadata: Metadata = { title: 'Publication' };

export default async function EditPostPage({ params }: PageProps<'/admin/publications/[id]'>) {
  if (!(await viewerHasRole('EDITOR'))) return <AccessDenied />;
  const { id } = await params;
  const [post, check] = await Promise.all([
    adminLoad(adminPostSchema, `/admin/posts/${enc(id)}`),
    adminLoad(publishCheckSchema, `/admin/posts/${enc(id)}/publish-check`),
  ]);
  if (!post.ok) return <LoadProblem failure={post} />;
  const p = post.data;
  // Clé de remontage : change à chaque enregistrement (le formulaire repart de la version enregistrée).
  const version = fingerprint(p);
  return (
    <>
      <PageHeader
        title="Publication"
        back={{ href: '/admin/publications', label: 'Publications' }}
        badges={
          <>
            <StateBadge state={p.state} deleted={p.deletedAt !== null} />
            <span className="meta">Créée le {formatShort(p.createdAt)}</span>
          </>
        }
      />
      <div className={EDITOR_GRID}>
        <PostEditor key={version} post={p} check={check.ok ? check.data : null} />
      </div>
    </>
  );
}
