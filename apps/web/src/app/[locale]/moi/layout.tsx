import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function MeLayout({ children }: { children: ReactNode }) {
  return <div className="container-page max-w-5xl pt-8 md:pt-12">{children}</div>;
}
