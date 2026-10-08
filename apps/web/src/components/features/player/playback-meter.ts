import type { AnalyticsEventInput } from '@ecine/contracts';

/** Écran ou geste qui a lancé la lecture (`play_start.source`, PRD de la refonte). */
export type PlaybackSource = 'film_page' | 'resume' | 'preview' | 'home_hero' | 'clip';

type Send = (event: Omit<AnalyticsEventInput, 'session'>) => void;

const PROGRESS_EVERY_SEC = 10;
/** Une lecture est « achevée » à 90 % de la durée (indicateur « Taux d'achèvement » du PRD). */
const COMPLETE_AT = 0.9;
/** Au-delà de cet écart entre deux mesures, c'est un saut et non de la lecture. */
const MAX_CONTINUOUS_STEP_SEC = 2;

/**
 * Mesure d'une lecture : lancement (au toucher), première image (ms depuis le toucher), progression
 * toutes les 10 s de lecture effective (position en secondes) et achèvement à 90 %.
 */
export function createPlaybackMeter(
  filmId: string,
  source: PlaybackSource,
  send: Send,
  now: () => number = () => performance.now(),
) {
  const base = { targetType: 'FILM' as const, targetId: filmId, source };
  let clickedAt: number | null = null;
  let lastPosition: number | null = null;
  let watched = 0;
  let completed = false;

  return {
    begin(): void {
      clickedAt = now();
      send({ type: 'play_start', ...base });
    },
    firstFrame(): void {
      if (clickedAt === null) return;
      send({ type: 'play_first_frame', ...base, value: Math.round(now() - clickedAt) });
      clickedAt = null;
    },
    time(position: number, duration: number, paused: boolean): void {
      const previous = lastPosition;
      lastPosition = position;
      if (previous === null || paused) return;
      const step = position - previous;
      if (step > 0 && step <= MAX_CONTINUOUS_STEP_SEC) watched += step;
      if (watched >= PROGRESS_EVERY_SEC) {
        watched -= PROGRESS_EVERY_SEC;
        send({ type: 'play_progress', ...base, value: Math.floor(position) });
      }
      if (!completed && duration > 0 && position >= duration * COMPLETE_AT) {
        completed = true;
        send({ type: 'play_complete', ...base });
      }
    },
  };
}
