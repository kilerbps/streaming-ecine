/**
 * Illustrations des états vides et des erreurs, construites avec les blocs du logo (D-13 : les motifs
 * textiles provisoires sont retirés). Blocs en `--text` à 14 % (discrets mais visibles en Nuit comme en
 * Jour, où `--surface-3` est blanc), un seul en `--accent`. Décoratives.
 * Géométrie reprise du logo actuel ; elle suivra le SVG officiel dès qu'il sera fourni.
 *
 * - `missing` : un bloc manque (page introuvable) ;
 * - `no-lens` : la caméra sans objectif (hors ligne) ;
 * - `empty` : la caméra entière, objectif en accent (liste vide, rien à afficher).
 */
const BLOCKS = {
  topLeft: 'M347 661 793 622 805 757 493 785 496 819 352 831Z',
  topRight: 'M817 620 1263 581 1278 748 1143 760 1140 728 963 744 966 776 831 788Z',
  bottomLeft: 'M352 850H800V985H487V1020H800V1155H352Z',
  bottomRight: 'M824 850H959V1020H1137V986H1272V1155H824Z',
  lens: 'M1272 776 1559 610Q1585 597 1585 625V1106Q1585 1134 1559 1121L1272 955Z',
} as const;

type Variant = 'missing' | 'no-lens' | 'empty';

export function Illustration({
  variant = 'empty',
  className = '',
}: {
  variant?: Variant;
  className?: string;
}) {
  const quiet = 'color-mix(in oklab, var(--text) 14%, transparent)';
  const accent = 'var(--accent)';
  return (
    <svg
      viewBox="330 560 1280 610"
      className={className}
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={BLOCKS.topLeft} fill={quiet} />
      {variant === 'missing' ? (
        <path
          d={BLOCKS.topRight}
          fill="none"
          stroke={accent}
          strokeWidth={10}
          strokeDasharray="28 22"
        />
      ) : (
        <path d={BLOCKS.topRight} fill={quiet} />
      )}
      <path d={BLOCKS.bottomLeft} fill={quiet} />
      <path d={BLOCKS.bottomRight} fill={quiet} />
      {variant === 'no-lens' ? (
        <path
          d={BLOCKS.lens}
          fill="none"
          stroke={accent}
          strokeWidth={10}
          strokeDasharray="28 22"
        />
      ) : (
        <path d={BLOCKS.lens} fill={variant === 'empty' ? accent : quiet} />
      )}
    </svg>
  );
}
