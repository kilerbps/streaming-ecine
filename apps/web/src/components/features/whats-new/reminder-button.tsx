'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useAuth } from '@/components/providers/auth';
import { usePreferences } from '@/components/providers/preferences';
import { useToast } from '@/components/providers/toast';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { track } from '@/lib/analytics';
import { setReminderAction } from '@/server/actions/interactions';

/** Explication montrée une seule fois par appareil, au premier rappel activé. */
const INTRO_KEY = 'ecine:reminder-intro';

function introSeen(): boolean {
  try {
    return window.localStorage.getItem(INTRO_KEY) === '1';
  } catch {
    return false;
  }
}

function markIntroSeen(): void {
  try {
    window.localStorage.setItem(INTRO_KEY, '1');
  } catch {
    // Stockage indisponible : l'explication reviendra, sans autre conséquence.
  }
}

/**
 * « Me le rappeler » (secondaire) → « Rappel activé ». Connexion demandée (raison `reminder`) ;
 * optimiste avec retour en arrière. Premier rappel : feuille courte qui explique le rappel. Les
 * notifications du téléphone viendront avec la décision sur les notifications (ADR-0012, point 3).
 */
export function ReminderButton({ filmId, initial }: { filmId: string; initial: boolean }) {
  const t = useTranslations('whatsNew');
  const { requireAuth, sessionExpired } = useAuth();
  const { feedback } = usePreferences();
  const toast = useToast();
  const [on, setOn] = useState(initial);
  const [server, setServer] = useState(initial);
  const [intro, setIntro] = useState(false);
  if (server !== initial) {
    setServer(initial);
    setOn(initial);
  }

  const toggle = async (next: boolean) => {
    setOn(next);
    const result = await setReminderAction(filmId, next);
    if (result.ok) {
      feedback('success');
      if (!next) {
        toast(t('reminderOff'), 'success');
        return;
      }
      track({ type: 'reminder_set', targetType: 'FILM', targetId: filmId });
      if (introSeen()) toast(t('reminderOnToast'), 'success');
      else {
        markIntroSeen();
        setIntro(true);
      }
      return;
    }
    setOn(!next);
    if (result.code === 'auth') sessionExpired(() => toggle(next));
    else {
      feedback('error');
      toast(result.error, 'error');
    }
  };

  return (
    <>
      <Button
        variant="secondary"
        icon={on ? 'check' : 'bell'}
        aria-pressed={on}
        onClick={() => requireAuth(() => toggle(!on), 'reminder')}
      >
        {on ? t('reminderOn') : t('remindMe')}
      </Button>
      <Sheet open={intro} onOpenChange={setIntro} title={t('introTitle')}>
        <div className="flex flex-col gap-5">
          <p className="text-[15px] leading-[22px]">{t('introBody')}</p>
          <Button variant="secondary" className="self-start" onClick={() => setIntro(false)}>
            {t('introOk')}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
