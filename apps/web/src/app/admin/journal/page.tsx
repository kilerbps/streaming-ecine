import type { Metadata } from 'next';
import { auditEntrySchema, pageSchema } from '@ecine/contracts';
import { AuditList } from '@/components/admin/audit-list';
import { PageHeader } from '@/components/admin/page-header';
import { AccessDenied, LoadProblem } from '@/components/admin/problems';
import { adminLoad, viewerHasRole } from '@/server/actions/admin/core';

export const metadata: Metadata = { title: 'Journal' };

export default async function AdminAuditPage() {
  if (!(await viewerHasRole('ADMIN')))
    return <AccessDenied message="Le journal d’audit est réservé aux administrateurs." />;
  const page = await adminLoad(pageSchema(auditEntrySchema), '/admin/audit-log', { limit: 50 });
  return (
    <>
      <PageHeader
        title="Journal d’audit"
        description="Chaque action d’administration est enregistrée (auteur, action, élément, date). Ce journal ne peut pas être modifié."
      />
      {page.ok ? <AuditList initial={page.data} /> : <LoadProblem failure={page} />}
    </>
  );
}
