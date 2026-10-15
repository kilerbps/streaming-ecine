'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type Hls from 'hls.js';
import { PLAYBACK_TOKEN_PARAM } from '@ecine/contracts';
import { refreshPlaybackAction, startPlaybackAction } from '@/server/actions/interactions';
import {
  ABR_FACTORS,
  bufferProfile,
  FRAGMENT_LOAD_POLICY,
  initialBandwidthEstimate,
  localStore,
  preferredLevelIndex,
  readConnection,
  readDeviceMemory,
  readQualityPreference,
  readSubtitlePreference,
  autoSubtitleIndex,
  readStoredEstimate,
  recoveryDelay,
  storeEstimate,
  storeQualityPreference,
  wantsSaveData,
} from './network';

export interface QualityLevel {
  index: number;
  height: number;
  /** Débit plafond annoncé par la playlist (bit/s) : sert à afficher la consommation. */
  bitrate: number;
}

export type PlaybackError = 'unavailable' | 'network' | 'generic';

function withToken(url: string, token: string): string {
  const target = new URL(url);
  target.searchParams.set(PLAYBACK_TOKEN_PARAM, token);
  return target.toString();
}

/** Renouvelle le jeton une minute avant son expiration (jetons ≤ 5 min, docs/06 §6). */
const REFRESH_MARGIN_MS = 60_000;
/** Nouvel essai de renouvellement programmé si le réseau manquait au moment prévu. */
const REFRESH_RETRY_MS = 15_000;
/** Fréquence d'enregistrement du débit mesuré (démarrage plus juste à la prochaine lecture). */
const SAVE_ESTIMATE_EVERY_MS = 15_000;

/** Attend le retour du réseau (événement `online`) ou la fin du délai, au premier des deux. */
function waitForNetwork(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      window.clearTimeout(timer);
      window.removeEventListener('online', done);
      resolve();
    };
    const timer = window.setTimeout(done, ms);
    window.addEventListener('online', done);
  });
}

/**
 * Session de lecture HLS sécurisée et adaptée aux réseaux instables : ouverture via Server Action,
 * jeton injecté dans chaque requête (playlists, clé, segments), renouvellement silencieux, débit de
 * départ estimé, tampon adapté à l'appareil, reprise automatique après une coupure.
 */
export function useHlsPlayback(
  videoId: string,
  options: {
    saveData: boolean;
    /** Langues parlées du film : les sous-titres de la langue préférée ne s'y ajoutent pas. */
    audioLanguages?: readonly string[];
    /** Aperçu automatique : session marquée (240p au plus, jamais comptée), toujours muet. */
    preview?: boolean;
  },
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const tokenRef = useRef<string>('');
  const manifestRef = useRef<string>('');
  const refreshTimer = useRef<number | undefined>(undefined);
  const scheduleRef = useRef<(expiresAt: string) => void>(() => undefined);
  const aliveRef = useRef(true);
  const recoveringRef = useRef(false);
  const lastEstimateSave = useRef(0);
  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [playingHeight, setPlayingHeight] = useState<number | null>(null);
  const [subtitleTracks, setSubtitleTracks] = useState<Array<{ index: number; label: string }>>([]);
  const [error, setError] = useState<PlaybackError | null>(null);

  const scheduleRefresh = useCallback(
    (expiresAt: string) => {
      window.clearTimeout(refreshTimer.current);
      const delay = Math.max(
        10_000,
        new Date(expiresAt).getTime() - Date.now() - REFRESH_MARGIN_MS,
      );
      refreshTimer.current = window.setTimeout(async () => {
        try {
          const result = await refreshPlaybackAction(videoId, tokenRef.current);
          if (result.ok) {
            tokenRef.current = result.data.token;
            scheduleRef.current(result.data.expiresAt);
            return;
          }
        } catch {
          // Réseau absent au moment du renouvellement : on retente un peu plus tard.
        }
        refreshTimer.current = window.setTimeout(
          () => scheduleRef.current(new Date(Date.now() + REFRESH_MARGIN_MS).toISOString()),
          REFRESH_RETRY_MS,
        );
      }, delay);
    },
    [videoId],
  );
  useEffect(() => {
    scheduleRef.current = scheduleRefresh;
  }, [scheduleRefresh]);

  /**
   * Nouveau jeton après une coupure : renouvellement, sinon nouvelle session (jeton trop ancien).
   * `retry` = réseau absent ou limite atteinte ; `gone` = film retiré ou dépublié.
   */
  const renewToken = useCallback(async (): Promise<'ok' | 'gone' | 'retry'> => {
    try {
      const refreshed = await refreshPlaybackAction(videoId, tokenRef.current);
      if (refreshed.ok) {
        tokenRef.current = refreshed.data.token;
        scheduleRefresh(refreshed.data.expiresAt);
        return 'ok';
      }
      if (refreshed.code === 'not_found') return 'gone';
      if (refreshed.code === 'rate') return 'retry';
      const session = await startPlaybackAction(videoId, options.preview);
      if (session.ok) {
        tokenRef.current = session.data.token;
        scheduleRefresh(session.data.expiresAt);
        return 'ok';
      }
      return session.code === 'not_found' ? 'gone' : 'retry';
    } catch {
      // Server Action injoignable : pas de réseau.
      return 'retry';
    }
  }, [videoId, options.preview, scheduleRefresh]);

  /** HLS natif (anciens Safari iOS) : la source est rechargée à la position courante. */
  const reloadNative = useCallback(() => {
    const video = videoRef.current;
    if (!video || !manifestRef.current) return;
    const position = video.currentTime;
    video.src = withToken(manifestRef.current, tokenRef.current);
    video.addEventListener(
      'loadedmetadata',
      () => {
        video.currentTime = position;
        void video.play().catch(() => undefined);
      },
      { once: true },
    );
  }, []);

  /**
   * Reprise après une coupure : tant que le lecteur est affiché, on retente (3 s, 6 s, 12 s… 30 s)
   * ou dès que le téléphone retrouve le réseau. Le message « connexion trop faible » reste affiché
   * pendant ce temps et disparaît à la reprise.
   */
  const recover = useCallback(async () => {
    if (recoveringRef.current) return;
    recoveringRef.current = true;
    try {
      for (let attempt = 0; aliveRef.current; attempt += 1) {
        const outcome = await renewToken();
        if (!aliveRef.current) return;
        if (outcome === 'gone') {
          setError('unavailable');
          return;
        }
        if (outcome === 'ok') {
          setError(null);
          if (hlsRef.current) hlsRef.current.startLoad();
          else reloadNative();
          return;
        }
        setError('network');
        await waitForNetwork(recoveryDelay(attempt));
      }
    } finally {
      recoveringRef.current = false;
    }
  }, [renewToken, reloadNative]);

  const start = useCallback(
    async (startAt: number): Promise<boolean> => {
      setError(null);
      const video = videoRef.current;
      if (!video) return false;
      let session: Awaited<ReturnType<typeof startPlaybackAction>>;
      try {
        session = await startPlaybackAction(videoId, options.preview);
      } catch {
        setError('network');
        return false;
      }
      if (!session.ok) {
        setError(
          session.code === 'not_found'
            ? 'unavailable'
            : session.code === 'rate'
              ? 'network'
              : 'generic',
        );
        return false;
      }
      tokenRef.current = session.data.token;
      manifestRef.current = session.data.manifestUrl;
      scheduleRefresh(session.data.expiresAt);

      const { default: HlsClass } = await import('hls.js');
      if (HlsClass.isSupported()) {
        const store = localStore();
        const connection = readConnection();
        const saveData = wantsSaveData(options.saveData, connection);
        const hls = new HlsClass({
          // Démarrage selon le réseau mesuré (ou la plus basse qualité en économie de données),
          // puis adaptation continue : monter prudemment, descendre vite.
          startLevel: saveData ? 0 : -1,
          abrEwmaDefaultEstimate: initialBandwidthEstimate(
            connection,
            readStoredEstimate(store),
            Date.now(),
          ),
          ...ABR_FACTORS,
          capLevelToPlayerSize: true,
          ...bufferProfile(saveData, readDeviceMemory()),
          fragLoadPolicy: FRAGMENT_LOAD_POLICY,
          xhrSetup: (xhr, url) => {
            xhr.open('GET', withToken(url, tokenRef.current), true);
          },
        });
        hlsRef.current = hls;
        hls.on(HlsClass.Events.MANIFEST_PARSED, (_event, data) => {
          const list = data.levels
            .map((level, index) => ({ index, height: level.height, bitrate: level.bitrate }))
            .sort((a, b) => b.height - a.height);
          setLevels(list);
          if (saveData) {
            const capped = data.levels.findLastIndex((level) => level.height <= 360);
            hls.autoLevelCapping = capped >= 0 ? capped : 0;
          }
          // Qualité choisie à la main lors d'une lecture précédente : appliquée dès le départ.
          const preferred = readQualityPreference(store);
          if (preferred !== null) {
            const index = preferredLevelIndex(data.levels, preferred);
            if (index >= 0) {
              hls.loadLevel = index;
              setCurrentLevel(index);
            }
          }
          if (startAt > 0) video.currentTime = startAt;
          void video.play().catch(() => undefined);
        });
        hls.on(HlsClass.Events.LEVEL_SWITCHED, (_event, data) => {
          setPlayingHeight(hls.levels[data.level]?.height ?? null);
          setCurrentLevel(hls.autoLevelEnabled ? -1 : data.level);
        });
        hls.on(HlsClass.Events.FRAG_LOADED, () => {
          const now = Date.now();
          if (now - lastEstimateSave.current >= SAVE_ESTIMATE_EVERY_MS) {
            lastEstimateSave.current = now;
            storeEstimate(store, hls.bandwidthEstimate, now);
          }
        });
        hls.on(HlsClass.Events.SUBTITLE_TRACKS_UPDATED, (_event, data) => {
          setSubtitleTracks(
            data.subtitleTracks.map((track, index) => ({
              index,
              label: track.name || track.lang || `Piste ${index + 1}`,
            })),
          );
          // Réglages → Sous-titres : langue par défaut, si le film n'est pas déjà dans cette langue.
          const auto = autoSubtitleIndex(
            data.subtitleTracks,
            readSubtitlePreference(store).lang,
            options.audioLanguages ?? [],
          );
          if (auto >= 0 && !options.preview) hls.subtitleTrack = auto;
        });
        hls.on(HlsClass.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;
          if (data.type === HlsClass.ErrorTypes.NETWORK_ERROR) {
            // Les nouveaux essais de hls.js sont épuisés : coupure longue ou jeton expiré.
            void recover();
          } else if (data.type === HlsClass.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            setError('generic');
          }
        });
        hls.loadSource(withToken(session.data.manifestUrl, session.data.token));
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari iOS ancien : HLS natif, le jeton est porté par les URLs réécrites par l'API.
        video.src = withToken(session.data.manifestUrl, session.data.token);
        video.addEventListener(
          'loadedmetadata',
          () => {
            if (startAt > 0) video.currentTime = startAt;
            void video.play().catch(() => undefined);
          },
          { once: true },
        );
      } else {
        setError('generic');
        return false;
      }
      return true;
    },
    [videoId, options.saveData, options.audioLanguages, options.preview, scheduleRefresh, recover],
  );

  /** Erreur de l'élément vidéo en HLS natif (jeton expiré, coupure) : même reprise que hls.js. */
  const recoverNative = useCallback(() => {
    if (!hlsRef.current) void recover();
  }, [recover]);

  /** Changement sans coupure : la lecture continue pendant que la nouvelle qualité arrive. */
  const setQuality = useCallback(
    (index: number) => {
      const hls = hlsRef.current;
      if (!hls) return;
      hls.nextLevel = index;
      setCurrentLevel(index);
      storeQualityPreference(
        localStore(),
        index === -1 ? null : (levels.find((l) => l.index === index)?.height ?? null),
      );
    },
    [levels],
  );

  const setSubtitle = useCallback((index: number) => {
    if (hlsRef.current) hlsRef.current.subtitleTrack = index;
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      window.clearTimeout(refreshTimer.current);
      const hls = hlsRef.current;
      if (hls) storeEstimate(localStore(), hls.bandwidthEstimate, Date.now());
      hls?.destroy();
      hlsRef.current = null;
    };
  }, []);

  return {
    videoRef,
    start,
    recoverNative,
    levels,
    currentLevel,
    playingHeight,
    setQuality,
    subtitleTracks,
    setSubtitle,
    error,
  };
}
