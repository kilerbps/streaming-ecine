'use client';

import { Dialog } from 'radix-ui';
import type { ReactNode } from 'react';
import { Icon } from './icon';

/**
 * Feuille modale : glisse depuis le bas sur mobile (bottom sheet), panneau centré dès 672 px.
 * Focus piégé, Échap pour fermer, retour du focus au déclencheur (Radix Dialog).
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay/70 data-[state=open]:animate-[ecine-fade_150ms_var(--ease)]" />
        <Dialog.Content
          className={[
            'fixed z-50 bg-bg text-text border-t border-border',
            'inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto safe-bottom',
            'md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[min(560px,92vw)] md:border',
            'data-[state=open]:animate-[ecine-sheet-up_240ms_var(--ease)] md:data-[state=open]:animate-[ecine-fade_150ms_var(--ease)]',
            'focus:outline-none',
          ].join(' ')}
        >
          <div className="flex items-start justify-between gap-4 px-6 pt-6">
            <div>
              <Dialog.Title className="font-serif text-2xl">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-2 text-muted">{description}</Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close
              className="grid size-11 shrink-0 place-items-center -mr-2 -mt-2 hover:bg-surface-2"
              aria-label="Fermer"
            >
              <Icon name="close" />
            </Dialog.Close>
          </div>
          <div className="px-6 pb-8 pt-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
