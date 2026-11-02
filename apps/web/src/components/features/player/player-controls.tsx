'use client';

import { useFormatter, useTranslations } from 'next-intl';
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import { Icon, type IconName } from '@/components/ui/icon';
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
const BUTTON =
  'grid size-11 shrink-0 place-items-center rounded-full transition-colors hover:bg-[var(--player-track)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--player-fg)]';

const percentOf = (value: number, duration: number) =>
  duration > 0 ? Math.min(100, Math.max(0, (value / duration) * 100)) : 0;

/**
 * Piste de progression unique (docs/design/04, Lecteur v2) : partie chargée et partie lue dans la
 * même piste de 4 px, 8 px au survol et au glissement, curseur de 16 px et heure visée. Le
 * `input type=range` natif, transparent par-dessus, garde le clavier et les lecteurs d'écran. Au
 * glissement, la vidéo n'est déplacée qu'au relâchement : pas une recherche par pixel (réseau lent).
 */
function SeekBar({
  time,
  duration,
  loadedUntil,
  onSeek,
}: {
  time: number;
  duration: number;
  loadedUntil: number;
  onSeek: (seconds: number) => void;
}) {
  const t = useTranslations('player');
  const [scrub, setScrub] = useState<number | null>(null);
  const shown = scrub ?? time;
  const played = percentOf(shown, duration);
  const loaded = Math.max(played, percentOf(loadedUntil, duration));
  const commit = (value: number) => {
    setScrub(null);
    onSeek(value);
  };
  const endScrub = (event: ReactPointerEvent<HTMLInputElement>) => {
    if (scrub !== null) commit(Number(event.currentTarget.value));
  };
  const active = scrub !== null;

  return (
    <div className="group/seek relative flex h-8 min-w-0 flex-1 items-center">
      <div
        aria-hidden="true"
        className={`relative w-full overflow-hidden rounded-full bg-[var(--player-track)] transition-[height] duration-150 ${active ? 'h-2' : 'h-1 group-hover/seek:h-2'}`}
      >
        <div
          className="absolute inset-y-0 left-0 bg-[var(--player-buffered)]"
          style={{ width: `${loaded}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 bg-[var(--player-played)]"
          style={{ width: `${played}%` }}
        />
      </div>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--player-played)] transition-transform duration-150 ${active ? 'scale-100' : 'scale-100 md:scale-0 md:group-hover/seek:scale-100'}`}
        style={{ left: `${played}%` }}
      />
      {active ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-full mb-1 -translate-x-1/2 rounded-sm bg-[var(--player-bg)] px-2 py-1 font-mono text-xs tabular-nums"
          style={{ left: `clamp(24px, ${played}%, calc(100% - 24px))` }}
        >
          {formatTimecode(shown)}
        </span>
      ) : null}
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={1}
        value={Math.floor(shown)}
        aria-label={t('seek')}
        aria-valuetext={`${formatTimecode(shown)} / ${formatTimecode(duration)}, ${t('buffered', { time: formatTimecode(loadedUntil) })}`}
        onPointerDown={() => setScrub(time)}
        onChange={(e) => {
          const value = Number(e.target.value);
          // Glissement : aperçu seulement ; clavier : déplacement immédiat.
          if (scrub !== null) setScrub(value);
          else onSeek(value);
        }}
        onPointerUp={endScrub}
        onPointerCancel={endScrub}
        onBlur={() => scrub !== null && commit(scrub)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  );
}

type MenuView = 'main' | 'quality' | 'speed' | 'subtitles';

/** Ligne de 48 px : réglage (valeur + chevron) ou choix (coche). */
function MenuRow({
  icon,
  label,
  value,
  detail,
  checked,
  onClick,
  autoFocus,
  role,
}: {
  icon?: IconName;
  label: string;
  value?: string;
  detail?: string;
  checked?: boolean;
  onClick: () => void;
  autoFocus?: boolean;
  role?: 'radio';
}) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);
  return (
    <button
      ref={ref}
      type="button"
      role={role}
      aria-checked={role === 'radio' ? Boolean(checked) : undefined}
      onClick={onClick}
      className="flex min-h-12 w-full items-center gap-3 px-4 text-left text-[15px] transition-colors hover:bg-[var(--player-track)] focus-visible:bg-[var(--player-track)] focus-visible:outline-none"
    >
      {role === 'radio' ? (
        <span className="grid size-5 shrink-0 place-items-center">
          {checked ? <Icon name="check" size={20} /> : null}
        </span>
      ) : icon ? (
        <Icon name={icon} size={20} className="shrink-0" />
      ) : null}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {detail ? (
        <span className="shrink-0 font-mono text-xs tabular-nums opacity-70">{detail}</span>
      ) : null}
      {value !== undefined ? (
        <>
          <span className="shrink-0 truncate text-sm opacity-70">{value}</span>
          <Icon name="chevronRight" size={18} className="shrink-0 opacity-70" />
        </>
      ) : null}
    </button>
  );
}

/**
 * Réglages du lecteur : menu à deux niveaux (Qualité, Vitesse, Sous-titres, puis le choix coché),
 * lignes de 48 px. PC : panneau sous le bouton ; mobile : feuille en bas de l'écran.
 */
function SettingsMenu({
  levels,
  currentLevel,
  playingHeight,
  onQuality,
  speed,
  onSpeed,
  subtitleTracks,
  subtitle,
  onSubtitle,
  onClose,
}: {
  levels: QualityLevel[];
  currentLevel: number;
  playingHeight: number | null;
  onQuality: (index: number) => void;
  speed: number;
  onSpeed: (speed: number) => void;
  subtitleTracks: Array<{ index: number; label: string }>;
  subtitle: number;
  onSubtitle: (index: number) => void;
  onClose: () => void;
}) {
  const t = useTranslations('player');
  const tc = useTranslations('common');
  const format = useFormatter();
  const [view, setView] = useState<MenuView>('main');
  const speedLabel = (s: number) => (s === 1 ? t('speedNormal') : `${format.number(s)}×`);
  const qualityLabel =
    currentLevel === -1
      ? playingHeight
        ? t('autoWith', { height: playingHeight })
        : t('auto')
      : `${levels.find((l) => l.index === currentLevel)?.height ?? playingHeight ?? ''}p`;
  const subtitleLabel =
    subtitleTracks.find((s) => s.index === subtitle)?.label ?? t('subtitlesOff');
  const choose = (apply: () => void) => {
    apply();
    setView('main');
  };
  const title =
    view === 'quality'
      ? t('quality')
      : view === 'speed'
        ? t('speed')
        : view === 'subtitles'
          ? t('subtitles')
          : t('settings');

  return (
    <>
      {/* Toucher à côté ferme le menu (voile sur mobile, transparent sur PC). */}
      <button
        type="button"
        aria-label={tc('close')}
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-[var(--overlay)] md:absolute md:bg-transparent"
      />
      <div
        role="dialog"
        aria-label={title}
        onKeyDown={(e) => {
          if (e.key !== 'Escape') return;
          e.stopPropagation();
          if (view === 'main') onClose();
          else setView('main');
        }}
        className="fixed inset-x-0 bottom-0 z-50 max-h-[70dvh] overflow-y-auto rounded-t-xl bg-[var(--player-bg)] pb-[calc(0.5rem+env(safe-area-inset-bottom))] text-[var(--player-fg)] md:absolute md:inset-x-auto md:bottom-auto md:right-3 md:top-14 md:max-h-[calc(100%-72px)] md:w-80 md:rounded-lg md:border md:border-[var(--player-track)] md:pb-2"
      >
        <div
          aria-hidden="true"
          className="mx-auto mt-2 h-[5px] w-9 rounded-full bg-[var(--player-track)] md:hidden"
        />
        <div className="flex min-h-12 items-center gap-1 border-b border-[var(--player-track)] px-1">
          {view !== 'main' ? (
            <button
              type="button"
              className={BUTTON}
              onClick={() => setView('main')}
              aria-label={t('settingsBack')}
            >
              <Icon name="chevronLeft" />
            </button>
          ) : (
            <span className="w-3" />
          )}
          <p className="flex-1 text-[15px] font-semibold">{title}</p>
          <button
            type="button"
            className={`${BUTTON} md:hidden`}
            onClick={onClose}
            aria-label={tc('close')}
          >
            <Icon name="close" />
          </button>
        </div>

        {view === 'main' ? (
          <div className="py-1">
            {levels.length > 0 ? (
              <MenuRow
                icon="settings"
                label={t('quality')}
                value={qualityLabel}
                onClick={() => setView('quality')}
                autoFocus
              />
            ) : null}
            <MenuRow
              icon="clock"
              label={t('speed')}
              value={speedLabel(speed)}
              onClick={() => setView('speed')}
              autoFocus={levels.length === 0}
            />
            {subtitleTracks.length > 0 ? (
              <MenuRow
                icon="captions"
                label={t('subtitles')}
                value={subtitleLabel}
                onClick={() => setView('subtitles')}
              />
            ) : null}
          </div>
        ) : null}

        {view === 'quality' ? (
          <div role="radiogroup" aria-label={t('quality')} className="py-1">
            <p className="px-4 pb-1 pt-2 text-xs opacity-70">{t('dataHint')}</p>
            {[{ index: -1, height: 0, bitrate: 0 }, ...levels].map((level, i) => (
              <MenuRow
                key={level.index}
                role="radio"
                checked={currentLevel === level.index}
                label={
                  level.index === -1
                    ? playingHeight && currentLevel === -1
                      ? t('autoWith', { height: playingHeight })
                      : t('auto')
                    : `${level.height}p`
                }
                detail={level.bitrate > 0 ? formatDataPerHour(level.bitrate) : undefined}
                onClick={() => choose(() => onQuality(level.index))}
                autoFocus={i === 0}
              />
            ))}
          </div>
        ) : null}

        {view === 'speed' ? (
          <div role="radiogroup" aria-label={t('speed')} className="py-1">
            {SPEEDS.map((s, i) => (
              <MenuRow
                key={s}
                role="radio"
                checked={speed === s}
                label={speedLabel(s)}
                onClick={() => choose(() => onSpeed(s))}
                autoFocus={i === 0}
              />
            ))}
          </div>
        ) : null}

        {view === 'subtitles' ? (
          <div role="radiogroup" aria-label={t('subtitles')} className="py-1">
            {[{ index: -1, label: t('subtitlesOff') }, ...subtitleTracks].map((track, i) => (
              <MenuRow
                key={track.index}
                role="radio"
                checked={subtitle === track.index}
                label={track.label}
                onClick={() => choose(() => onSubtitle(track.index))}
                autoFocus={i === 0}
              />
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}

/**
 * Commandes du lecteur v2 (docs/design/04) posées sur l'image : en haut le titre, le son, les
 * réglages et le plein écran ; au centre −10 s, lecture/pause, +10 s ; en bas le temps et la
 * progression. Les voiles haut et bas n'apparaissent qu'avec les commandes (D-01).
 */
export function PlayerControls({
  videoRef,
  containerRef,
  title,
  buffering,
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
  title: string;
  /** Chargement en cours : le centre laisse la place au message du lecteur. */
  buffering: boolean;
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
  const [paused, setPaused] = useState(false);
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
  const togglePlay = () => (video?.paused ? void video.play() : video?.pause());
  const seekTo = (seconds: number) => {
    if (video) video.currentTime = Math.min(Math.max(0, seconds), duration || seconds);
  };

  return (
    <div
      className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-200 ${shown ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
    >
      {/* Fond : un clic de souris lance ou met en pause ; un toucher masque les commandes. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        onPointerUp={(e) => {
          if (e.pointerType === 'mouse') togglePlay();
          else {
            window.clearTimeout(hideTimer.current);
            setVisible(false);
          }
        }}
      />

      <div className="relative flex items-center gap-1 bg-[image:var(--scrim-top)] px-2 pb-6 pt-2 md:px-4 md:pt-3">
        <p className="min-w-0 flex-1 truncate px-2 text-[15px] font-semibold md:text-[17px]">
          {title}
        </p>
        <button
          type="button"
          className={BUTTON}
          onClick={() => video && (video.muted = !video.muted)}
          aria-label={muted ? t('unmute') : t('mute')}
          aria-pressed={muted}
        >
          <Icon name={muted ? 'volumeOff' : 'volume'} size={26} />
        </button>
        <button
          type="button"
          className={BUTTON}
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-haspopup="dialog"
          aria-label={t('settings')}
        >
          <Icon name="settings" size={26} />
        </button>
        <button
          type="button"
          className={BUTTON}
          onClick={() => void toggleFullscreen(containerRef.current)}
          aria-label={fullscreen ? t('exitFullscreen') : t('fullscreen')}
        >
          <Icon name={fullscreen ? 'exitFullscreen' : 'fullscreen'} size={26} />
        </button>
      </div>

      <div
        className={`pointer-events-none relative flex items-center justify-center gap-8 md:gap-16 ${buffering ? 'invisible' : ''}`}
      >
        <button
          type="button"
          className={`${BUTTON} pointer-events-auto size-12`}
          onClick={() => seekTo((video?.currentTime ?? 0) - 10)}
          aria-label={t('back10')}
        >
          <Icon name="back10" size={30} />
        </button>
        <button
          type="button"
          className={`${BUTTON} pointer-events-auto size-16 bg-[var(--player-track)] md:size-20`}
          onClick={togglePlay}
          aria-label={paused ? t('play') : t('pause')}
        >
          <Icon name={paused ? 'play' : 'pause'} size={40} filled />
        </button>
        <button
          type="button"
          className={`${BUTTON} pointer-events-auto size-12`}
          onClick={() => seekTo((video?.currentTime ?? 0) + 10)}
          aria-label={t('forward10')}
        >
          <Icon name="forward10" size={30} />
        </button>
      </div>

      <div className="relative bg-[image:var(--scrim-bottom)] px-3 pb-2 pt-8 md:px-5 md:pb-4">
        {errorMessage ? (
          <p role="alert" className="mb-2 text-sm">
            {errorMessage}
          </p>
        ) : null}
        {playingHeight ? (
          <p
            className="mb-0.5 text-right font-mono text-xs tabular-nums opacity-80"
            aria-hidden="true"
          >
            {currentLevel === -1 ? t('autoWith', { height: playingHeight }) : `${playingHeight}p`}
          </p>
        ) : null}
        <div className="flex items-center gap-3">
          <span className="shrink-0 font-mono text-xs tabular-nums">{formatTimecode(time)}</span>
          <SeekBar time={time} duration={duration} loadedUntil={loadedUntil} onSeek={seekTo} />
          <span className="shrink-0 font-mono text-xs tabular-nums opacity-80">
            {formatTimecode(duration)}
          </span>
        </div>
        <p className="sr-only">{t('shortcuts')}</p>
      </div>

      {menuOpen ? (
        <SettingsMenu
          levels={levels}
          currentLevel={currentLevel}
          playingHeight={playingHeight}
          onQuality={onQuality}
          speed={speed}
          onSpeed={(s) => {
            setSpeed(s);
            if (video) video.playbackRate = s;
          }}
          subtitleTracks={subtitleTracks}
          subtitle={subtitle}
          onSubtitle={(index) => {
            setSubtitle(index);
            onSubtitle(index);
          }}
          onClose={() => setMenuOpen(false)}
        />
      ) : null}
    </div>
  );
}
