'use client';

import type Hls from 'hls.js';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { usePreferences } from '@/components/providers/preferences';
import { Icon } from '@/components/ui/icon';
import {
  PREVIEW_DELAY_UNKNOWN_NETWORK_MS,
  PREVIEW_MAX_BYTES,
  previewMode,
} from '@/lib/auto-preview';
import { startPlaybackAction } from '@/server/actions/interactions';
import { readConnection } from './network';
import { withToken } from './use-hls';

/** Part de l'aperçu à l'écran pour démarrer, et en deçà de laquelle il s'arrête. */
const VISIBLE_RATIO = 0.6;
/** Réseau connu : court délai, pour ne rien lancer pendant un défilement rapide. */
const START_DELAY_MS = 600;
/** Réseau inconnu (iPhone) : un seul aperçu par écran (adresse), pour toute la visite. */
const playedOnScreen = new Set<string>();

/**
 * Sessions d'aperçu gardées pendant la visite, jusqu'à une minute de leur expiration : un aperçu
 * relancé (feuille rouverte, accueil réaffiché) n'ouvre pas de nouvelle session, car la limite de
 * l'API est partagée avec la lecture des films.
 */
const sessions = new Map<string, { token: string; manifestUrl: string; until: number }>();
const SESSION_MARGIN_MS = 60_000;

async function previewSession(videoId: string) {
  const kept = sessions.get(videoId);
  if (kept && kept.until > Date.now()) return kept;
  const result = await startPlaybackAction(videoId, true);
  if (!result.ok) return null;
  const session = {
    token: result.data.token,
    manifestUrl: result.data.manifestUrl,
    until: new Date(result.data.expiresAt).getTime() - SESSION_MARGIN_MS,
  };
  sessions.set(videoId, session);
  return session;
}

type Phase = 'idle' | 'playing' | 'paused' | 'done';

/**
 * Aperçu vidéo muet posé sur une image (affiche à la une, aperçu rapide ; D-12, docs/design/03) :
 * session d'aperçu (240p au plus, jamais comptée dans le Top 10), 1,5 Mo au plus, arrêté dès qu'il
 * sort de l'écran ou que l'onglet est masqué. Jamais en mode allégé, en économie de données, en
 * mouvement réduit ni hors 4G/Wi-Fi. Bouton pause (contenu animé de plus de 5 s).
 * Sans hls.js (HLS natif), le plafond de données ne peut pas être tenu : pas d'aperçu.
 */
export function AutoPreview({ videoId }: { videoId: string }) {
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

    let hls: Hls | null = null;
    let timer: number | undefined;
    let started = false;
    let stopped = false;
    let capped = false;

    const teardown = () => {
      stopped = true;
      window.clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      hls?.destroy();
      hls = null;
      media.pause();
      media.removeAttribute('src');
      media.load();
    };
    const stop = () => {
      if (stopped) return;
      teardown();
      setPhase('done');
    };

    const begin = async () => {
      started = true;
      if (mode === 'delayed') playedOnScreen.add(screen);
      const { default: HlsClass } = await import('hls.js');
      if (stopped) return;
      if (!HlsClass.isSupported()) return stop();
      let session: Awaited<ReturnType<typeof previewSession>>;
      try {
        session = await previewSession(videoId);
      } catch {
        return stop();
      }
      if (stopped) return;
      if (!session) return stop();
      const { token, manifestUrl } = session;
      let loaded = 0;
      hls = new HlsClass({
        startLevel: 0,
        capLevelToPlayerSize: true,
        maxBufferLength: 8,
        maxMaxBufferLength: 12,
        xhrSetup: (xhr, url) => {
          xhr.open('GET', withToken(url, token), true);
        },
      });
      hls.on(HlsClass.Events.FRAG_LOADED, (_event, data) => {
        const size = data.frag.stats.loaded;
        loaded += size;
        // 1,5 Mo au plus : on s'arrête avant le morceau qui dépasserait, puis on lit le tampon.
        if (loaded + size > PREVIEW_MAX_BYTES) {
          capped = true;
          hls?.stopLoad();
        }
      });
      hls.on(HlsClass.Events.ERROR, (_event, data) => {
        if (data.fatal) stop();
      });
      hls.on(HlsClass.Events.MANIFEST_PARSED, () => {
        media.play().catch(stop);
      });
      hls.loadSource(withToken(manifestUrl, token));
      hls.attachMedia(media);
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
          const delay = mode === 'delayed' ? PREVIEW_DELAY_UNKNOWN_NETWORK_MS : START_DELAY_MS;
          timer = window.setTimeout(() => void begin(), delay);
        }
      },
      { threshold: [0, VISIBLE_RATIO, 1] },
    );
    const onVisibility = () => {
      if (document.hidden) {
        if (started) stop();
        else window.clearTimeout(timer);
      }
    };
    const onWaiting = () => {
      if (capped) stop();
    };
    observer.observe(node);
    document.addEventListener('visibilitychange', onVisibility);
    media.addEventListener('ended', stop);
    media.addEventListener('waiting', onWaiting);
    return () => {
      media.removeEventListener('ended', stop);
      media.removeEventListener('waiting', onWaiting);
      if (!stopped) teardown();
    };
  }, [videoId, autoPreviews, lite, saveData]);

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
