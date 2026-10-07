'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useAuth } from '@/components/providers/auth';
import { usePreferences } from '@/components/providers/preferences';
import { useToast } from '@/components/providers/toast';
import { Icon } from '@/components/ui/icon';
import { setBookmarkAction } from '@/server/actions/interactions';

/** « Ma liste » (effet de dotation) : optimiste, avec retour en arrière en cas d'échec. */
export function BookmarkButton({
  filmId,
  initial,
  withLabel = false,
}: {
  filmId: string;
  initial: boolean;
  withLabel?: boolean;
}) {
  const t = useTranslations('actions');
  const { requireAuth, sessionExpired } = useAuth();
  const { feedback } = usePreferences();
  const toast = useToast();
  const [saved, setSaved] = useState(initial);
  const [server, setServer] = useState(initial);
  if (server !== initial) {
    setServer(initial);
    setSaved(initial);
  }

  const toggle = async (next: boolean) => {
    setSaved(next);
    if (next) feedback('bookmark');
    const result = await setBookmarkAction(filmId, next);
    if (result.ok) {
      toast(next ? t('inList') : t('unbookmark'), 'success');
      return;
    }
    setSaved(!next);
    if (result.code === 'auth') sessionExpired(() => toggle(next));
    else {
      feedback('error');
      toast(result.error, 'error');
    }
  };

  const label = saved ? t('unbookmark') : t('bookmark');
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={withLabel ? undefined : label}
      onClick={() => requireAuth(() => toggle(!saved))}
      className={`inline-flex min-h-11 items-center gap-2 px-2 hover:bg-surface-2 ${saved ? 'text-accent' : 'text-text'}`}
    >
      <Icon name="bookmark" filled={saved} />
      {withLabel ? <span className="text-sm">{saved ? t('inList') : t('bookmark')}</span> : null}
    </button>
  );
}
