import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { meSchema } from '@ecine/contracts';
import { AccountSettings } from '@/components/features/account/account-settings';
import { NotificationSettings } from '@/components/features/account/notification-settings';
import { PlaybackSettings } from '@/components/features/account/playback-settings';
import { PreferencesPanel } from '@/components/features/account/preferences-panel';
import { TastesPicker } from '@/components/features/account/tastes-picker';
import { LargeTitle } from '@/components/layout/header-title';
import { privateRequest } from '@/server/api-client';
import { getCategories, getTastes, getViewer } from '@/server/data';

export const metadata: Metadata = { title: 'Réglages' };

/**
 * Réglages (docs/design/04, Moi → Réglages), accessibles sans compte : Affichage, Sons et
 * vibrations, Données, Lecture, Notifications, Goûts ; puis le compte d'un membre (profil, mot de
 * passe, double authentification, données, suppression).
 */
export default async function SettingsPage() {
  const [t, tp, viewer, categories, tastes] = await Promise.all([
    getTranslations('me'),
    getTranslations('prefs'),
    getViewer(),
    getCategories().catch(() => []),
    getTastes().catch(() => null),
  ]);
  const me = viewer ? await privateRequest(meSchema, '/me') : null;
  return (
    <>
      <LargeTitle>{t('settings')}</LargeTitle>
      <div className="mt-8 flex max-w-xl flex-col">
        <PreferencesPanel />
        <PlaybackSettings />
        <NotificationSettings member={Boolean(viewer)} />
        <section className="mt-8">
          <h2 className="text-[17px] font-semibold leading-[22px]">{tp('tastes')}</h2>
          <p className="mt-1 text-[13px] leading-[18px] text-muted">{tp('tastesHelp')}</p>
          <div className="mt-3 rounded-xl bg-surface-1 p-4">
            {tastes === null ? (
              <p className="text-[15px] leading-5 text-muted">{tp('tastesConsent')}</p>
            ) : (
              <TastesPicker
                categories={categories}
                initial={tastes}
                submitLabel={tp('tastesSave')}
              />
            )}
          </div>
        </section>
      </div>
      {me ? (
        <div id="compte" className="mt-10 max-w-xl scroll-mt-20">
          <AccountSettings me={me} />
        </div>
      ) : null}
    </>
  );
}
