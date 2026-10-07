'use client';

import { useTranslations } from 'next-intl';
import { usePreferences } from '@/components/providers/preferences';
import { Icon } from '@/components/ui/icon';

const ICON_BUTTON = 'grid size-11 place-items-center text-text hover:bg-surface-2';

/** Bascule sombre/clair : appliquée immédiatement, mémorisée en cookie (lu par le serveur). */
export function ThemeToggle() {
  const t = useTranslations('prefs');
  const { theme, setTheme } = usePreferences();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      className={ICON_BUTTON}
      onClick={() => setTheme(next)}
      aria-label={next === 'light' ? t('switchToLight') : t('switchToDark')}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  );
}

/** Réglage « Sons » toujours visible (docs/05 §8). */
export function SoundToggle() {
  const t = useTranslations('prefs');
  const { sound, setSound } = usePreferences();
  return (
    <button
      type="button"
      className={ICON_BUTTON}
      onClick={() => setSound(!sound)}
      aria-pressed={sound}
      aria-label={sound ? t('soundOff') : t('soundOn')}
    >
      <Icon name={sound ? 'volume' : 'volumeOff'} />
    </button>
  );
}
