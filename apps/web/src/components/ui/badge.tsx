import type { ReactNode } from 'react';

type Tone = 'signal' | 'neutral' | 'accent';

const TONES: Record<Tone, string> = {
  signal: 'bg-signal text-on-accent',
  neutral: 'bg-surface-3 text-text',
  accent: 'bg-accent text-on-accent',
};

/**
 * Badge à coin coupé, signature reprise du badge du logo : `signal` (Nouveau, TOP 10), `neutral`
 * (Court-métrage), `accent` (Bientôt). 20 px de haut ; jamais plus de deux badges par tuile.
 */
export function Badge({ tone = 'signal', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`badge-cut inline-flex h-5 items-center rounded-xs px-2 text-xs font-semibold leading-none ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
