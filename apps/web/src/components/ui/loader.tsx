/** Loader orbital imposé (docs/05-DESIGN-SYSTEM.md §6) : pour les attentes de plus de ~300 ms. */
export function Loader({
  label = 'Chargement…',
  className = '',
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={`ecine-loader ${className}`} role="status" aria-live="polite">
      <span className="ecine-loader__label">{label}</span>
      {Array.from({ length: 13 }, (_, i) => (
        <div key={i} className="particle" />
      ))}
    </div>
  );
}

/** Zone de hauteur connue en attente : aplat + pulsation d'opacité, jamais de shimmer. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}
