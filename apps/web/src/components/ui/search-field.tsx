'use client';

import { forwardRef, useImperativeHandle, useRef, useState, type InputHTMLAttributes } from 'react';
import { Icon } from './icon';

/**
 * Champ de recherche : 44 px, rayon complet, `--surface-2`, loupe à gauche, bouton Effacer.
 * Reste un vrai `<input type="search">` dans un formulaire GET : fonctionne sans JavaScript.
 * Non contrôlé par défaut ; avec `value`, le parent garde la saisie et reçoit `onClear`.
 */
export const SearchField = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value'> & {
    label: string;
    clearLabel: string;
    value?: string;
    onClear?: () => void;
  }
>(function SearchField(
  {
    label,
    clearLabel,
    defaultValue,
    value: controlled,
    onClear,
    className = '',
    onChange,
    ...rest
  },
  ref,
) {
  const input = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => input.current as HTMLInputElement);
  const [own, setOwn] = useState(String(defaultValue ?? ''));
  const value = controlled ?? own;
  return (
    <div className={`relative ${className}`}>
      <Icon
        name="search"
        size={20}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
      />
      <input
        ref={input}
        type="search"
        aria-label={label}
        value={value}
        onChange={(event) => {
          setOwn(event.target.value);
          onChange?.(event);
        }}
        className="h-11 w-full rounded-full bg-surface-2 pl-11 pr-11 text-base text-text placeholder:text-muted [&::-webkit-search-cancel-button]:appearance-none"
        {...rest}
      />
      {value ? (
        <button
          type="button"
          aria-label={clearLabel}
          onClick={() => {
            setOwn('');
            onClear?.();
            input.current?.focus();
          }}
          className="press-icon absolute right-0 top-0 grid size-11 place-items-center rounded-full text-muted hover:text-text"
        >
          <Icon name="close" size={20} />
        </button>
      ) : null}
    </div>
  );
});
