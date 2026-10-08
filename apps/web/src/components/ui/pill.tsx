import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { Icon, type IconName } from './icon';

/** Pastille (filtres, catégories) : 36 px, rayon complet ; sélectionnée = accent et texte blanc. */
export function pillClasses(selected = false, extra = ''): string {
  return [
    'press inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium',
    selected ? 'bg-accent text-on-accent' : 'bg-surface-2 text-text hover:bg-surface-3',
    extra,
  ].join(' ');
}

/** Pastille de navigation (lien). `selected` = page courante (`aria-current`). */
export function PillLink({
  selected = false,
  icon,
  className = '',
  children,
  ...rest
}: ComponentProps<typeof Link> & { selected?: boolean; icon?: IconName; children: ReactNode }) {
  return (
    <Link
      aria-current={selected ? 'page' : undefined}
      className={pillClasses(selected, className)}
      {...rest}
    >
      {children}
      {icon ? <Icon name={icon} size={16} /> : null}
    </Link>
  );
}
