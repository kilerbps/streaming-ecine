'use client';

import { Button } from '@/components/ui/button';

/** Recharge la page demandée (page hors ligne servie à sa place par le service worker). */
export function ReloadButton({ label }: { label: string }) {
  return (
    <Button variant="primary" size="lg" icon="refresh" onClick={() => window.location.reload()}>
      {label}
    </Button>
  );
}
