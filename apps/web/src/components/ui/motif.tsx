/**
 * Motifs géométriques en aplat, inspirés des textiles d'Afrique centrale (velours du Kasaï, nattes).
 * PROVISOIRES : à faire valider par le propriétaire (docs/05 §9).
 * Une seule couleur (token), jamais derrière un texte long, jamais en dégradé.
 */
export type MotifName = 'losanges' | 'chevrons' | 'damier';

const PATTERNS: Record<MotifName, { size: number; path: string }> = {
  losanges: { size: 24, path: 'M12 2 22 12 12 22 2 12Z M12 7 17 12 12 17 7 12Z' },
  chevrons: { size: 24, path: 'M0 8 6 2 12 8 18 2 24 8 M0 20 6 14 12 20 18 14 24 20' },
  damier: { size: 16, path: 'M0 0H8V8H0Z M8 8H16V16H8Z' },
};

export function Motif({
  name = 'losanges',
  tone = 'border',
  className = '',
}: {
  name?: MotifName;
  tone?: 'border' | 'highlight' | 'accent';
  className?: string;
}) {
  const { size, path } = PATTERNS[name];
  const id = `motif-${name}-${tone}`;
  const color =
    tone === 'border'
      ? 'var(--border)'
      : tone === 'highlight'
        ? 'var(--highlight)'
        : 'var(--accent)';
  const filled = name === 'damier';
  return (
    <svg className={className} aria-hidden="true" focusable="false" width="100%" height="100%">
      <defs>
        <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse">
          <path
            d={path}
            fill={filled ? color : 'none'}
            stroke={filled ? 'none' : color}
            strokeWidth={filled ? 0 : 1.5}
            fillRule="evenodd"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** Séparateur de section : bande étroite de motif. */
export function MotifBand({
  name = 'chevrons',
  className = '',
}: {
  name?: MotifName;
  className?: string;
}) {
  return (
    <div className={`h-6 w-full ${className}`}>
      <Motif name={name} />
    </div>
  );
}
