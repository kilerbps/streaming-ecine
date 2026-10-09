import type { ReactNode } from 'react';
import { PageTransition } from '@/components/layout/page-transition';

/**
 * Gabarit recréé à chaque navigation (contrairement à la mise en page) : l'écran qui part et celui
 * qui arrive jouent leur transition de sortie et d'entrée.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
