'use client';

import {
  useId,
  useState,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Markdown } from '@/lib/markdown';
import { isoToLocalInput, localInputToIso } from './format';

/** Champs complémentaires de l'administration (même apparence que components/ui/field.tsx). */

/** `setValueAs` : champ texte vide → absent (URL et dates facultatives). */
export function emptyToUndefined(value: unknown): unknown {
  return typeof value === 'string' && value.trim() === ''
    ? undefined
    : typeof value === 'string'
      ? value.trim()
      : value;
}

/** `setValueAs` : nombre entier facultatif. */
export function optionalInt(value: unknown): number | undefined {
  if (value === '' || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

export const CONTROL =
  'w-full min-h-11 bg-surface-1 text-text border border-border-strong rounded-xs px-3 py-2 placeholder:text-muted aria-[invalid=true]:border-danger';

function describedBy(id: string, help?: ReactNode, error?: string): string | undefined {
  return (
    [help ? `${id}-help` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') ||
    undefined
  );
}

function Shell({
  id,
  label,
  help,
  error,
  optional,
  children,
}: {
  id: string;
  label: ReactNode;
  help?: ReactNode;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
        {optional ? <span className="ml-2 font-normal text-muted">(facultatif)</span> : null}
      </label>
      {children}
      {help ? (
        <div id={`${id}-help`} className="text-sm text-muted">
          {help}
        </div>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-sm text-danger" role="alert">
          <span aria-hidden="true">!</span>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SelectField({
  label,
  help,
  error,
  optional,
  id: idProp,
  children,
  ...rest
}: {
  label: ReactNode;
  help?: ReactNode;
  error?: string;
  optional?: boolean;
} & SelectHTMLAttributes<HTMLSelectElement>) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <Shell id={id} label={label} help={help} error={error} optional={optional}>
      <select
        id={id}
        className={CONTROL}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, help, error)}
        {...rest}
      >
        {children}
      </select>
    </Shell>
  );
}

/** Compteur de caractères (titres et descriptions SEO). */
export function CharCounter({
  value,
  max,
  hint,
}: {
  value: string | undefined;
  max: number;
  hint?: string;
}) {
  const length = value?.length ?? 0;
  const over = length > max;
  return (
    <span className="flex flex-wrap justify-between gap-2">
      <span>{hint}</span>
      <span className={`font-mono text-xs ${over ? 'text-danger' : 'text-muted'}`}>
        {length}/{max}
        {over ? ' — trop long' : ''}
      </span>
    </span>
  );
}

/** Date et heure (heure de Kinshasa) ↔ ISO 8601 ; vide = aucune date. */
export function DateTimeField({
  label,
  help,
  error,
  optional,
  value,
  onChange,
  min,
}: {
  label: ReactNode;
  help?: ReactNode;
  error?: string;
  optional?: boolean;
  value: string | undefined;
  onChange: (iso: string | undefined) => void;
  min?: string;
}) {
  const id = useId();
  return (
    <Shell
      id={id}
      label={label}
      help={help ?? 'Heure de Kinshasa.'}
      error={error}
      optional={optional}
    >
      <input
        id={id}
        type="datetime-local"
        className={CONTROL}
        value={isoToLocalInput(value)}
        min={min ? isoToLocalInput(min) : undefined}
        onChange={(event) => onChange(localInputToIso(event.target.value))}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, help ?? 'Heure de Kinshasa.', error)}
      />
    </Shell>
  );
}

const MARKDOWN_HELP: Array<[string, string]> = [
  ['## Titre', 'titre de section'],
  ['### Sous-titre', 'sous-titre'],
  ['**gras**', 'texte en gras'],
  ['*italique*', 'texte en italique'],
  ['[lien](https://…)', 'lien (https ou chemin du site)'],
  ['- élément', 'liste à puces (une ligne par élément)'],
  ['1. élément', 'liste numérotée'],
  ['> citation', 'citation'],
];

/**
 * Texte en Markdown restreint avec aide et aperçu en direct (même rendu que le site public).
 * Mobile : onglets Écrire / Aperçu ; PC : côte à côte.
 */
export function MarkdownField({
  label,
  error,
  value,
  rows = 18,
  textarea,
}: {
  label: string;
  error?: string;
  value: string | undefined;
  rows?: number;
  textarea: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> };
}) {
  const id = useId();
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const tabClass = (active: boolean) =>
    `min-h-11 border-b-2 px-4 text-sm ${active ? 'border-accent text-text' : 'border-transparent text-muted hover:text-text'}`;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <div className="flex lg:hidden" role="group" aria-label="Affichage">
          <button
            type="button"
            className={tabClass(tab === 'write')}
            aria-pressed={tab === 'write'}
            onClick={() => setTab('write')}
          >
            Écrire
          </button>
          <button
            type="button"
            className={tabClass(tab === 'preview')}
            aria-pressed={tab === 'preview'}
            onClick={() => setTab('preview')}
          >
            Aperçu
          </button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={tab === 'preview' ? 'hidden lg:block' : ''}>
          <textarea
            id={id}
            rows={rows}
            className={`${CONTROL} min-h-64 resize-y font-mono text-sm`}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`}
            {...textarea}
          />
        </div>
        <div
          className={`${tab === 'write' ? 'hidden lg:block' : ''} min-h-64 overflow-y-auto border border-border bg-bg p-4`}
          aria-label="Aperçu"
        >
          <p className="eyebrow mb-3 text-muted">Aperçu</p>
          <div className="prose-ecine">
            {value?.trim() ? (
              <Markdown source={value} />
            ) : (
              <p className="text-muted">L’aperçu apparaît ici.</p>
            )}
          </div>
        </div>
      </div>
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-sm text-danger" role="alert">
          <span aria-hidden="true">!</span>
          {error}
        </p>
      ) : null}
      <details id={`${id}-help`} className="border border-border bg-surface-1 px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium">Mise en forme disponible</summary>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5">
          {MARKDOWN_HELP.map(([syntax, meaning]) => (
            <div key={syntax} className="contents">
              <dt className="font-mono text-xs leading-6">{syntax}</dt>
              <dd className="text-muted">{meaning}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-muted">
          Laissez une ligne vide entre deux paragraphes. Le HTML n’est pas interprété.
        </p>
      </details>
    </div>
  );
}
