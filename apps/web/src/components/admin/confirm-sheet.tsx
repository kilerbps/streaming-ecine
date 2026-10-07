'use client';

import { useId, useState, type ReactNode } from 'react';
import { Button, type ButtonVariant } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';

/**
 * Confirmation explicite d'une action sensible (suppression, désactivation, changement de rôle).
 * `typeToConfirm` : l'utilisateur doit recopier ce texte (suppressions, docs/04-API-SPEC.md §3).
 */
export function ConfirmSheet({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  typeToConfirm,
  variant = 'danger',
  pending,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  typeToConfirm?: string;
  variant?: ButtonVariant;
  pending?: boolean;
  onConfirm: () => void;
  children?: ReactNode;
}) {
  const inputId = useId();
  const [typed, setTyped] = useState('');
  const matches = !typeToConfirm || typed.trim() === typeToConfirm.trim();
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) setTyped('');
        onOpenChange(next);
      }}
      title={title}
      description={description}
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (matches) onConfirm();
        }}
      >
        {children}
        {typeToConfirm ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={inputId} className="text-sm font-medium">
              Pour confirmer, recopiez : <span className="font-mono">{typeToConfirm}</span>
            </label>
            <input
              id={inputId}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="min-h-11 w-full rounded-xs border border-border-strong bg-surface-1 px-3 py-2"
            />
          </div>
        ) : null}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" variant={variant} pending={pending} disabled={!matches}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
