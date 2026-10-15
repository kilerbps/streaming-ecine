'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useToast } from '@/components/providers/toast';
import { Switch } from '@/components/ui/switch';
import { disablePush, enablePush, pushEnabled, pushSupported } from '@/lib/push';
import { Group } from './preferences-panel';

const noSubscribe = () => () => {};
/** Support et permission lus sans écart d'hydratation (`loading` au rendu serveur). */
const supportSnapshot = () =>
  !pushSupported() ? 'unsupported' : Notification.permission === 'denied' ? 'denied' : 'ok';
const serverSupport = () => 'loading';

/** Réglages → Notifications : rappels de sortie sur cet appareil (membre connecté, ADR-0014). */
export function NotificationSettings({ member }: { member: boolean }) {
  const t = useTranslations('prefs');
  const tw = useTranslations('whatsNew');
  const toast = useToast();
  const support = useSyncExternalStore(noSubscribe, supportSnapshot, serverSupport);
  // Abonnement de cet appareil (`null` tant qu'il n'est pas lu) ; refus donné pendant la visite.
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [deniedNow, setDeniedNow] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (support !== 'ok') return;
    let live = true;
    void pushEnabled().then((on) => {
      if (live) setSubscribed(on);
    });
    return () => {
      live = false;
    };
  }, [support]);

  const state =
    support === 'unsupported'
      ? 'unsupported'
      : support === 'denied' || deniedNow
        ? 'denied'
        : support === 'loading' || subscribed === null
          ? 'loading'
          : subscribed
            ? 'on'
            : 'off';

  return (
    <Group title={t('notifications')}>
      <div className="py-2">
        {!member ? (
          <p className="py-2 text-[15px] leading-5 text-muted">{t('pushMember')}</p>
        ) : state === 'unsupported' ? (
          <p className="py-2 text-[15px] leading-5 text-muted">{t('pushUnsupported')}</p>
        ) : (
          <Switch
            label={t('pushLabel')}
            description={state === 'denied' ? t('pushDeniedHelp') : t('pushHelp')}
            checked={state === 'on'}
            locked={pending || state === 'loading' || state === 'denied'}
            onChange={(on) =>
              void (async () => {
                setPending(true);
                if (on) {
                  const result = await enablePush();
                  setSubscribed(result === 'enabled');
                  if (result === 'denied') setDeniedNow(true);
                  if (result === 'enabled') toast(tw('pushOn'), 'success');
                } else {
                  await disablePush();
                  setSubscribed(false);
                }
                setPending(false);
              })()
            }
          />
        )}
      </div>
    </Group>
  );
}
