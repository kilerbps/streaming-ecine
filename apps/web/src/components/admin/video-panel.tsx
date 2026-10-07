'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { videoUploadInitSchema, type AdminFilm, type VideoStatus } from '@ecine/contracts';
import { useAuth } from '@/components/providers/auth';
import { usePreferences } from '@/components/providers/preferences';
import { useToast } from '@/components/providers/toast';
import { Button } from '@/components/ui/button';
import type { ActionResult } from '@/server/actions/result';
import {
  completeVideoUploadAction,
  deleteVideoAction,
  getVideoUploadAction,
  initVideoUploadAction,
  retryVideoAction,
  uploadVideoChunkAction,
  videoStatusAction,
} from '@/server/actions/admin/media';
import { VideoStateBadge } from './badges';
import { storageKeys } from './config';
import { ConfirmSheet } from './confirm-sheet';
import { useHydrated } from './drafts';
import { formatBytes, formatShort } from './format';
import { useAdminAction } from './use-admin-action';

type FilmVideo = AdminFilm['videos'][number];

/** Envoi en cours mémorisé sur l'appareil (aucun jeton : identifiant d'envoi + description du fichier). */
interface StoredUpload {
  uploadId: string;
  fileName: string;
  size: number;
  lastModified: number;
}

const MIME_BY_EXTENSION: Record<
  string,
  'video/mp4' | 'video/quicktime' | 'video/x-matroska' | 'video/webm'
> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  webm: 'video/webm',
};

function videoMime(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXTENSION[ext] ?? 'application/octet-stream';
}

function readStored(key: string): StoredUpload | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<StoredUpload>;
    return typeof value.uploadId === 'string' &&
      typeof value.fileName === 'string' &&
      typeof value.size === 'number'
      ? {
          uploadId: value.uploadId,
          fileName: value.fileName,
          size: value.size,
          lastModified: Number(value.lastModified) || 0,
        }
      : null;
  } catch {
    return null;
  }
}

function writeStored(key: string, value: StoredUpload | null): void {
  try {
    if (value) window.localStorage.setItem(key, JSON.stringify(value));
    else window.localStorage.removeItem(key);
  } catch {
    // Stockage indisponible : la reprise après rechargement ne sera pas proposée.
  }
}

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/** Appel réseau avec 3 nouvelles tentatives (1 s, 3 s, 6 s) si le serveur ne répond pas. */
async function withRetry<T>(call: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  const delays = [1000, 3000, 6000];
  for (let attempt = 0; ; attempt += 1) {
    try {
      const result = await call();
      const transient =
        !result.ok && result.code === 'unknown' && /ne répond pas/.test(result.error);
      if (!transient || attempt >= delays.length) return result;
    } catch {
      if (attempt >= delays.length)
        return { ok: false, code: 'unknown', error: 'Connexion perdue pendant l’envoi.' };
    }
    await wait(delays[attempt]!);
  }
}

type Phase = 'idle' | 'uploading' | 'paused' | 'finishing' | 'error' | 'done';

/**
 * Vidéo du film : envoi reprenable par morceaux de 3 Mio (pause, reprise, reprise après rechargement
 * en resélectionnant le même fichier), puis suivi du transcodage, relance et suppression.
 */
export function VideoPanel({
  filmId,
  videos,
  disabled = false,
}: {
  filmId: string;
  videos: FilmVideo[];
  disabled?: boolean;
}) {
  const key = storageKeys.upload(filmId);
  const inputId = useId();
  const router = useRouter();
  const toast = useToast();
  const { feedback } = usePreferences();
  const { sessionExpired } = useAuth();
  const hydrated = useHydrated();
  const [stored, setStored] = useState<StoredUpload | null>(() =>
    typeof window === 'undefined' ? null : readStored(key),
  );
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [sent, setSent] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const pauseRequested = useRef(false);

  const remember = (value: StoredUpload | null) => {
    writeStored(key, value);
    setStored(value);
  };

  const fail = (text: string) => {
    setPhase('error');
    setMessage(text);
    feedback('error');
    toast(text, 'error');
  };

  /** Envoie le fichier depuis la position connue du serveur (nouvel envoi ou reprise). */
  const upload = async (source: File) => {
    const init = videoUploadInitSchema.safeParse({
      filmId,
      fileName: source.name.slice(0, 255),
      bytes: source.size,
      mime: videoMime(source),
    });
    if (!init.success) {
      fail('Format refusé : MP4, MOV, MKV ou WebM uniquement (20 Go au plus).');
      return;
    }
    pauseRequested.current = false;
    setMessage(null);
    setPhase('uploading');

    // Reprise : même fichier (nom, taille, date) qu'un envoi interrompu → position renvoyée par le serveur.
    let uploadId: string | null = null;
    let chunkSize = 3 * 1024 * 1024;
    let offset = 0;
    const resumable =
      stored &&
      stored.fileName === source.name &&
      stored.size === source.size &&
      (!stored.lastModified || stored.lastModified === source.lastModified);
    if (resumable) {
      const state = await withRetry(() => getVideoUploadAction(stored.uploadId));
      if (state.ok) {
        uploadId = state.data.uploadId;
        chunkSize = state.data.chunkSize;
        offset = state.data.receivedBytes;
      } else if (state.code === 'auth') {
        setPhase('paused');
        sessionExpired();
        return;
      } else {
        remember(null);
      }
    }
    if (!uploadId) {
      const created = await withRetry(() => initVideoUploadAction(init.data));
      if (!created.ok) {
        if (created.code === 'auth') {
          setPhase('idle');
          sessionExpired();
          return;
        }
        fail(created.error);
        return;
      }
      uploadId = created.data.uploadId;
      chunkSize = created.data.chunkSize;
      offset = created.data.receivedBytes;
      remember({
        uploadId,
        fileName: source.name,
        size: source.size,
        lastModified: source.lastModified,
      });
    }
    const id = uploadId;
    setSent(offset);

    while (offset < source.size) {
      if (pauseRequested.current) {
        setPhase('paused');
        return;
      }
      const form = new FormData();
      form.set('chunk', source.slice(offset, Math.min(offset + chunkSize, source.size)));
      form.set('offset', String(offset));
      const result = await withRetry(() => uploadVideoChunkAction(id, form));
      if (result.ok) {
        offset = result.data.receivedBytes;
        setSent(offset);
        continue;
      }
      if (result.code === 'conflict') {
        // Position désynchronisée (morceau déjà reçu, autre onglet) : on reprend là où le serveur s'est arrêté.
        const state = await withRetry(() => getVideoUploadAction(id));
        if (state.ok && state.data.receivedBytes !== offset) {
          offset = state.data.receivedBytes;
          setSent(offset);
          continue;
        }
      }
      if (result.code === 'auth') {
        setPhase('paused');
        setMessage('Session expirée : reconnectez-vous, puis reprenez l’envoi.');
        sessionExpired();
        return;
      }
      if (
        result.code === 'not_found' ||
        (result.code === 'unknown' && /signature|valide/i.test(result.error))
      )
        remember(null);
      fail(result.error);
      return;
    }

    setPhase('finishing');
    const done = await withRetry(() => completeVideoUploadAction(id, filmId));
    if (!done.ok) {
      fail(done.error);
      return;
    }
    remember(null);
    setFile(null);
    setPhase('done');
    setMessage('Envoi terminé. Le transcodage commence : suivez son avancement ci-dessous.');
    feedback('success');
    toast('Vidéo envoyée : transcodage en cours.', 'success');
    router.refresh();
  };

  const total = file?.size ?? stored?.size ?? 0;
  const percent = total > 0 ? Math.min(100, Math.floor((sent / total) * 100)) : 0;
  const busy = phase === 'uploading' || phase === 'finishing';
  const matchesStored = Boolean(
    file && stored && stored.fileName === file.name && stored.size === file.size,
  );

  return (
    <section
      className="border border-border bg-surface-1 p-4 md:p-5"
      aria-labelledby={`${inputId}-title`}
    >
      <h2 id={`${inputId}-title`} className="font-serif text-xl">
        Vidéo du film
      </h2>
      <p className="mt-1 text-sm text-muted">
        MP4, MOV, MKV ou WebM. L’envoi peut être mis en pause et repris, même après une coupure.
      </p>

      {videos.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-3">
          {videos.map((video) => (
            <VideoRow key={video.id} video={video} filmId={filmId} />
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm">Aucune vidéo pour l’instant.</p>
      )}

      <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4">
        {hydrated && stored && !file && phase === 'idle' ? (
          <div role="status" className="border-l-2 border-highlight bg-bg px-3 py-2 text-sm">
            <p>
              Envoi interrompu : « {stored.fileName} » ({formatBytes(stored.size)}). Sélectionnez à
              nouveau ce fichier pour reprendre là où l’envoi s’est arrêté.
            </p>
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => remember(null)}>
              Abandonner cet envoi
            </Button>
          </div>
        ) : null}

        {!busy ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={inputId} className="text-sm font-medium">
              {videos.length > 0 ? 'Envoyer une nouvelle version' : 'Choisir le fichier vidéo'}
            </label>
            <input
              id={inputId}
              type="file"
              accept="video/mp4,video/quicktime,video/x-matroska,video/webm,.mkv,.mov,.mp4,.webm"
              disabled={disabled}
              onChange={(event) => {
                const selected = event.target.files?.[0] ?? null;
                setFile(selected);
                setSent(0);
                setMessage(null);
                setPhase('idle');
              }}
              className="text-sm file:mr-3 file:min-h-11 file:border file:border-border-strong file:bg-transparent file:px-4 file:text-text hover:file:bg-surface-2"
            />
          </div>
        ) : null}

        {file && phase !== 'done' ? (
          <p className="meta normal-case">
            {file.name} · {formatBytes(file.size)}
          </p>
        ) : null}

        {phase !== 'idle' && phase !== 'done' ? (
          <div>
            <div
              role="progressbar"
              aria-label="Progression de l’envoi"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              className="h-2 w-full bg-surface-2"
            >
              <div className="h-full bg-accent" style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-2 flex justify-between text-sm">
              <span>
                {phase === 'uploading'
                  ? 'Envoi en cours…'
                  : phase === 'finishing'
                    ? 'Finalisation…'
                    : phase === 'paused'
                      ? 'En pause'
                      : 'Interrompu'}
              </span>
              <span className="font-mono">
                {percent} % · {formatBytes(sent)} / {formatBytes(total)}
              </span>
            </p>
          </div>
        ) : null}

        {message ? (
          <p
            className={`text-sm ${phase === 'error' ? 'text-danger' : 'text-muted'}`}
            role={phase === 'error' ? 'alert' : 'status'}
          >
            {message}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {file && (phase === 'idle' || phase === 'paused' || phase === 'error') ? (
            <Button
              variant="secondary"
              icon="upload"
              disabled={disabled}
              onClick={() => void upload(file)}
            >
              {phase === 'idle' && !matchesStored ? 'Envoyer la vidéo' : 'Reprendre l’envoi'}
            </Button>
          ) : null}
          {phase === 'uploading' ? (
            <Button
              variant="ghost"
              icon="pause"
              onClick={() => {
                pauseRequested.current = true;
                setMessage('Pause après le morceau en cours…');
              }}
            >
              Mettre en pause
            </Button>
          ) : null}
        </div>
        {busy ? (
          <p className="text-sm text-muted">Gardez cet onglet ouvert pendant l’envoi.</p>
        ) : null}
      </div>
    </section>
  );
}

/** Une vidéo : état, suivi du transcodage toutes les 3 s, relance si échec, suppression confirmée. */
function VideoRow({ video, filmId }: { video: FilmVideo; filmId: string }) {
  const router = useRouter();
  const { run, pending } = useAdminAction();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [source, setSource] = useState(video);
  const [status, setStatus] = useState<VideoStatus>({
    id: video.id,
    state: video.state,
    progress: null,
    error: video.error,
  });
  if (source !== video) {
    setSource(video);
    setStatus({ id: video.id, state: video.state, progress: null, error: video.error });
  }
  const active = status.state === 'PENDING' || status.state === 'PROCESSING';

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let busy = false;
    const timer = window.setInterval(() => {
      if (busy) return;
      busy = true;
      void videoStatusAction(video.id)
        .then((result) => {
          if (cancelled || !result.ok) return;
          setStatus(result.data);
          if (result.data.state === 'READY' || result.data.state === 'FAILED') router.refresh();
        })
        .catch(() => undefined)
        .finally(() => {
          busy = false;
        });
    }, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [active, video.id, router]);

  const retryable =
    status.state === 'FAILED' || (status.state === 'PENDING' && Boolean(status.error));

  return (
    <li className="border border-border bg-bg p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <VideoStateBadge state={status.state} />
        <span className="meta">
          <time dateTime={video.createdAt} suppressHydrationWarning>
            {formatShort(video.createdAt)}
          </time>
          {video.durationSec ? ` · ${Math.round(video.durationSec / 60)} min` : ''}
        </span>
      </div>
      {status.state === 'PROCESSING' ? (
        <div className="mt-3">
          <div
            role="progressbar"
            aria-label="Avancement du transcodage"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={status.progress ?? 0}
            className="h-2 bg-surface-2"
          >
            <div className="h-full bg-accent" style={{ width: `${status.progress ?? 0}%` }} />
          </div>
          <p className="mt-1 text-sm text-muted">
            Transcodage : {Math.round(status.progress ?? 0)} %
          </p>
        </div>
      ) : null}
      {status.state === 'PENDING' && !status.error ? (
        <p className="mt-2 text-sm text-muted">En file d’attente pour le transcodage…</p>
      ) : null}
      {status.error ? (
        <p className="mt-2 text-sm text-danger" role="alert">
          {status.error}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {retryable ? (
          <Button
            size="sm"
            variant="secondary"
            icon="refresh"
            pending={pending}
            onClick={() =>
              run(() => retryVideoAction(video.id, filmId), {
                success: 'Transcodage relancé.',
                onSuccess: (next) => setStatus(next),
              })
            }
          >
            Relancer le transcodage
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="danger"
          icon="trash"
          disabled={status.state === 'PROCESSING'}
          onClick={() => setConfirmOpen(true)}
        >
          Supprimer la vidéo
        </Button>
      </div>
      <ConfirmSheet
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Supprimer cette vidéo ?"
        description="Les fichiers et la clé de chiffrement sont supprimés : les lectures en cours s’arrêtent. Cette action est définitive."
        confirmLabel="Supprimer la vidéo"
        typeToConfirm="supprimer"
        pending={pending}
        onConfirm={() =>
          run(() => deleteVideoAction(video.id, filmId), {
            success: 'Vidéo supprimée, clé révoquée.',
            onSuccess: () => setConfirmOpen(false),
          })
        }
      />
    </li>
  );
}
