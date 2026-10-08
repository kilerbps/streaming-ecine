'use client';

import { useId } from 'react';

/**
 * Interrupteur 51 × 31 (vert `--success` quand il est activé), curseur en ressort « vif ».
 * `role="switch"` ; le libellé est cliquable. `locked` = toujours activé (ex. cookies nécessaires).
 */
export function Switch({
  label,
  description,
  checked,
  onChange,
  locked = false,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange?: (checked: boolean) => void;
  locked?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex min-h-11 items-center justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="block cursor-pointer text-[15px] leading-5 text-text">
          {label}
        </label>
        {description ? (
          <p id={`${id}-description`} className="mt-0.5 text-[13px] leading-[18px] text-muted">
            {description}
          </p>
        ) : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-description` : undefined}
        disabled={locked}
        onClick={() => onChange?.(!checked)}
        className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors disabled:opacity-60 ${
          checked ? 'bg-success' : 'bg-border-strong'
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute left-[2px] top-[2px] size-[27px] rounded-full bg-[var(--on-image-text)] shadow-[var(--shadow-menu)] transition-transform duration-[var(--spring-snappy-dur)] ease-[var(--spring-snappy)] ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
