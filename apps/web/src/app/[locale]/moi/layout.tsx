import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function MeLayout({ children }: { children: ReactNode }) {
  return <div className="container-page pt-6 md:pt-10">{children}</div>;
}
