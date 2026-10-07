'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type Hls from 'hls.js';
import { PLAYBACK_TOKEN_PARAM } from '@ecine/contracts';
import { refreshPlaybackAction, startPlaybackAction } from '@/server/actions/interactions';

export interface QualityLevel {
  index: number;
  height: number;
}

export type PlaybackError = 'unavailable' | 'network' | 'generic';

function withToken(url: string, token: string): string {
  const target = new URL(url);
  target.searchParams.set(PLAYBACK_TOKEN_PARAM, token);
  return target.toString();
}

/** Renouvelle le jeton une minute avant son expiration (jetons ≤ 5 min, docs/06 §6). */
const REFRESH_MARGIN_MS = 60_000;

/**
 * Session de lecture HLS sécurisée : ouverture via Server Action, jeton injecté dans chaque requête
 * du lecteur (playlists, clé, segments), renouvellement silencieux, reprise après erreur réseau.
 */
export function useHlsPlayback(videoId: string, options: { saveData: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const tokenRef = useRef<string>('');
  const manifestRef = useRef<string>('');
  const refreshTimer = useRef<number | undefined>(undefined);
  const scheduleRef = useRef<(expiresAt: string) => void>(() => undefined);
  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
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
        const result = await refreshPlaybackAction(videoId, tokenRef.current);
        if (result.ok) {
          tokenRef.current = result.data.token;
          scheduleRef.current(result.data.expiresAt);
        }
      }, delay);
    },
    [videoId],
  );
  useEffect(() => {
    scheduleRef.current = scheduleRefresh;
  }, [scheduleRefresh]);

  const start = useCallback(
    async (startAt: number): Promise<boolean> => {
      setError(null);
      const video = videoRef.current;
      if (!video) return false;
      const session = await startPlaybackAction(videoId);
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
        const hls = new HlsClass({
          // Qualité de départ basse (réseaux variables), montée automatique ensuite.
          startLevel: 0,
          capLevelToPlayerSize: true,
          maxBufferLength: options.saveData ? 12 : 30,
          maxMaxBufferLength: options.saveData ? 30 : 90,
          xhrSetup: (xhr, url) => {
            xhr.open('GET', withToken(url, tokenRef.current), true);
          },
        });
        hlsRef.current = hls;
        hls.on(HlsClass.Events.MANIFEST_PARSED, (_event, data) => {
          const list = data.levels
            .map((level, index) => ({ index, height: level.height }))
            .sort((a, b) => b.height - a.height);
          setLevels(list);
          if (options.saveData) {
            const capped = data.levels.findLastIndex((level) => level.height <= 360);
            hls.autoLevelCapping = capped >= 0 ? capped : 0;
          }
          if (startAt > 0) video.currentTime = startAt;
          void video.play().catch(() => undefined);
        });
        hls.on(HlsClass.Events.LEVEL_SWITCHED, (_event, data) =>
          setCurrentLevel(hls.autoLevelEnabled ? -1 : data.level),
        );
        hls.on(HlsClass.Events.SUBTITLE_TRACKS_UPDATED, (_event, data) =>
          setSubtitleTracks(
            data.subtitleTracks.map((track, index) => ({
              index,
              label: track.name || track.lang || `Piste ${index + 1}`,
            })),
          ),
        );
        hls.on(HlsClass.Events.ERROR, async (_event, data) => {
          if (!data.fatal) return;
          if (data.type === HlsClass.ErrorTypes.NETWORK_ERROR) {
            // Jeton expiré ou coupure : renouvellement puis reprise du chargement.
            const refreshed = await refreshPlaybackAction(videoId, tokenRef.current);
            if (refreshed.ok) {
              tokenRef.current = refreshed.data.token;
              scheduleRefresh(refreshed.data.expiresAt);
              hls.startLoad();
            } else {
              setError(refreshed.code === 'not_found' ? 'unavailable' : 'network');
            }
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
    [videoId, options.saveData, scheduleRefresh],
  );

  /** HLS natif : après expiration du jeton, on recharge la source à la position courante. */
  const recoverNative = useCallback(async () => {
    const video = videoRef.current;
    if (!video || hlsRef.current) return;
    const result = await refreshPlaybackAction(videoId, tokenRef.current);
    if (!result.ok) {
      setError('network');
      return;
    }
    tokenRef.current = result.data.token;
    scheduleRefresh(result.data.expiresAt);
    const position = video.currentTime;
    video.src = withToken(manifestRef.current, result.data.token);
    video.addEventListener(
      'loadedmetadata',
      () => {
        video.currentTime = position;
        void video.play().catch(() => undefined);
      },
      { once: true },
    );
  }, [videoId, scheduleRefresh]);

  const setQuality = useCallback((index: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = index;
    setCurrentLevel(index);
  }, []);

  const setSubtitle = useCallback((index: number) => {
    if (hlsRef.current) hlsRef.current.subtitleTrack = index;
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(refreshTimer.current);
      hlsRef.current?.destroy();
      hlsRef.current = null;
    },
    [],
  );

  return {
    videoRef,
    start,
    recoverNative,
    levels,
    currentLevel,
    setQuality,
    subtitleTracks,
    setSubtitle,
    error,
  };
}
