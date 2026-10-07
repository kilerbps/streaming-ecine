'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Icon } from '@/components/ui/icon';
import { formatTimecode } from '@/lib/format';
import { toggleFullscreen } from './fullscreen';
import { formatDataPerHour } from './network';
import type { QualityLevel } from './use-hls';

/** Fin de la plage chargée qui contient la position courante (0 si rien n'est chargé à cet endroit). */
function bufferedAhead(video: HTMLVideoElement): number {
  const { buffered, currentTime } = video;
  for (let i = 0; i < buffered.length; i += 1) {
    if (buffered.start(i) <= currentTime + 0.5 && currentTime <= buffered.end(i)) {
      return buffered.end(i);
    }
  }
  return 0;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const HIDE_AFTER_MS = 3000;
/** Barre de commandes (progression + boutons) et marge : le menu flottant s'arrête au-dessus. */
const MENU_BOTTOM_OFFSET_PX = 104;

function menuHeightFor(container: HTMLElement | null): number {
  return Math.max(160, (container?.clientHeight ?? 400) - MENU_BOTTOM_OFFSET_PX);
}
const BUTTON =
  'grid size-11 shrink-0 place-items-center hover:bg-[var(--player-fg)] hover:text-[var(--player-bg)]';

/** Commandes du lecteur sur un bandeau plein (jamais de voile ni de dégradé sur l'image). */
export function PlayerControls({
  videoRef,
  containerRef,
  levels,
  currentLevel,
  playingHeight,
  onQuality,
  subtitleTracks,
  onSubtitle,
  errorMessage,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  levels: QualityLevel[];
  currentLevel: number;
  /** Qualité réellement affichée (utile en « Auto »), `null` avant le premier segment. */
  playingHeight: number | null;
  onQuality: (index: number) => void;
  subtitleTracks: Array<{ index: number; label: string }>;
  onSubtitle: (index: number) => void;
  errorMessage: string | null;
}) {
  const t = useTranslations('player');
  const tc = useTranslations('common');
  const [paused, setPaused] = useState(false);
  /** Hauteur disponible pour le menu flottant (PC) : hauteur du lecteur moins la barre de commandes. */
  const [menuMaxHeight, setMenuMaxHeight] = useState(320);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [loadedUntil, setLoadedUntil] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [subtitle, setSubtitle] = useState(-1);
  const hideTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const sync = () => {
      setPaused(video.paused);
      setMuted(video.muted);
      setTime(video.currentTime);
      setLoadedUntil(bufferedAhead(video));
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    };
    const events = [
      'play',
      'pause',
      'timeupdate',
      'progress',
      'durationchange',
      'volumechange',
      'loadedmetadata',
    ] as const;
    events.forEach((e) => video.addEventListener(e, sync));
    const onFullscreen = () => {
      setFullscreen(Boolean(document.fullscreenElement));
      setMenuMaxHeight(menuHeightFor(containerRef.current));
    };
    document.addEventListener('fullscreenchange', onFullscreen);
    sync();
    return () => {
      events.forEach((e) => video.removeEventListener(e, sync));
      document.removeEventListener('fullscreenchange', onFullscreen);
    };
  }, [videoRef, containerRef]);

  // Masquage automatique pendant la lecture ; réapparition au moindre geste.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const wake = () => {
      setVisible(true);
      window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => setVisible(false), HIDE_AFTER_MS);
    };
    wake();
    const events = ['pointermove', 'pointerdown', 'keydown', 'focusin'] as const;
    events.forEach((e) => container.addEventListener(e, wake));
    return () => {
      window.clearTimeout(hideTimer.current);
      events.forEach((e) => container.removeEventListener(e, wake));
    };
  }, [containerRef]);

  const video = videoRef.current;
  const shown = visible || paused || menuOpen;
  const percent = (value: number) =>
    duration > 0 ? Math.min(100, Math.max(0, (value / duration) * 100)) : 0;

  return (
    <div
      className={`absolute inset-x-0 bottom-0 transition-opacity ${shown ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
    >
      {errorMessage ? (
        <p role="alert" className="bg-[var(--player-bg)] px-4 py-2 text-sm">
          {errorMessage}
        </p>
      ) : null}
      {menuOpen ? (
        // Mobile : feuille en bas de l'écran (le lecteur est trop bas pour un menu flottant).
        // PC : menu flottant au-dessus des commandes, défilant si le lecteur est petit.
        <div
          className="fixed inset-x-0 bottom-0 z-50 max-h-[70dvh] overflow-y-auto border-t border-[var(--player-fg)] bg-[var(--player-bg)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-sm md:absolute md:inset-x-auto md:bottom-full md:right-2 md:mb-2 md:max-h-[var(--menu-max)] md:w-72 md:max-w-[calc(100%-16px)] md:border md:pb-4"
          style={{ ['--menu-max' as string]: `${menuMaxHeight}px` }}
        >
          <div className="mb-2 flex items-center justify-between md:hidden">
            <p className="eyebrow">{`${t('quality')} · ${t('speed')}`}</p>
            <button
              type="button"
              className={BUTTON}
              onClick={() => setMenuOpen(false)}
              aria-label={tc('close')}
            >
              <Icon name="close" />
            </button>
          </div>
          {levels.length > 0 ? (
            <fieldset className="mb-4" aria-describedby="ecine-quality-hint">
              <legend className="eyebrow mb-2">{t('quality')}</legend>
              <p id="ecine-quality-hint" className="mb-2 text-xs opacity-80">
                {t('dataHint')}
              </p>
              {[{ index: -1, height: 0, bitrate: 0 }, ...levels].map((level) => (
                <label key={level.index} className="flex min-h-9 cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="quality"
                    checked={currentLevel === level.index}
                    onChange={() => onQuality(level.index)}
                  />
                  <span className="flex-1">
                    {level.index !== -1
                      ? `${level.height}p`
                      : playingHeight && currentLevel === -1
                        ? t('autoWith', { height: playingHeight })
                        : t('auto')}
                  </span>
                  {level.bitrate > 0 ? (
                    <span className="font-mono text-xs opacity-80">
                      {formatDataPerHour(level.bitrate)}
                    </span>
                  ) : null}
                </label>
              ))}
            </fieldset>
          ) : null}
          <fieldset className="mb-4">
            <legend className="eyebrow mb-2">{t('speed')}</legend>
            <div className="flex flex-wrap gap-2">
              {SPEEDS.map((s) => (
                <label key={s} className="flex min-h-9 cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="speed"
                    checked={speed === s}
                    onChange={() => {
                      setSpeed(s);
                      if (video) video.playbackRate = s;
                    }}
                  />
                  {s}×
                </label>
              ))}
            </div>
          </fieldset>
          {subtitleTracks.length > 0 ? (
            <fieldset>
              <legend className="eyebrow mb-2">{t('subtitles')}</legend>
              {[{ index: -1, label: t('subtitlesOff') }, ...subtitleTracks].map((track) => (
                <label key={track.index} className="flex min-h-9 cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="subtitles"
                    checked={subtitle === track.index}
                    onChange={() => {
                      setSubtitle(track.index);
                      onSubtitle(track.index);
                    }}
                  />
                  {track.label}
                </label>
              ))}
            </fieldset>
          ) : null}
        </div>
      ) : null}
      <div className="bg-[var(--player-bg)] px-2 pb-1 pt-2">
        <label className="sr-only" htmlFor="ecine-seek">
          {t('seek')}
        </label>
        <input
          id="ecine-seek"
          type="range"
          min={0}
          max={duration || 0}
          step={1}
          value={Math.floor(time)}
          onChange={(e) => {
            if (video) video.currentTime = Number(e.target.value);
          }}
          aria-valuetext={`${formatTimecode(time)} / ${formatTimecode(duration)}, ${t('buffered', { time: formatTimecode(loadedUntil) })}`}
          className="block h-6 w-full accent-[var(--accent)]"
        />
        {/* Partie déjà chargée (tampon) : rassure quand le réseau ralentit. Décoratif, lu via aria-valuetext. */}
        <div aria-hidden="true" className="relative mx-1 h-[3px] bg-[var(--player-track)]">
          <div
            className="absolute inset-y-0 left-0 bg-[var(--player-buffered)]"
            style={{ width: `${percent(loadedUntil)}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 bg-[var(--accent)]"
            style={{ width: `${percent(time)}%` }}
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={BUTTON}
            onClick={() => (video?.paused ? void video.play() : video?.pause())}
            aria-label={paused ? t('play') : t('pause')}
          >
            <Icon name={paused ? 'play' : 'pause'} filled />
          </button>
          <button
            type="button"
            className={BUTTON}
            onClick={() => video && (video.currentTime = Math.max(0, video.currentTime - 10))}
            aria-label={t('back10')}
          >
            <Icon name="back10" />
          </button>
          <button
            type="button"
            className={BUTTON}
            onClick={() => video && (video.currentTime += 10)}
            aria-label={t('forward10')}
          >
            <Icon name="forward10" />
          </button>
          <button
            type="button"
            className={BUTTON}
            onClick={() => video && (video.muted = !video.muted)}
            aria-label={muted ? t('unmute') : t('mute')}
            aria-pressed={muted}
          >
            <Icon name={muted ? 'volumeOff' : 'volume'} />
          </button>
          <span className="ml-2 whitespace-nowrap font-mono text-xs tabular-nums">
            {formatTimecode(time)} / {formatTimecode(duration)}
          </span>
          <span className="flex-1" />
          {playingHeight ? (
            <span
              className="hidden whitespace-nowrap font-mono text-xs tabular-nums md:inline"
              aria-hidden="true"
            >
              {currentLevel === -1 ? t('autoWith', { height: playingHeight }) : `${playingHeight}p`}
            </span>
          ) : null}
          <button
            type="button"
            className={BUTTON}
            onClick={() => {
              setMenuMaxHeight(menuHeightFor(containerRef.current));
              setMenuOpen((v) => !v);
            }}
            aria-expanded={menuOpen}
            aria-label={`${t('quality')}, ${t('speed')}`}
          >
            <Icon name="settings" />
          </button>
          <button
            type="button"
            className={BUTTON}
            onClick={() => void toggleFullscreen(containerRef.current)}
            aria-label={fullscreen ? t('exitFullscreen') : t('fullscreen')}
          >
            <Icon name={fullscreen ? 'exitFullscreen' : 'fullscreen'} />
          </button>
        </div>
        <p className="sr-only">{t('shortcuts')}</p>
      </div>
    </div>
  );
}
