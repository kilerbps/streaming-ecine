import type { ReactNode } from 'react';

type Tone = 'neutral' | 'highlight' | 'accent';

const TONES: Record<Tone, string> = {
  neutral: 'text-muted border-border-strong',
  highlight: 'text-signal-text border-signal',
  accent: 'text-accent-text border-accent',
};

/**
 * Étiquette bordée en casse normale (type de contenu, catégorie, classification d'âge, qualité).
 * Pour signaler un moment (Nouveau, TOP 10, Bientôt), utiliser le Badge à coin coupé.
 */
export function Tag({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex min-h-6 items-center gap-1 rounded-xs border px-2 text-xs font-semibold ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
