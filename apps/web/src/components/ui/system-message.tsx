import type { ReactNode } from 'react';
import { Illustration } from './illustration';

/**
 * Page système (404, erreur, hors ligne) : illustration construite avec le logo (D-13), étiquette
 * facultative, titre, texte qui dit quoi faire, puis une seule action principale.
 */
export function SystemMessage({
  illustration,
  label,
  title,
  children,
  actions,
  role,
}: {
  illustration: 'missing' | 'no-lens' | 'empty';
  label?: string;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  role?: 'alert';
}) {
  return (
    <div className="container-page grid gap-8 py-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:items-center md:gap-16 md:py-24">
      <Illustration variant={illustration} className="h-auto w-40 md:w-full md:max-w-sm" />
      <div role={role}>
        {label ? <p className="meta">{label}</p> : null}
        <h1 className="mt-2 font-display text-[28px] font-extrabold leading-8 text-balance lg:text-[40px] lg:leading-[44px]">
          {title}
        </h1>
        {children ? (
          <div className="mt-4 max-w-lg text-[17px] leading-6 text-muted">{children}</div>
        ) : null}
        {actions ? <div className="mt-8 flex flex-col gap-6">{actions}</div> : null}
      </div>
    </div>
  );
}
