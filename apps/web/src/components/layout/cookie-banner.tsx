'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState, useTransition } from 'react';
import type { ConsentCategories } from '@ecine/contracts';
import { Button } from '@/components/ui/button';
import { LIST_ROW, ListRowContent } from '@/components/ui/list-row';
import { Sheet } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { routes } from '@/lib/routes';
import { saveConsentAction } from '@/server/actions/forms';

const REOPEN_EVENT = 'ecine:cookie-preferences';

/**
 * Bannière cookies (docs/07 §C4) : tout est refusé par défaut, le refus est aussi simple que
 * l'acceptation (deux boutons de même poids), les choix restent modifiables à tout moment.
 */
export function CookieBanner({ initial }: { initial: ConsentCategories | null }) {
  const t = useTranslations('cookies');
  const [visible, setVisible] = useState(initial === null);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(initial?.analytics ?? false);
  const [personalization, setPersonalization] = useState(initial?.personalization ?? false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const reopen = () => setCustomizing(true);
    window.addEventListener(REOPEN_EVENT, reopen);
    return () => window.removeEventListener(REOPEN_EVENT, reopen);
  }, []);

  const save = (choice: ConsentCategories) =>
    startTransition(async () => {
      await saveConsentAction(choice);
      setVisible(false);
      setCustomizing(false);
    });

  return (
    <>
      {visible ? (
        <section
          aria-label={t('title')}
          className="fixed inset-x-3 bottom-[calc(var(--tabbar-offset)+var(--tabbar-h)+8px)] z-40 mx-auto max-w-4xl rounded-xl border border-border bg-surface-1 shadow-[var(--shadow-menu)] lg:bottom-6"
        >
          <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between lg:p-5">
            <p className="max-w-xl text-[15px] leading-5">
              {t('body')}{' '}
              <Link href={routes.cookies('fr')} className="underline">
                {t('policy')}
              </Link>
            </p>
            <div className="flex flex-wrap items-center gap-3 lg:shrink-0 lg:flex-nowrap">
              <Button
                variant="secondary"
                pending={pending}
                onClick={() =>
                  save({ necessary: true, analytics: false, ads: false, personalization: false })
                }
              >
                {t('refuseAll')}
              </Button>
              <Button
                variant="secondary"
                pending={pending}
                onClick={() =>
                  save({ necessary: true, analytics: true, ads: false, personalization: true })
                }
              >
                {t('acceptAll')}
              </Button>
              <button
                type="button"
                className="min-h-11 px-2 text-sm underline"
                onClick={() => setCustomizing(true)}
              >
                {t('customize')}
              </button>
            </div>
          </div>
        </section>
      ) : null}
      <Sheet
        open={customizing}
        onOpenChange={setCustomizing}
        title={t('title')}
        description={t('body')}
      >
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            save({ necessary: true, analytics, ads: false, personalization });
          }}
        >
          <ConsentRow label={t('necessary')} help={t('necessaryHelp')} checked disabled />
          <ConsentRow
            label={t('analytics')}
            help={t('analyticsHelp')}
            checked={analytics}
            onChange={setAnalytics}
          />
          <ConsentRow
            label={t('personalization')}
            help={t('personalizationHelp')}
            checked={personalization}
            onChange={setPersonalization}
          />
          <ConsentRow label={t('ads')} help={t('adsHelp')} checked={false} disabled />
          <Button type="submit" variant="primary" pending={pending}>
            {t('save')}
          </Button>
        </form>
      </Sheet>
    </>
  );
}

function ConsentRow({
  label,
  help,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  help: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <div className="border-b border-border pb-3">
      <Switch
        label={label}
        description={help}
        checked={checked}
        locked={disabled}
        onChange={disabled ? undefined : onChange}
      />
    </div>
  );
}

/** Lien permanent du pied de page pour modifier ses choix. */
export function CookiePreferencesLink() {
  const t = useTranslations('cookies');
  return (
    <button
      type="button"
      className="text-sm text-muted hover:text-text hover:underline underline-offset-4"
      onClick={() => window.dispatchEvent(new Event(REOPEN_EVENT))}
    >
      {t('manage')}
    </button>
  );
}

/** Ligne « Gérer les cookies » de Moi : rouvre le panneau de choix. */
export function CookiePreferencesRow() {
  const t = useTranslations('cookies');
  return (
    <li>
      <button
        type="button"
        className={LIST_ROW}
        onClick={() => window.dispatchEvent(new Event(REOPEN_EVENT))}
      >
        <ListRowContent icon="shield" label={t('manage')} />
      </button>
    </li>
  );
}
