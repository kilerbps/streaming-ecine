'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Motif } from '@/components/ui/motif';

/** Erreur inattendue : message utile, sans trace technique ; un seul CTA « Réessayer ». */
export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations('errors');
  const tc = useTranslations('common');
  return (
    <div className="container-page grid gap-10 py-12 md:grid-cols-[1fr_1.4fr] md:items-center md:py-24">
      <div className="aspect-square w-full max-w-xs">
        <Motif name="damier" tone="border" />
      </div>
      <div role="alert">
        <h1 className="font-serif text-4xl md:text-5xl">{t('serverTitle')}</h1>
        <p className="mt-4 max-w-lg text-lg text-muted">{t('serverBody')}</p>
        <Button variant="primary" size="lg" className="mt-8" onClick={() => retry()}>
          {tc('retry')}
        </Button>
      </div>
    </div>
  );
}
