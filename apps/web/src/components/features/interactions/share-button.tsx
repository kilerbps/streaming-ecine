'use client';

import { useTranslations } from 'next-intl';
import { usePreferences } from '@/components/providers/preferences';
import { useToast } from '@/components/providers/toast';
import { Icon } from '@/components/ui/icon';

/** Partage natif (mobile) ou copie du lien. */
export function ShareButton({ title, path }: { title: string; path: string }) {
  const t = useTranslations('common');
  const toast = useToast();
  const { feedback } = usePreferences();
  const share = async () => {
    feedback('tap');
    const url = new URL(path, window.location.origin).toString();
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Partage annulé : rien à faire.
        return;
      }
    }
    await navigator.clipboard.writeText(url);
    toast(t('copied'), 'success');
  };
  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex min-h-11 items-center gap-2 px-2 hover:bg-surface-2"
      aria-label={t('share')}
    >
      <Icon name="share" />
    </button>
  );
}
