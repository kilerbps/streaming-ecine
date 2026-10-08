/**
 * Barre de progression de lecture : 3 px, piste blanche à 24 %, partie lue en rouge signal.
 * À masquer sous 2 min et au-delà de 95 % (règle de la rangée Reprendre, gérée par l'appelant).
 */
export function ProgressBar({
  value,
  label,
  className = '',
}: {
  /** Part lue, de 0 à 1. */
  value: number;
  label: string;
  className?: string;
}) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={`h-[3px] w-full overflow-hidden rounded-xs bg-[var(--player-track)] ${className}`}
    >
      <div className="h-full bg-signal" style={{ width: `${percent}%` }} />
    </div>
  );
}
