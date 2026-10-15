'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useAuth } from '@/components/providers/auth';
import { usePreferences } from '@/components/providers/preferences';
import { useToast } from '@/components/providers/toast';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { track } from '@/lib/analytics';
import { enablePush, pushSupported } from '@/lib/push';
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
 * optimiste avec retour en arrière. Premier rappel : feuille courte qui explique le rappel puis,
 * si l'appareil le permet, propose les notifications (permission demandée au toucher, ADR-0014) ;
 * un refus garde le rappel par e-mail.
 */
export function ReminderButton({ filmId, initial }: { filmId: string; initial: boolean }) {
  const t = useTranslations('whatsNew');
  const { requireAuth, sessionExpired } = useAuth();
  const { feedback } = usePreferences();
  const toast = useToast();
  const [on, setOn] = useState(initial);
  const [server, setServer] = useState(initial);
  const [intro, setIntro] = useState(false);
  /** La feuille propose les notifications seulement si l'appareil peut encore les accepter. */
  const [canAskPush, setCanAskPush] = useState(false);
  const [asking, setAsking] = useState(false);
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
      // Permission déjà donnée sur cet appareil : abonnement discret (nouvel appareil du membre).
      if (pushSupported() && Notification.permission === 'granted') void enablePush();
      if (introSeen()) toast(t('reminderOnToast'), 'success');
      else {
        markIntroSeen();
        setCanAskPush(pushSupported() && Notification.permission === 'default');
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
          <p className="text-[15px] leading-[22px]">
            {canAskPush ? t('introBodyPush') : t('introBody')}
          </p>
          <div className="flex flex-wrap gap-3">
            {canAskPush ? (
              <Button
                variant="primary"
                icon="bell"
                pending={asking}
                onClick={async () => {
                  setAsking(true);
                  const result = await enablePush();
                  setAsking(false);
                  setIntro(false);
                  if (result === 'enabled') toast(t('pushOn'), 'success');
                  else if (result === 'denied') toast(t('pushDenied'), 'info');
                }}
              >
                {t('pushEnable')}
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => setIntro(false)}>
              {canAskPush ? t('pushLater') : t('introOk')}
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
