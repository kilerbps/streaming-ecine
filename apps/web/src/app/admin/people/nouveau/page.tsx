import type { Metadata } from 'next';
import { EDITOR_GRID } from '@/components/admin/editor-kit';
import { PageHeader } from '@/components/admin/page-header';
import { PersonEditor } from '@/components/admin/person-editor';
import { AccessDenied } from '@/components/admin/problems';
import { viewerHasRole } from '@/server/actions/admin/core';

export const metadata: Metadata = { title: 'Nouvelle personne' };

export default async function NewPersonPage() {
  if (!(await viewerHasRole('EDITOR'))) return <AccessDenied />;
  return (
    <>
      <PageHeader
        title="Nouvelle personne"
        back={{ href: '/admin/people', label: 'Personnes' }}
        description="La fiche est créée en brouillon."
      />
      <div className={EDITOR_GRID}>
        <PersonEditor person={null} check={null} />
      </div>
    </>
  );
}
