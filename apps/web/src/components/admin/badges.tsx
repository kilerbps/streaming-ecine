import type { ReactNode } from 'react';
import type { PublishState } from '@ecine/contracts';
import { STATE_LABELS, VIDEO_STATE_LABELS } from './labels';

type Tone = 'neutral' | 'muted' | 'success' | 'highlight' | 'danger' | 'accent';

const TONES: Record<Tone, string> = {
  neutral: 'text-text border-border-strong',
  muted: 'text-muted border-border',
  success: 'text-success border-success',
  highlight: 'text-highlight border-highlight',
  danger: 'text-danger border-danger',
  accent: 'text-accent border-accent',
};

/** Pastille d'état : le texte porte l'information (jamais la couleur seule). */
export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`eyebrow inline-flex shrink-0 items-center border px-2 py-0.5 whitespace-nowrap ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

const STATE_TONES: Record<PublishState, Tone> = {
  DRAFT: 'neutral',
  SCHEDULED: 'accent',
  PUBLISHED: 'success',
  ARCHIVED: 'muted',
};

/** Brouillon · Planifié · Publié · Archivé · Supprimé (corbeille). */
export function StateBadge({
  state,
  deleted = false,
}: {
  state: PublishState | null;
  deleted?: boolean;
}) {
  if (deleted) return <Badge tone="danger">Supprimé</Badge>;
  if (!state) return null;
  return <Badge tone={STATE_TONES[state]}>{STATE_LABELS[state]}</Badge>;
}

export function VideoStateBadge({ state }: { state: keyof typeof VIDEO_STATE_LABELS }) {
  const tone: Tone = state === 'READY' ? 'success' : state === 'FAILED' ? 'danger' : 'accent';
  return <Badge tone={tone}>{VIDEO_STATE_LABELS[state]}</Badge>;
}
