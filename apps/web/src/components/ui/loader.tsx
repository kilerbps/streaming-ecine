/**
 * Loader orbital imposé par le propriétaire : seulement pour les attentes de plus de ~300 ms qui n'ont
 * pas de skeleton (suite d'une liste, préparation du lecteur, tirer pour rafraîchir). Couleur réglable
 * par `--loader-color` (par défaut `--text`).
 */
export function Loader({
  label = 'Chargement…',
  size = 'md',
  className = '',
}: {
  label?: string;
  /** `md` 45 px ; `sm` 20 px (bouton en cours). */
  size?: 'md' | 'sm';
  className?: string;
}) {
  return (
    <div
      className={`ecine-loader ${size === 'sm' ? 'ecine-loader--sm' : ''} ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="ecine-loader__label">{label}</span>
      {Array.from({ length: 13 }, (_, i) => (
        <div key={i} className="particle" />
      ))}
    </div>
  );
}

/**
 * Skeleton : aplat `--surface-2` qui pulse, aux dimensions exactes du contenu final (aucun décalage
 * au remplacement), invisible pendant 150 ms. Jamais de shimmer ni de dégradé.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/** Lignes de texte (la dernière plus courte). */
export function SkeletonText({
  lines = 1,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={`h-4 rounded-xs ${i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

/** Affiche 2:3 d'une rangée, avec ses deux lignes de titre. */
export function SkeletonPoster({ withTitle = true }: { withTitle?: boolean }) {
  return (
    <div className="w-[var(--tile-w)] shrink-0" aria-hidden="true">
      <Skeleton className="aspect-[2/3] w-full rounded-sm" />
      {withTitle ? <SkeletonText lines={2} className="mt-2" /> : null}
    </div>
  );
}

/** Tuile paysage 16:9 (Reprendre, courts-métrages). */
export function SkeletonLandscape() {
  return (
    <div className="w-[calc(var(--tile-w)*2)] shrink-0" aria-hidden="true">
      <Skeleton className="aspect-video w-full rounded-md" />
      <SkeletonText lines={1} className="mt-2" />
    </div>
  );
}

/** Rangée : titre puis affiches qui débordent vers la droite. */
export function SkeletonRow({ count = 4 }: { count?: number }) {
  return (
    <div className="tile-size" aria-hidden="true">
      <Skeleton className="mx-4 h-6 w-44 rounded-xs md:mx-8 lg:mx-12" />
      <div className="mt-3 flex gap-2 overflow-hidden px-4 md:px-8 lg:px-12">
        {Array.from({ length: count }, (_, i) => (
          <SkeletonPoster key={i} />
        ))}
      </div>
    </div>
  );
}

/** Affiche à la une : carte 4:5 sur mobile, plein cadre 16:9 sur PC. */
export function SkeletonHero() {
  return (
    <div className="px-4 lg:px-0" aria-hidden="true">
      <Skeleton className="aspect-[4/5] w-full rounded-lg lg:aspect-video lg:max-h-[80dvh] lg:rounded-none" />
    </div>
  );
}
