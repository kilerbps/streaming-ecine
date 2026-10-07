'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Icon } from '@/components/ui/icon';
import { formatTimecode } from '@/lib/format';
import { toggleFullscreen } from './fullscreen';
import type { QualityLevel } from './use-hls';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const HIDE_AFTER_MS = 3000;
const BUTTON =
  'grid size-11 shrink-0 place-items-center hover:bg-[var(--player-fg)] hover:text-[var(--player-bg)]';

/** Commandes du lecteur sur un bandeau plein (jamais de voile ni de dégradé sur l'image). */
export function PlayerControls({
  videoRef,
  containerRef,
  levels,
  currentLevel,
  onQuality,
  subtitleTracks,
  onSubtitle,
  errorMessage,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  levels: QualityLevel[];
  currentLevel: number;
  onQuality: (index: number) => void;
  subtitleTracks: Array<{ index: number; label: string }>;
  onSubtitle: (index: number) => void;
  errorMessage: string | null;
}) {
  const t = useTranslations('player');
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
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
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    };
    const events = [
      'play',
      'pause',
      'timeupdate',
      'durationchange',
      'volumechange',
      'loadedmetadata',
    ] as const;
    events.forEach((e) => video.addEventListener(e, sync));
    const onFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreen);
    sync();
    return () => {
      events.forEach((e) => video.removeEventListener(e, sync));
      document.removeEventListener('fullscreenchange', onFullscreen);
    };
  }, [videoRef]);

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
        <div className="absolute bottom-full right-2 mb-2 w-64 max-w-[calc(100%-16px)] border border-[var(--player-fg)] bg-[var(--player-bg)] p-4 text-sm">
          {levels.length > 0 ? (
            <fieldset className="mb-4">
              <legend className="eyebrow mb-2">{t('quality')}</legend>
              {[{ index: -1, height: 0 }, ...levels].map((level) => (
                <label key={level.index} className="flex min-h-9 cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="quality"
                    checked={currentLevel === level.index}
                    onChange={() => onQuality(level.index)}
                  />
                  {level.index === -1 ? t('auto') : `${level.height}p`}
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
          aria-valuetext={`${formatTimecode(time)} / ${formatTimecode(duration)}`}
          className="block h-6 w-full accent-[var(--accent)]"
        />
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
          <span className="ml-2 font-mono text-xs tabular-nums">
            {formatTimecode(time)} / {formatTimecode(duration)}
          </span>
          <span className="flex-1" />
          <button
            type="button"
            className={BUTTON}
            onClick={() => setMenuOpen((v) => !v)}
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
