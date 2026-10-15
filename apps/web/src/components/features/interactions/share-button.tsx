'use client';

import { useTranslations } from 'next-intl';
import { usePreferences } from '@/components/providers/preferences';
import { useToast } from '@/components/providers/toast';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';

/** Partage natif (mobile) ou copie du lien. `action` : bouton rond à libellé visible. */
export function ShareButton({
  title,
  path,
  variant = 'inline',
}: {
  title: string;
  path: string;
  /** `action` : rond à libellé visible ; `icon` : rond sur surface, libellé pour les lecteurs d'écran. */
  variant?: 'inline' | 'action' | 'icon';
}) {
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
  if (variant === 'icon') {
    return <IconButton icon="share" label={t('share')} tone="surface" onClick={share} />;
  }
  if (variant === 'action') {
    return <IconButton icon="share" label={t('share')} showLabel tone="surface" onClick={share} />;
  }
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
