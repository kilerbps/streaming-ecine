import type { Metadata } from 'next';
import { adminTeamMemberSchema } from '@ecine/contracts';
import { z } from 'zod';
import { PageHeader } from '@/components/admin/page-header';
import { AccessDenied, LoadProblem } from '@/components/admin/problems';
import { TeamManager } from '@/components/admin/team-manager';
import { adminLoad, viewerHasRole } from '@/server/actions/admin/core';

export const metadata: Metadata = { title: 'Équipe' };

export default async function AdminTeamPage() {
  if (!(await viewerHasRole('EDITOR'))) return <AccessDenied />;
  const members = await adminLoad(z.array(adminTeamMemberSchema), '/admin/team');
  return (
    <>
      <PageHeader
        title="Équipe dirigeante"
        description="Présentée sur la page « À propos », dans l’ordre ci-dessous. Les modifications sont visibles immédiatement."
      />
      {members.ok ? <TeamManager members={members.data} /> : <LoadProblem failure={members} />}
    </>
  );
}
