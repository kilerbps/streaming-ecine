'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from 'react';
import type { Image as ImageData, Locale } from '@ecine/contracts';
import { Poster } from '@/components/features/content/poster';
import { useAuth } from '@/components/providers/auth';
import { usePreferences } from '@/components/providers/preferences';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Loader } from '@/components/ui/loader';
import { formatTimecode } from '@/lib/format';
import { routes } from '@/lib/routes';
import { trackEventAction } from '@/server/actions/forms';
import { saveProgressAction } from '@/server/actions/interactions';
import { toggleFullscreen } from './fullscreen';
import { PlayerControls } from './player-controls';
import { useHlsPlayback } from './use-hls';

const SAVE_EVERY_SEC = 10;
const localKey = (filmId: string) => `ecine:progress:${filmId}`;

type Status = 'idle' | 'starting' | 'playing' | 'ended';

function subscribeStorage(onChange: () => void): () => void {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

function readLocalPosition(filmId: string): number {
  try {
    return Number(localStorage.getItem(localKey(filmId)) ?? 0) || 0;
  } catch {
    // Stockage indisponible : lecture depuis le début.
    return 0;
  }
}

/**
 * Lecteur du film : l'écran porte un seul CTA (« Regarder » / « Reprendre »). La vidéo n'est jamais
 * téléchargeable par lien direct (HLS chiffré + jetons) ; les réglages de l'interface ci-dessous
 * (`nodownload`, menu contextuel désactivé) relèvent du confort, pas de la sécurité.
 */
export function Player({
  filmId,
  videoId,
  title,
  poster,
  serverPosition,
  runtimeSec,
  locale,
  autoStart = false,
}: {
  filmId: string;
  videoId: string;
  title: string;
  poster: ImageData | null;
  serverPosition: number | null;
  runtimeSec: number | null;
  locale: Locale;
  autoStart?: boolean;
}) {
  const t = useTranslations('player');
  const tf = useTranslations('film');
  const { viewer } = useAuth();
  const { saveData, feedback } = usePreferences();
  const {
    videoRef,
    start,
    recoverNative,
    levels,
    currentLevel,
    setQuality,
    subtitleTracks,
    setSubtitle,
    error,
  } = useHlsPlayback(videoId, { saveData });
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSaved = useRef(0);
  const startedOnce = useRef(false);
  const [status, setStatus] = useState<Status>('idle');
  // Visiteur anonyme : position mémorisée localement (FR-004) ; 0 au rendu serveur (pas d'écart d'hydratation).
  const localPosition = useSyncExternalStore(
    subscribeStorage,
    () => readLocalPosition(filmId),
    () => 0,
  );
  const resumeAt = serverPosition ?? (viewer ? 0 : localPosition);

  const canResume = resumeAt > 10 && (!runtimeSec || resumeAt < runtimeSec * 0.95);

  const persist = useCallback(
    (position: number, force = false) => {
      if (!force && Math.abs(position - lastSaved.current) < SAVE_EVERY_SEC) return;
      lastSaved.current = position;
      if (viewer) void saveProgressAction(filmId, position);
      else {
        try {
          localStorage.setItem(localKey(filmId), String(Math.floor(position)));
        } catch {
          // Sans stockage local, la reprise n'est simplement pas proposée.
        }
      }
    },
    [filmId, viewer],
  );

  const begin = useCallback(async () => {
    feedback('clap');
    setStatus('starting');
    const ok = await start(canResume ? resumeAt : 0);
    if (!ok) setStatus('idle');
  }, [feedback, start, canResume, resumeAt]);

  useEffect(() => {
    if (autoStart && status === 'idle' && !startedOnce.current) {
      startedOnce.current = true;
      void begin();
    }
  }, [autoStart, status, begin]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || status !== 'playing') return;
    const keys: Record<string, () => void> = {
      ' ': () => (video.paused ? void video.play() : video.pause()),
      k: () => (video.paused ? void video.play() : video.pause()),
      ArrowLeft: () => (video.currentTime = Math.max(0, video.currentTime - 10)),
      ArrowRight: () =>
        (video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 10)),
      ArrowUp: () => (video.volume = Math.min(1, video.volume + 0.1)),
      ArrowDown: () => (video.volume = Math.max(0, video.volume - 0.1)),
      m: () => (video.muted = !video.muted),
      f: () => void toggleFullscreen(containerRef.current),
    };
    const action = keys[event.key];
    if (action && !(event.target instanceof HTMLInputElement && event.key.startsWith('Arrow'))) {
      event.preventDefault();
      action();
    }
  };

  const errorMessage =
    error === 'unavailable'
      ? t('errorUnavailable')
      : error === 'network'
        ? t('errorNetwork')
        : error
          ? t('errorGeneric')
          : null;

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-[var(--player-bg)] text-[var(--player-fg)] focus:outline-none"
      style={{ aspectRatio: '16/9' }}
      tabIndex={status === 'playing' ? 0 : -1}
      onKeyDown={onKeyDown}
      aria-label={`${t('play')} : ${title}`}
      role="region"
    >
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full ${status === 'idle' ? 'invisible' : ''}`}
        playsInline
        preload="none"
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
        onPlaying={() => {
          if (status !== 'playing') {
            setStatus('playing');
            containerRef.current?.focus();
            void trackEventAction({ type: 'play_start', targetType: 'FILM', targetId: filmId });
          }
        }}
        onTimeUpdate={(e) => persist(e.currentTarget.currentTime)}
        onPause={(e) => persist(e.currentTarget.currentTime, true)}
        onEnded={(e) => {
          persist(e.currentTarget.duration, true);
          setStatus('ended');
          void trackEventAction({ type: 'play_complete', targetType: 'FILM', targetId: filmId });
        }}
        onError={() => void recoverNative()}
      />

      {status === 'idle' ? (
        <div className="absolute inset-0">
          <Poster
            image={poster}
            ratio="16/9"
            sizes="(min-width: 1056px) 70vw, 100vw"
            preload
            className="h-full"
          />
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-4 bg-bg p-4 text-text md:inset-x-auto md:left-0 md:max-w-md">
            <Button variant="primary" size="lg" icon="play" iconFilled onClick={() => void begin()}>
              {canResume ? tf('resume', { time: formatTimecode(resumeAt) }) : tf('watch')}
            </Button>
            {errorMessage ? (
              <p role="alert" className="text-sm text-danger">
                {errorMessage}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {status === 'starting' && !error ? (
        <div className="absolute inset-0 grid place-items-center bg-[var(--player-bg)]">
          <Loader label={t('starting')} className="[--uib-color:var(--player-fg)]" />
        </div>
      ) : null}

      {status === 'playing' ? (
        <PlayerControls
          videoRef={videoRef}
          containerRef={containerRef}
          levels={levels}
          currentLevel={currentLevel}
          onQuality={setQuality}
          subtitleTracks={subtitleTracks}
          onSubtitle={setSubtitle}
          errorMessage={errorMessage}
        />
      ) : null}

      {status === 'ended' ? (
        <div className="absolute inset-0 flex flex-col justify-end gap-3 bg-bg p-6 text-text md:p-10">
          <p className="eyebrow text-highlight">{t('ended')}</p>
          <p className="max-w-md font-serif text-2xl md:text-3xl">{title}</p>
          <p className="max-w-md text-muted">{t('endedBody')}</p>
          <Link
            href={routes.films(locale)}
            className="inline-flex min-h-11 items-center gap-2 self-start font-medium text-accent underline-offset-4 hover:underline"
          >
            {t('moreFilms')}
            <Icon name="arrowRight" size={20} />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
