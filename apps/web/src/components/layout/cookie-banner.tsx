'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState, useTransition } from 'react';
import type { ConsentCategories } from '@ecine/contracts';
import { Button } from '@/components/ui/button';
import { Motif } from '@/components/ui/motif';
import { Sheet } from '@/components/ui/sheet';
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
          className="fixed inset-x-0 bottom-[calc(var(--tabbar-height)+env(safe-area-inset-bottom))] z-40 border-t border-border bg-surface-1 md:bottom-0 md:left-24 lg:left-60"
        >
          <div className="h-2 w-full">
            <Motif name="damier" tone="highlight" />
          </div>
          <div className="container-page flex flex-col gap-4 py-5 lg:flex-row lg:items-center lg:justify-between">
            <p className="max-w-2xl text-sm">
              {t('body')}{' '}
              <Link href={routes.cookies('fr')} className="underline">
                {t('policy')}
              </Link>
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                pending={pending}
                onClick={() => save({ necessary: true, analytics: false, ads: false })}
              >
                {t('refuseAll')}
              </Button>
              <Button
                variant="secondary"
                pending={pending}
                onClick={() => save({ necessary: true, analytics: true, ads: false })}
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
            save({ necessary: true, analytics, ads: false });
          }}
        >
          <ConsentRow label={t('necessary')} help={t('necessaryHelp')} checked disabled />
          <ConsentRow
            label={t('analytics')}
            help={t('analyticsHelp')}
            checked={analytics}
            onChange={setAnalytics}
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
    <label className="flex items-start justify-between gap-4 border-b border-border pb-4">
      <span>
        <span className="block font-medium">{label}</span>
        <span className="block text-sm text-muted">{help}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        className="mt-1 size-5 accent-[var(--accent)]"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
    </label>
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
