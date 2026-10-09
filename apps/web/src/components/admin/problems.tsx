import type { ReactNode } from 'react';
import { LinkButton } from '@/components/ui/link-button';
import { Illustration } from '@/components/ui/illustration';
import { RetryButton } from './retry-button';

/** Écrans d'erreur de l'administration : message clair, une seule action principale. */

function ProblemFrame({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="grid gap-8 py-8 md:grid-cols-[160px_1fr] md:items-start md:py-12" role="alert">
      <Illustration variant="missing" className="h-auto w-32 md:w-40" />
      <div className="max-w-2xl">
        <h1 className="font-display text-[28px] font-extrabold leading-8">{title}</h1>
        <div className="mt-4 flex flex-col gap-3 text-muted">{children}</div>
        {action ? <div className="mt-8 flex flex-wrap gap-3">{action}</div> : null}
      </div>
    </div>
  );
}

/** 403 : rôle insuffisant (la vérification réelle est faite par l'API). */
export function AccessDenied({ message, home = true }: { message?: string; home?: boolean }) {
  return (
    <ProblemFrame
      title="Accès refusé"
      action={
        home ? (
          <LinkButton href="/admin" variant="secondary">
            Retour au tableau de bord
          </LinkButton>
        ) : null
      }
    >
      <p>{message ?? 'Votre rôle ne permet pas d’ouvrir cet écran.'}</p>
      <p>
        Si vous pensez qu’il s’agit d’une erreur, demandez à un administrateur de vérifier votre
        rôle.
      </p>
    </ProblemFrame>
  );
}

/** 403 « mfa-required » : la double authentification est obligatoire pour les administrateurs. */
export function MfaRequired() {
  return (
    <ProblemFrame
      title="Double authentification requise"
      action={
        <LinkButton href="/fr/moi/reglages" variant="primary" icon="shield">
          Activer la double authentification
        </LinkButton>
      }
    >
      <p>
        Les comptes administrateurs doivent être protégés par un code à 6 chiffres (application
        d’authentification sur votre téléphone).
      </p>
      <ol className="list-decimal pl-5">
        <li>Ouvrez vos réglages et activez la double authentification.</li>
        <li>
          Déconnectez-vous, puis reconnectez-vous en saisissant le code affiché par l’application.
        </li>
        <li>Revenez sur l’administration.</li>
      </ol>
    </ProblemFrame>
  );
}

/** Service indisponible ou réponse inattendue. */
export function Unavailable({ message }: { message: string }) {
  return (
    <ProblemFrame title="Écran momentanément indisponible" action={<RetryButton />}>
      <p>{message}</p>
    </ProblemFrame>
  );
}

/** Affiche l'échec d'une lecture `adminLoad`. */
export function LoadProblem({
  failure,
}: {
  failure: { kind: 'mfa' | 'forbidden' | 'unavailable'; message: string };
}) {
  if (failure.kind === 'mfa') return <MfaRequired />;
  if (failure.kind === 'forbidden') return <AccessDenied message={failure.message} />;
  return <Unavailable message={failure.message} />;
}
