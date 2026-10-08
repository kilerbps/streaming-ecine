'use client';

import { useRef, type KeyboardEvent } from 'react';

/**
 * Contrôle segmenté (2 à 4 segments) : conteneur `--surface-2` à rayon complet, curseur qui glisse en
 * ressort « doux ». Sémantique de groupe de boutons radio : flèches gauche et droite pour changer.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  className = '',
}: {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next]!.value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={`relative grid rounded-full bg-surface-2 p-1 ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 rounded-full bg-accent transition-transform duration-[var(--spring-smooth-dur)] ease-[var(--spring-smooth)]"
        style={{
          width: `calc((100% - 8px) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((option, i) => {
        const selected = i === index;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[i] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={`relative z-10 min-h-9 rounded-full px-4 text-sm font-semibold transition-colors ${
              selected ? 'text-on-accent' : 'text-muted hover:text-text'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
