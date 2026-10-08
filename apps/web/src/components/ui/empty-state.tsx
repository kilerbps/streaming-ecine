import type { ReactNode } from 'react';
import { Illustration } from './illustration';

/**
 * État vide : illustration tirée du logo, titre, une phrase qui dit quoi faire, une seule action.
 * Jamais « rien ici » tout seul (charte, Composants).
 */
export function EmptyState({
  title,
  children,
  action,
  illustration = 'empty',
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  illustration?: 'missing' | 'no-lens' | 'empty';
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg bg-surface-1 px-6 py-10 text-center">
      <Illustration variant={illustration} className="h-auto w-28 md:w-36" />
      <div className="max-w-sm">
        <p className="text-xl font-bold leading-[25px]">{title}</p>
        {children ? <div className="mt-2 text-[15px] leading-5 text-muted">{children}</div> : null}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
