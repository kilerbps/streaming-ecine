import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon, type IconName } from './icon';

/** Groupe de lignes (Moi, réglages) : surface 1, rayon 12, séparateurs fins. */
export const LIST_GROUP = 'overflow-hidden rounded-md bg-surface-1 divide-y divide-border';

/** Ligne de 52 px : icône Solar Linear à gauche, libellé, chevron à droite. */
export const LIST_ROW =
  'press flex min-h-[52px] w-full items-center gap-3 px-4 text-left text-[17px] leading-[22px] text-text hover:bg-surface-2 disabled:opacity-40';

export function ListRowContent({
  icon,
  label,
  chevron = true,
}: {
  icon: IconName;
  label: ReactNode;
  chevron?: boolean;
}) {
  return (
    <>
      <Icon name={icon} size={24} className="shrink-0 text-muted" />
      <span className="flex-1">{label}</span>
      {chevron ? <Icon name="chevronRight" size={20} className="shrink-0 text-subtle" /> : null}
    </>
  );
}

export function ListLink({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  return (
    <li>
      <Link transitionTypes={['push']} href={href} className={LIST_ROW}>
        <ListRowContent icon={icon} label={label} />
      </Link>
    </li>
  );
}
