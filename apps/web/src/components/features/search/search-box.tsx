'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import type { Image as ImageData, Locale, SearchResults } from '@ecine/contracts';
import { usePreferences } from '@/components/providers/preferences';
import { Icon } from '@/components/ui/icon';
import { MediaImage } from '@/components/ui/media-image';
import { SearchField } from '@/components/ui/search-field';
import { rememberSearch } from '@/lib/recent-searches';
import { routes } from '@/lib/routes';
import { suggestAction } from '@/server/actions/interactions';

const DEBOUNCE_MS = 180;

interface Suggestion {
  key: string;
  kind: 'film' | 'person' | 'category';
  label: string;
  hint: string;
  href: string;
  image: ImageData | null;
}

/**
 * Barre de recherche : formulaire GET classique (fonctionne sans JavaScript) enrichi de suggestions
 * servies par Server Action (aucun fetch côté client), 8 au plus, avec vignette ; flèches, Entrée et
 * Échap au clavier (motif combobox).
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
  const tc = useTranslations('common');
  const router = useRouter();
  const { feedback } = usePreferences();
  const listId = useId();
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [, startTransition] = useTransition();
  const latest = useRef('');

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2 || query === initialQuery) return;
    const timer = window.setTimeout(() => {
      latest.current = query;
      startTransition(async () => {
        const res = await suggestAction(query);
        if (res.ok && latest.current === query) {
          setResults(res.data);
          setActive(-1);
        }
      });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [q, initialQuery]);

  const query = q.trim().replace(/\s+/g, ' ');
  const current = results && results.q === query && query !== initialQuery ? results : null;
  const suggestions: Suggestion[] =
    current && open
      ? [
          ...current.films.map((f) => ({
            key: `f-${f.id}`,
            kind: 'film' as const,
            label: f.title,
            hint: f.year ? `${t('film')} · ${f.year}` : t('film'),
            href: routes.film(locale, f.slug),
            image: f.poster,
          })),
          ...current.people.map((p) => ({
            key: `p-${p.id}`,
            kind: 'person' as const,
            label: p.name,
            hint: t('person'),
            href: routes.person(locale, p.slug),
            image: p.photo,
          })),
          ...current.categories.map((c) => ({
            key: `c-${c.slug}`,
            kind: 'category' as const,
            label: c.name,
            hint: t('category'),
            href: routes.category(locale, c.slug),
            image: null,
          })),
        ].slice(0, 8)
      : [];
  const optionId = (index: number) => `${listId}-option-${index}`;

  const go = (s: Suggestion) => {
    feedback('tap');
    rememberSearch(s.label);
    setOpen(false);
    router.push(s.href);
  };

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <form
        role="search"
        action={routes.search(locale)}
        onSubmit={(event) => {
          event.preventDefault();
          if (query.length < 2) return;
          feedback('tap');
          rememberSearch(query);
          setOpen(false);
          router.push(routes.search(locale, query));
        }}
      >
        <SearchField
          name="q"
          label={t('label')}
          clearLabel={tc('clear')}
          placeholder={t('placeholder')}
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            setOpen(true);
          }}
          onClear={() => {
            setQ('');
            setResults(null);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (suggestions.length === 0) return;
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActive((i) => (i + 1) % suggestions.length);
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
            } else if (event.key === 'Enter' && active >= 0 && suggestions[active]) {
              event.preventDefault();
              go(suggestions[active]);
            } else if (event.key === 'Escape') {
              setOpen(false);
            }
          }}
          autoComplete="off"
          autoFocus={autoFocus}
          enterKeyHint="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={suggestions.length > 0}
          aria-controls={suggestions.length > 0 ? listId : undefined}
          aria-activedescendant={active >= 0 ? optionId(active) : undefined}
        />
      </form>
      {suggestions.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={t('suggestions')}
          className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-md border border-border bg-surface-3 p-1 shadow-[var(--shadow-menu)]"
        >
          {suggestions.map((s, index) => (
            <li key={s.key} id={optionId(index)} role="option" aria-selected={index === active}>
              <Link
                href={s.href}
                tabIndex={-1}
                onClick={(event) => {
                  event.preventDefault();
                  go(s);
                }}
                onMouseEnter={() => setActive(index)}
                className={`flex min-h-14 items-center gap-3 rounded-sm px-2 py-1.5 ${index === active ? 'bg-surface-2' : ''}`}
              >
                {s.kind === 'film' ? (
                  <span className="flex w-10 shrink-0 justify-center">
                    <span className="w-8">
                      <MediaImage image={s.image} ratio="2/3" sizes="32px" className="rounded-xs" />
                    </span>
                  </span>
                ) : s.kind === 'person' ? (
                  <span className="w-10 shrink-0">
                    <MediaImage image={s.image} ratio="1/1" sizes="40px" className="rounded-full" />
                  </span>
                ) : (
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-muted">
                    <Icon name="tag" size={20} />
                  </span>
                )}
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[15px] leading-5 text-text">{s.label}</span>
                  <span className="text-[13px] leading-[18px] text-muted">{s.hint}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
