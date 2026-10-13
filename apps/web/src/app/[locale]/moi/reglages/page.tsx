import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { meSchema } from '@ecine/contracts';
import { AccountSettings } from '@/components/features/account/account-settings';
import { PreferencesPanel } from '@/components/features/account/preferences-panel';
import { privateRequest } from '@/server/api-client';
import { getViewer } from '@/server/data';
import { LargeTitle } from '@/components/layout/header-title';

export const metadata: Metadata = { title: 'Réglages' };

/** Réglages : préférences (pour tous) puis compte (profil, sécurité, données) pour les membres. */
export default async function SettingsPage() {
  const t = await getTranslations('me');
  const viewer = await getViewer();
  const me = viewer ? await privateRequest(meSchema, '/me') : null;
  return (
    <>
      <LargeTitle>{t('settings')}</LargeTitle>
      <section className="mt-10 max-w-xl">
        <PreferencesPanel />
      </section>
      {me ? (
        <div id="compte" className="mt-10 max-w-xl scroll-mt-20">
          <AccountSettings me={me} />
        </div>
      ) : null}
    </>
  );
}
