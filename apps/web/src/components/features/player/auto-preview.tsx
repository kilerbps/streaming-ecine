'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { usePreferences } from '@/components/providers/preferences';
import { Icon } from '@/components/ui/icon';
import {
  PREVIEW_BUDGET_PER_VISIT,
  PREVIEW_DELAY_UNKNOWN_NETWORK_MS,
  PREVIEW_START_DELAY_MS,
  previewMode,
} from '@/lib/auto-preview';
import { readConnection } from './network';

/** Part de l'aperçu à l'écran pour démarrer, et en deçà de laquelle il s'arrête. */
const VISIBLE_RATIO = 0.6;
/** Réseau inconnu (iPhone) : un seul aperçu par écran (adresse), pour toute la visite. */
const playedOnScreen = new Set<string>();
/** Aperçus restants pour la visite (données mobiles, ADR-0015). */
let budget = PREVIEW_BUDGET_PER_VISIT;

type Phase = 'idle' | 'playing' | 'paused' | 'done';

/**
 * Aperçu vidéo muet posé sur une image (affiche à la une, aperçu rapide ; D-12, ADR-0015) : extrait
 * statique de 14 s en 240p (environ 0,6 Mo), sans session de lecture ni jeton. Démarre après 1 s de
 * visibilité, s'arrête dès qu'il sort de l'écran ou que l'onglet est masqué ; 5 par visite au plus.
 * Jamais en mode allégé, en économie de données, en mouvement réduit ni hors 4G/Wi-Fi.
 * Bouton pause (contenu animé de plus de 5 s).
 */
export function AutoPreview({ src }: { src: string }) {
  const t = useTranslations('player');
  const { autoPreviews, lite, saveData } = usePreferences();
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');

  useEffect(() => {
    const node = box.current;
    const media = video.current;
    if (!node || !media) return;
    const mode = previewMode({
      autoPreviews,
      lite,
      saveData,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      connection: readConnection(),
    });
    const screen = window.location.pathname;
    if (mode === 'never' || (mode === 'delayed' && playedOnScreen.has(screen))) return;

    let timer: number | undefined;
    let started = false;
    let stopped = false;

    const teardown = () => {
      stopped = true;
      window.clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      media.pause();
      media.removeAttribute('src');
      media.load();
    };
    const stop = () => {
      if (stopped) return;
      teardown();
      setPhase('done');
    };

    const begin = () => {
      if (budget <= 0) return stop();
      budget -= 1;
      started = true;
      if (mode === 'delayed') playedOnScreen.add(screen);
      media.src = src;
      media.play().catch(stop);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = Boolean(entry?.isIntersecting && entry.intersectionRatio >= VISIBLE_RATIO);
        if (started) {
          if (!visible) stop();
          return;
        }
        window.clearTimeout(timer);
        if (visible && !document.hidden) {
          const delay =
            mode === 'delayed' ? PREVIEW_DELAY_UNKNOWN_NETWORK_MS : PREVIEW_START_DELAY_MS;
          timer = window.setTimeout(begin, delay);
        }
      },
      { threshold: [0, VISIBLE_RATIO, 1] },
    );
    const onVisibility = () => {
      if (!document.hidden) return;
      if (started) stop();
      else window.clearTimeout(timer);
    };
    observer.observe(node);
    document.addEventListener('visibilitychange', onVisibility);
    media.addEventListener('ended', stop);
    return () => {
      media.removeEventListener('ended', stop);
      if (!stopped) teardown();
    };
  }, [src, autoPreviews, lite, saveData]);

  const shown = phase === 'playing' || phase === 'paused';
  return (
    <div
      ref={box}
      // L'affiche à la une ne défile pas tant qu'un aperçu est montré.
      data-previewing={shown ? '' : undefined}
      className="pointer-events-none absolute inset-0"
    >
      <video
        ref={video}
        muted
        playsInline
        disablePictureInPicture
        disableRemotePlayback
        preload="none"
        aria-hidden="true"
        tabIndex={-1}
        onPlaying={() => setPhase('playing')}
        className={`size-full object-cover transition-opacity duration-[var(--dur-slow)] ease-[var(--ease-standard)] ${shown ? 'opacity-100' : 'opacity-0'}`}
      />
      {shown ? (
        <button
          type="button"
          aria-label={phase === 'playing' ? t('previewPause') : t('previewPlay')}
          onClick={() => {
            const media = video.current;
            if (!media) return;
            if (phase === 'playing') {
              media.pause();
              setPhase('paused');
            } else {
              void media.play().catch(() => undefined);
            }
          }}
          className="press-icon pointer-events-auto absolute right-3 top-3 grid size-11 place-items-center rounded-full bg-overlay text-[var(--on-image-text)]"
        >
          <Icon name={phase === 'playing' ? 'pause' : 'play'} size={20} />
        </button>
      ) : null}
    </div>
  );
}
