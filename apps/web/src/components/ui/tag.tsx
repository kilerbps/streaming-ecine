import type { ReactNode } from 'react';

type Tone = 'neutral' | 'highlight' | 'accent';

const TONES: Record<Tone, string> = {
  neutral: 'text-muted border-border',
  highlight: 'text-highlight border-highlight',
  accent: 'text-accent border-accent',
};

/** Étiquette en capitales mono (type de contenu, catégorie, « Surprise »). */
export function Tag({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`eyebrow inline-flex items-center gap-1 border px-2 py-0.5 ${TONES[tone]}`}>
      {children}
    </span>
  );
}
