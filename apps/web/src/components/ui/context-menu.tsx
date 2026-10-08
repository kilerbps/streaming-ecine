'use client';

import { ContextMenu as Ctx, DropdownMenu as Drop } from 'radix-ui';
import type { ReactNode } from 'react';
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

function Items({ items, Item }: { items: MenuItem[]; Item: typeof Ctx.Item | typeof Drop.Item }) {
  return items.map((item) => (
    <Item
      key={item.key}
      onSelect={item.onSelect}
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
}: {
  items: MenuItem[];
  preview?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Ctx.Root>
      <Ctx.Trigger asChild>{children}</Ctx.Trigger>
      <Ctx.Portal>
        <Ctx.Content className={CONTENT} collisionPadding={16}>
          {preview ? <div className="p-2 pb-3">{preview}</div> : null}
          <Items items={items} Item={Ctx.Item} />
        </Ctx.Content>
      </Ctx.Portal>
    </Ctx.Root>
  );
}

/** Bouton « … » qui ouvre les mêmes actions : l'équivalent visible du menu contextuel. */
export function MoreMenu({ items, label }: { items: MenuItem[]; label: string }) {
  return (
    <Drop.Root>
      <Drop.Trigger
        aria-label={label}
        className="press-icon grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
      >
        <Icon name="more" />
      </Drop.Trigger>
      <Drop.Portal>
        <Drop.Content className={CONTENT} align="end" sideOffset={4} collisionPadding={16}>
          <Items items={items} Item={Drop.Item} />
        </Drop.Content>
      </Drop.Portal>
    </Drop.Root>
  );
}
