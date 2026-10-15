'use client';

import { ContextMenu as Ctx, DropdownMenu as Drop } from 'radix-ui';
import { useState, type ReactNode } from 'react';
import { vibrate } from '@/lib/haptics';
import { useHistoryLayer } from '@/lib/use-history-layer';
import { Icon, type IconName } from './icon';

export interface MenuItem {
  key: string;
  label: string;
  icon: IconName;
  onSelect: () => void;
  danger?: boolean;
}

const CONTENT =
  'z-50 w-64 overflow-hidden rounded-md border border-border bg-surface-3 p-1 text-text shadow-[var(--shadow-menu)] data-[state=open]:animate-[ecine-menu-in_var(--dur-fast)_var(--ease-standard)]';
const ITEM =
  'flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-sm px-3 text-[15px] outline-none data-[highlighted]:bg-surface-2';

function Items({
  items,
  Item,
  leave,
}: {
  items: MenuItem[];
  Item: typeof Ctx.Item | typeof Drop.Item;
  leave: (after: () => void) => void;
}) {
  // L'action s'exécute une fois le menu fermé et son entrée d'historique retirée.
  return items.map((item) => (
    <Item
      key={item.key}
      onSelect={() => leave(item.onSelect)}
      className={`${ITEM} ${item.danger ? 'text-danger' : ''}`}
    >
      <Icon name={item.icon} size={20} className={item.danger ? '' : 'text-muted'} />
      {item.label}
    </Item>
  ));
}

/**
 * Menu contextuel d'une affiche ou d'une tuile : appui long (toucher) ou clic droit. L'aperçu (affiche
 * agrandie) s'affiche au-dessus de la liste. Toujours accompagné d'un équivalent visible : `MoreMenu`.
 */
export function ContextMenu({
  items,
  preview,
  children,
  contents = false,
}: {
  items: MenuItem[];
  preview?: ReactNode;
  children: ReactNode;
  /**
   * Déclencheur sans boîte (`display: contents`) autour de l'enfant, au lieu de se greffer dessus :
   * nécessaire quand l'enfant vient d'un composant serveur asynchrone (tuiles de l'accueil).
   */
  contents?: boolean;
}) {
  const [open, setOpen] = useState(false);
  // Le menu contextuel de Radix ne se pilote pas : la fermeture passe par Échap, qu'il écoute déjà.
  const leave = useHistoryLayer(open, () =>
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
  );
  return (
    <Ctx.Root
      onOpenChange={(next) => {
        setOpen(next);
        if (next) vibrate('menu');
      }}
    >
      {contents ? (
        <Ctx.Trigger className="contents">{children}</Ctx.Trigger>
      ) : (
        <Ctx.Trigger asChild>{children}</Ctx.Trigger>
      )}
      <Ctx.Portal>
        <Ctx.Content className={CONTENT} collisionPadding={16}>
          {preview ? <div className="p-2 pb-3">{preview}</div> : null}
          <Items items={items} Item={Ctx.Item} leave={leave} />
        </Ctx.Content>
      </Ctx.Portal>
    </Ctx.Root>
  );
}

/** Bouton « … » qui ouvre les mêmes actions : l'équivalent visible du menu contextuel. */
export function MoreMenu({ items, label }: { items: MenuItem[]; label: string }) {
  const [open, setOpen] = useState(false);
  const leave = useHistoryLayer(open, () => setOpen(false));
  return (
    <Drop.Root open={open} onOpenChange={setOpen}>
      <Drop.Trigger
        aria-label={label}
        className="press-icon grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
      >
        <Icon name="more" />
      </Drop.Trigger>
      <Drop.Portal>
        <Drop.Content className={CONTENT} align="end" sideOffset={4} collisionPadding={16}>
          <Items items={items} Item={Drop.Item} leave={leave} />
        </Drop.Content>
      </Drop.Portal>
    </Drop.Root>
  );
}
