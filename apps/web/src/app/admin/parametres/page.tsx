import type { Metadata } from 'next';
import { siteSettingsSchema } from '@ecine/contracts';
import { fingerprint } from '@/components/admin/format';
import { PageHeader } from '@/components/admin/page-header';
import { AccessDenied, LoadProblem } from '@/components/admin/problems';
import { SettingsForm } from '@/components/admin/settings-form';
import { adminLoad, viewerHasRole } from '@/server/actions/admin/core';

export const metadata: Metadata = { title: 'Paramètres' };

export default async function AdminSettingsPage() {
  if (!(await viewerHasRole('ADMIN')))
    return <AccessDenied message="Les paramètres du site sont réservés aux administrateurs." />;
  const settings = await adminLoad(siteSettingsSchema, '/admin/site-settings');
  return (
    <>
      <PageHeader
        title="Paramètres du site"
        description="Coordonnées et réseaux sociaux affichés sur tout le site."
      />
      {settings.ok ? (
        <SettingsForm key={fingerprint(settings.data)} settings={settings.data} />
      ) : (
        <LoadProblem failure={settings} />
      )}
    </>
  );
}
