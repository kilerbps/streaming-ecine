'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useSyncExternalStore } from 'react';
import type { Locale } from '@ecine/contracts';
import { buttonClasses } from '@/components/ui/button-styles';
import { Icon } from '@/components/ui/icon';
import {
  clearRecentSearches,
  getRecentSearches,
  getServerRecentSearches,
  subscribeRecentSearches,
} from '@/lib/recent-searches';
import { routes } from '@/lib/routes';

/** Recherches récentes de cet appareil (5 au plus) ; rien n'est affiché tant qu'il n'y en a pas. */
export function RecentSearches({ locale }: { locale: Locale }) {
  const t = useTranslations('search');
  const tc = useTranslations('common');
  const items = useSyncExternalStore(
    subscribeRecentSearches,
    getRecentSearches,
    getServerRecentSearches,
  );
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="recherches-recentes" className="mt-6">
      <div className="flex items-center justify-between gap-4">
        <h2
          id="recherches-recentes"
          className="text-xl leading-[25px] lg:text-2xl lg:leading-[30px]"
        >
          {t('recent')}
        </h2>
        <button
          type="button"
          onClick={clearRecentSearches}
          className={buttonClasses('ghost', 'sm', '-mr-3 text-muted')}
        >
          {tc('clear')}
        </button>
      </div>
      <ul className="mt-1">
        {items.map((q) => (
          <li key={q}>
            <Link
              href={routes.search(locale, q)}
              className="press flex min-h-11 items-center gap-3 text-[15px] text-text"
            >
              <Icon name="clock" size={20} className="shrink-0 text-subtle" />
              <span className="truncate">{q}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
