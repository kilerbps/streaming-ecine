import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Illustration } from '@/components/ui/illustration';

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Pages de compte : colonne étroite, jamais indexées. */
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container-page grid gap-10 pt-8 md:grid-cols-[minmax(0,1fr)_minmax(0,440px)] md:pt-16 lg:gap-24">
      <div className="hidden items-center md:flex">
        <Illustration variant="empty" className="h-auto w-full max-w-md" />
      </div>
      <div>{children}</div>
    </div>
  );
}
