'use client';

import { useId, useRef, useState, type ReactNode } from 'react';
import type { AdminRow } from '@ecine/contracts';
import type { ActionResult } from '@/server/actions/result';
import { StateBadge } from './badges';
import { CONTROL } from './fields';

/**
 * Recherche au fil de la frappe (personnes, films) : la Server Action interroge l'API ; aucune
 * donnée n'est chargée directement par le navigateur. Résultats présentés comme une liste de boutons.
 */
export function SearchPicker({
  label,
  help,
  placeholder,
  search,
  onPick,
  excludeIds = [],
}: {
  label: string;
  help?: ReactNode;
  placeholder?: string;
  search: (q: string) => Promise<ActionResult<AdminRow[]>>;
  onPick: (row: AdminRow) => void;
  excludeIds?: string[];
}) {
  const id = useId();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<AdminRow[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const timer = useRef<number | undefined>(undefined);
  const ticket = useRef(0);

  const onInput = (value: string) => {
    setQ(value);
    window.clearTimeout(timer.current);
    const term = value.trim();
    if (term.length < 2) {
      ticket.current += 1;
      setResults([]);
      setStatus('idle');
      return;
    }
    setStatus('loading');
    timer.current = window.setTimeout(async () => {
      ticket.current += 1;
      const mine = ticket.current;
      const result = await search(term);
      if (mine !== ticket.current) return;
      if (result.ok) {
        setResults(result.data);
        setStatus('done');
      } else {
        setResults([]);
        setStatus('error');
      }
    }, 250);
  };

  const visible = results.filter((r) => !excludeIds.includes(r.id));

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={q}
        placeholder={placeholder}
        autoComplete="off"
        maxLength={80}
        onChange={(e) => onInput(e.target.value)}
        className={CONTROL}
        aria-describedby={`${id}-status`}
      />
      <p id={`${id}-status`} className="text-sm text-muted" aria-live="polite">
        {status === 'loading'
          ? 'Recherche…'
          : status === 'error'
            ? 'La recherche n’a pas abouti. Réessayez.'
            : status === 'done'
              ? visible.length === 0
                ? 'Aucun résultat.'
                : `${visible.length} résultat${visible.length > 1 ? 's' : ''}.`
              : (help ?? 'Tapez au moins 2 lettres.')}
      </p>
      {visible.length > 0 ? (
        <ul className="flex flex-col border border-border">
          {visible.map((row) => (
            <li key={row.id} className="border-b border-border last:border-b-0">
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-surface-2"
                onClick={() => {
                  onPick(row);
                  setQ('');
                  setResults([]);
                  setStatus('idle');
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate">{row.title}</span>
                  {row.meta ? <span className="meta block">{row.meta}</span> : null}
                </span>
                <StateBadge state={row.state} deleted={row.deletedAt !== null} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
