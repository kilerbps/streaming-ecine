'use client';

import { Button } from '@/components/ui/button';
import { Illustration } from '@/components/ui/illustration';

/** Erreur inattendue dans un écran d'administration : aucun détail technique, un seul CTA. */
export default function AdminError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="grid gap-8 py-8 md:grid-cols-[160px_1fr] md:items-start md:py-12" role="alert">
      <Illustration variant="missing" className="h-auto w-32 md:w-40" />
      <div className="max-w-2xl">
        <h1 className="font-display text-[28px] font-extrabold leading-8">
          Cet écran n’a pas pu s’afficher
        </h1>
        <p className="mt-4 text-muted">
          Une erreur inattendue s’est produite. Vos contenus enregistrés ne sont pas touchés.
          Réessayez ; si le problème continue, prévenez l’administrateur technique en indiquant
          l’heure et l’écran concerné.
        </p>
        <Button variant="primary" className="mt-8" icon="refresh" onClick={() => retry()}>
          Réessayer
        </Button>
      </div>
    </div>
  );
}
