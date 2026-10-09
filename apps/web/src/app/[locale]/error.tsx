'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { SystemMessage } from '@/components/ui/system-message';

/** Erreur inattendue : message utile, sans trace technique ; un seul bouton « Réessayer ». */
export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations('errors');
  const tc = useTranslations('common');
  return (
    <SystemMessage
      illustration="missing"
      title={t('serverTitle')}
      role="alert"
      actions={
        <Button
          variant="primary"
          size="lg"
          icon="refresh"
          className="self-start"
          onClick={() => retry()}
        >
          {tc('retry')}
        </Button>
      }
    >
      {t('serverBody')}
    </SystemMessage>
  );
}
