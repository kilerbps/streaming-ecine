import type { ReactNode } from 'react';
import { Motif } from './motif';

/** État vide : motif discret + message utile + éventuellement une action. */
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="grid gap-6 border border-border p-6 md:grid-cols-[120px_1fr] md:items-center">
      <div className="h-24 w-full md:h-28">
        <Motif name="losanges" />
      </div>
      <div>
        <p className="font-serif text-xl">{title}</p>
        {children ? <div className="mt-2 text-muted">{children}</div> : null}
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  );
}
