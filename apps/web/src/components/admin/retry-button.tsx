'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';

/** Relance le rendu serveur de l'écran courant. */
export function RetryButton({ label = 'Réessayer' }: { label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="primary"
      icon="refresh"
      pending={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {label}
    </Button>
  );
}
