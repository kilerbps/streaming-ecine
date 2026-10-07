import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { MotifBand } from '@/components/ui/motif';

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Pages de compte : colonne étroite, jamais indexées. */
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container-page grid gap-10 pt-8 md:grid-cols-[minmax(0,1fr)_minmax(0,440px)] md:pt-16 lg:gap-24">
      <div className="hidden h-full min-h-80 md:block">
        <MotifBand name="losanges" className="h-full opacity-60" />
      </div>
      <div>{children}</div>
    </div>
  );
}
