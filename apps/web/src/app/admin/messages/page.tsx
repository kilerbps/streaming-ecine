import type { Metadata } from 'next';
import { contactMessageSchema, pageSchema } from '@ecine/contracts';
import { MessagesList } from '@/components/admin/messages-list';
import { PageHeader } from '@/components/admin/page-header';
import { AccessDenied, LoadProblem } from '@/components/admin/problems';
import { adminLoad, viewerHasRole } from '@/server/actions/admin/core';

export const metadata: Metadata = { title: 'Messages' };

export default async function AdminMessagesPage() {
  if (!(await viewerHasRole('EDITOR'))) return <AccessDenied />;
  const page = await adminLoad(pageSchema(contactMessageSchema), '/admin/contact-messages', {
    limit: 25,
  });
  return (
    <>
      <PageHeader
        title="Messages de contact"
        description="Données personnelles : répondez depuis votre messagerie, ne les recopiez pas ailleurs."
      />
      {page.ok ? <MessagesList initial={page.data} /> : <LoadProblem failure={page} />}
    </>
  );
}
