import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LinkButton } from '@/components/ui/link-button';
import { Motif } from '@/components/ui/motif';
import { routes } from '@/lib/routes';

export const metadata: Metadata = { title: 'Hors ligne', robots: { index: false } };

/** Page servie par le service worker quand le réseau manque (PWA). */
export default async function OfflinePage() {
  const [t, tc] = await Promise.all([getTranslations('errors'), getTranslations('common')]);
  return (
    <div className="container-page grid gap-10 py-12 md:grid-cols-[1fr_1.4fr] md:items-center md:py-24">
      <div className="aspect-square w-full max-w-xs">
        <Motif name="chevrons" tone="border" />
      </div>
      <div>
        <h1 className="font-serif text-4xl md:text-5xl">{t('offlineTitle')}</h1>
        <p className="mt-4 max-w-lg text-lg text-muted">{t('offlineBody')}</p>
        <LinkButton href={routes.home('fr')} variant="primary" size="lg" className="mt-8">
          {tc('retry')}
        </LinkButton>
      </div>
    </div>
  );
}
