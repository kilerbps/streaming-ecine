'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LIST_ROW, ListRowContent } from '@/components/ui/list-row';
import { Icon, type IconName } from '@/components/ui/icon';
import { Logo } from '@/components/ui/logo';
import { Sheet } from '@/components/ui/sheet';
import {
  countVisit,
  FILM_COMPLETE_EVENT,
  markOffered,
  offeredRecently,
  promptInstall,
  useInstallState,
} from '@/lib/install';

/** Délai avant l'invite de 2e visite : la page d'abord, l'invite ensuite. */
const OFFER_DELAY_MS = 2000;

const IOS_STEPS: Array<{ icon: IconName; key: 'iosStep1' | 'iosStep2' | 'iosStep3' }> = [
  { icon: 'share', key: 'iosStep1' },
  { icon: 'plus', key: 'iosStep2' },
  { icon: 'check', key: 'iosStep3' },
];

/** Feuille en trois étapes pour Safari sur iPhone, qui n'a pas d'invite d'installation. */
export function IosInstallSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('pwa');
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t('iosTitle')}>
      <ol className="flex flex-col gap-4">
        {IOS_STEPS.map((step, index) => (
          <li key={step.key} className="flex items-center gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 text-accent-text">
              <Icon name={step.icon} />
            </span>
            <p className="text-[15px] leading-5">
              <span className="sr-only">{index + 1}. </span>
              {t(step.key)}
            </p>
          </li>
        ))}
      </ol>
    </Sheet>
  );
}

/** Lance l'installation : invite native (Android, Chromium) ou feuille d'instructions (iPhone). */
function useInstallAction() {
  const install = useInstallState();
  const [iosOpen, setIosOpen] = useState(false);
  const start = async () => {
    if (install.canPrompt) return promptInstall();
    if (install.ios) setIosOpen(true);
    return false;
  };
  return { install, start, iosOpen, setIosOpen };
}

/**
 * Carte discrète au-dessus de la barre d'onglets, proposée à la 2e visite ou juste après un film
 * terminé, une fois par période de 30 jours au plus ; « Plus tard » a le même poids qu'« Installer ».
 */
export function InstallPrompt() {
  const t = useTranslations('pwa');
  const { install, start, iosOpen, setIosOpen } = useInstallAction();
  const [visible, setVisible] = useState(false);
  const available = !install.installed && (install.canPrompt || install.ios);

  useEffect(() => {
    if (!available) return;
    const offer = () => {
      if (offeredRecently()) return;
      markOffered();
      setVisible(true);
    };
    const timer = countVisit() >= 2 ? window.setTimeout(offer, OFFER_DELAY_MS) : undefined;
    window.addEventListener(FILM_COMPLETE_EVENT, offer);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(FILM_COMPLETE_EVENT, offer);
    };
  }, [available]);

  return (
    <>
      {visible && available ? (
        <section
          aria-label={t('installTitle')}
          className="fixed inset-x-3 bottom-[calc(var(--tabbar-offset)+var(--tabbar-h)+8px)] z-40 mx-auto flex max-w-md flex-col gap-3 rounded-xl bg-surface-3 p-4 shadow-[var(--shadow-menu)] animate-[ecine-toast-in_var(--dur-base)_var(--ease-standard)] lg:bottom-6 lg:left-auto lg:right-6"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-md bg-accent">
              <Logo withBadge={false} className="h-5 w-auto [--brand-blue:var(--on-accent)]" />
            </span>
            <p className="text-[15px] leading-5">
              <span className="font-semibold">{t('installTitle')}</span> {t('installBody')}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="md" onClick={() => setVisible(false)}>
              {t('later')}
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon="download"
              onClick={() => {
                setVisible(false);
                void start();
              }}
            >
              {t('install')}
            </Button>
          </div>
        </section>
      ) : null}
      <IosInstallSheet open={iosOpen} onOpenChange={setIosOpen} />
    </>
  );
}

/** Ligne « Installer l'application » de l'espace Moi, tant que l'app n'est pas installée. */
/** Ligne « Installer l'application » de Moi, tant qu'elle n'est pas installée. */
export function InstallAppRow() {
  const t = useTranslations('pwa');
  const { install, start, iosOpen, setIosOpen } = useInstallAction();
  if (install.installed || !(install.canPrompt || install.ios)) return null;
  return (
    <li>
      <button type="button" className={LIST_ROW} onClick={() => void start()}>
        <ListRowContent icon="download" label={t('installApp')} />
      </button>
      <IosInstallSheet open={iosOpen} onOpenChange={setIosOpen} />
    </li>
  );
}

export function InstallAppButton() {
  const t = useTranslations('pwa');
  const { install, start, iosOpen, setIosOpen } = useInstallAction();
  if (install.installed || !(install.canPrompt || install.ios)) return null;
  return (
    <>
      <Button variant="secondary" icon="download" onClick={() => void start()}>
        {t('installApp')}
      </Button>
      <IosInstallSheet open={iosOpen} onOpenChange={setIosOpen} />
    </>
  );
}
