import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ReloadButton } from '@/components/features/system/reload-button';
import { SystemMessage } from '@/components/ui/system-message';

export const metadata: Metadata = { title: 'Hors ligne', robots: { index: false } };

/** Page servie par le service worker quand le réseau manque (PWA) : Réessayer recharge la page demandée. */
export default async function OfflinePage() {
  const [t, tc] = await Promise.all([getTranslations('errors'), getTranslations('common')]);
  return (
    <SystemMessage
      illustration="no-lens"
      title={t('offlineTitle')}
      actions={
        <div className="self-start">
          <ReloadButton label={tc('retry')} />
        </div>
      }
    >
      {t('offlineBody')}
    </SystemMessage>
  );
}
