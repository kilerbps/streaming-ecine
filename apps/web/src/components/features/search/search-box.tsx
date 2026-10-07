'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import type { Locale, SearchResults } from '@ecine/contracts';
import { usePreferences } from '@/components/providers/preferences';
import { Icon } from '@/components/ui/icon';
import { routes } from '@/lib/routes';
import { suggestAction } from '@/server/actions/interactions';

const DEBOUNCE_MS = 180;

/**
 * Barre de recherche : formulaire GET classique (fonctionne sans JavaScript) enrichi de suggestions
 * servies par Server Action (aucun fetch côté client), groupées par type.
 */
export function SearchBox({
  locale,
  initialQuery = '',
  autoFocus = false,
}: {
  locale: Locale;
  initialQuery?: string;
  autoFocus?: boolean;
}) {
  const t = useTranslations('search');
  const router = useRouter();
  const { feedback } = usePreferences();
  const listId = useId();
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [, startTransition] = useTransition();
  const latest = useRef('');

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2 || query === initialQuery) return;
    const timer = window.setTimeout(() => {
      latest.current = query;
      startTransition(async () => {
        const res = await suggestAction(query);
        if (res.ok && latest.current === query) setResults(res.data);
      });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [q, initialQuery]);

  const query = q.trim().replace(/\s+/g, ' ');
  const current = results && results.q === query && query !== initialQuery ? results : null;
  const suggestions = current
    ? [
        ...current.films.map((f) => ({
          key: `f-${f.id}`,
          label: f.title,
          hint: t('films'),
          href: routes.film(locale, f.slug),
        })),
        ...current.people.map((p) => ({
          key: `p-${p.id}`,
          label: p.name,
          hint: t('people'),
          href: routes.person(locale, p.slug),
        })),
        ...current.categories.map((c) => ({
          key: `c-${c.slug}`,
          label: c.name,
          hint: t('categories'),
          href: routes.category(locale, c.slug),
        })),
      ].slice(0, 8)
    : [];

  return (
    <div className="relative">
      <form
        role="search"
        action={routes.search(locale)}
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim().length < 2) return;
          feedback('tap');
          setResults(null);
          router.push(routes.search(locale, q.trim()));
        }}
        className="flex border border-border-strong bg-surface-1 focus-within:border-text"
      >
        <label htmlFor={`${listId}-input`} className="sr-only">
          {t('label')}
        </label>
        <input
          id={`${listId}-input`}
          name="q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('placeholder')}
          autoComplete="off"
          autoFocus={autoFocus}
          enterKeyHint="search"
          aria-controls={suggestions.length > 0 ? listId : undefined}
          aria-expanded={suggestions.length > 0}
          role="combobox"
          aria-autocomplete="list"
          className="min-h-12 flex-1 bg-transparent px-4 text-lg placeholder:text-muted focus:outline-none"
        />
        <button
          type="submit"
          className="grid w-14 place-items-center hover:bg-surface-2"
          aria-label={t('submit')}
        >
          <Icon name="search" />
        </button>
      </form>
      {suggestions.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 border border-t-0 border-border-strong bg-surface-1"
        >
          {suggestions.map((s) => (
            <li key={s.key} role="option" aria-selected={false}>
              <Link
                href={s.href}
                onClick={() => setResults(null)}
                className="flex min-h-12 items-center justify-between gap-4 px-4 hover:bg-surface-2 focus-visible:bg-surface-2"
              >
                <span>{s.label}</span>
                <span className="meta">{s.hint}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
