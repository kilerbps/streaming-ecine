import type { Metadata } from 'next';
import { adminPersonSchema, publishCheckSchema } from '@ecine/contracts';
import { StateBadge } from '@/components/admin/badges';
import { EDITOR_GRID } from '@/components/admin/editor-kit';
import { PageHeader } from '@/components/admin/page-header';
import { PersonEditor } from '@/components/admin/person-editor';
import { AccessDenied, LoadProblem } from '@/components/admin/problems';
import { adminLoad, enc, viewerHasRole } from '@/server/actions/admin/core';

export const metadata: Metadata = { title: 'Personne' };

export default async function EditPersonPage({ params }: PageProps<'/admin/people/[id]'>) {
  if (!(await viewerHasRole('EDITOR'))) return <AccessDenied />;
  const { id } = await params;
  const [person, check] = await Promise.all([
    adminLoad(adminPersonSchema, `/admin/people/${enc(id)}`),
    adminLoad(publishCheckSchema, `/admin/people/${enc(id)}/publish-check`),
  ]);
  if (!person.ok) return <LoadProblem failure={person} />;
  return (
    <>
      <PageHeader
        title={person.data.name || 'Personne sans nom'}
        back={{ href: '/admin/people', label: 'Personnes' }}
        badges={<StateBadge state={person.data.state} deleted={person.data.deletedAt !== null} />}
      />
      <div className={EDITOR_GRID}>
        <PersonEditor
          key={person.data.updatedAt}
          person={person.data}
          check={check.ok ? check.data : null}
        />
      </div>
    </>
  );
}
