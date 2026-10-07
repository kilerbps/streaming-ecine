import Link from 'next/link';
import type { ReactNode } from 'react';

/** En-tête d'écran : fil d'Ariane court, titre serif, description et actions (un seul CTA principal). */
export function PageHeader({
  title,
  description,
  back,
  badges,
  actions,
}: {
  title: string;
  description?: ReactNode;
  back?: { href: string; label: string };
  badges?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {back ? (
          <Link
            href={back.href}
            className="meta mb-3 inline-flex min-h-8 items-center gap-1 hover:text-text"
          >
            <span aria-hidden="true">←</span> {back.label}
          </Link>
        ) : null}
        <h1 className="font-serif text-3xl break-words md:text-4xl">{title}</h1>
        {badges ? <div className="mt-3 flex flex-wrap items-center gap-2">{badges}</div> : null}
        {description ? <div className="mt-2 max-w-2xl text-muted">{description}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
    </header>
  );
}

/** Section d'un formulaire ou d'un écran (titre + contenu bordé). */
export function Panel({
  title,
  description,
  children,
  className = '',
}: {
  title?: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-border bg-surface-1 p-4 md:p-6 ${className}`}>
      {title ? <h2 className="font-serif text-xl">{title}</h2> : null}
      {description ? <div className="mt-1 text-sm text-muted">{description}</div> : null}
      <div className={title || description ? 'mt-5' : ''}>{children}</div>
    </section>
  );
}
