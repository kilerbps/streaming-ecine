import { sep } from 'node:path';
import { z } from 'zod';

/**
 * Fonctions pures du transcodage HLS (testées sans FFmpeg) : échelle de qualités, arguments
 * FFmpeg/ffprobe, lecture de la sonde et de la progression. Contrat de sortie (playback.service.ts) :
 * `{outDir}/master.m3u8` → `240p/index.m3u8` → segments `{préfixe12}_{00000}.ts`, clé `key://{id}`.
 */

export const LADDER = [240, 360, 480, 720, 1080] as const;
export type Rung = (typeof LADDER)[number];

/** Durée cible des segments (secondes) ; les images clés sont alignées dessus. */
export const SEGMENT_SECONDS = 6;
/** Qualité constante plafonnée par -maxrate/-bufsize (VBR contraint). */
const CRF = 23;
const DEFAULT_FPS = 25;

/** Débits plafonds par palier (kbit/s), réglés pour les réseaux mobiles variables. */
export const RUNG_RATES: Record<Rung, { videoK: number; audioK: number }> = {
  240: { videoK: 400, audioK: 96 },
  360: { videoK: 800, audioK: 96 },
  480: { videoK: 1200, audioK: 96 },
  720: { videoK: 2500, audioK: 128 },
  1080: { videoK: 4500, audioK: 128 },
};

/** Paliers ≤ hauteur de la source (jamais d'agrandissement), toujours au moins 240p. */
export function pickLadder(sourceHeight: number): Rung[] {
  const fit = LADDER.filter((h) => h <= sourceHeight);
  return fit.length > 0 ? fit : [240];
}

/** FFmpeg accepte `/` partout ; indispensable pour que le master référence `240p/index.m3u8`. */
export function toPosixPath(path: string): string {
  return sep === '\\' ? path.split('\\').join('/') : path;
}

export interface HlsArgsInput {
  input: string;
  outDir: string;
  ladder: readonly Rung[];
  keyInfoPath: string;
  segmentPrefix: string;
  hasAudio: boolean;
  /** Images par seconde de la source (ffprobe) : taille du GOP = 6 s. */
  fps?: number | null;
}

/**
 * Une seule commande FFmpeg : décodage unique, `split` + `scale` par palier (proportions gardées,
 * largeur paire), H.264 Main, AAC, segments HLS chiffrés AES-128 et master `master.m3u8`.
 */
export function buildHlsArgs(o: HlsArgsInput): string[] {
  if (o.ladder.length === 0) throw new Error('Échelle de qualités vide');
  if (!/^[a-z0-9]{12}$/.test(o.segmentPrefix)) throw new Error('Préfixe de segment invalide');
  const out = toPosixPath(o.outDir).replace(/\/+$/, '');
  const n = o.ladder.length;
  const gop = Math.max(1, Math.round((o.fps && o.fps > 0 ? o.fps : DEFAULT_FPS) * SEGMENT_SECONDS));

  const scales = o.ladder.map((h, i) => `[s${i}]scale=w=-2:h=${h},format=yuv420p[v${i}]`);
  const filter =
    n === 1
      ? `[0:v:0]scale=w=-2:h=${o.ladder[0]},format=yuv420p[v0]`
      : `[0:v:0]split=${n}${o.ladder.map((_, i) => `[s${i}]`).join('')};${scales.join(';')}`;

  const args = [
    '-hide_banner',
    '-nostdin',
    '-y',
    '-loglevel',
    'error',
    '-nostats',
    '-progress',
    'pipe:1',
  ];
  args.push('-i', toPosixPath(o.input), '-filter_complex', filter);

  o.ladder.forEach((h, i) => {
    const { videoK } = RUNG_RATES[h];
    args.push(
      '-map',
      `[v${i}]`,
      `-c:v:${i}`,
      'libx264',
      `-maxrate:v:${i}`,
      `${videoK}k`,
      `-bufsize:v:${i}`,
      `${videoK * 2}k`,
    );
  });
  args.push(
    '-preset',
    'veryfast',
    '-profile:v',
    'main',
    '-crf',
    String(CRF),
    '-g',
    String(gop),
    '-keyint_min',
    String(gop),
    '-sc_threshold',
    '0',
    '-force_key_frames',
    `expr:gte(t,n_forced*${SEGMENT_SECONDS})`,
  );

  if (o.hasAudio) {
    o.ladder.forEach((h, i) => {
      args.push('-map', '0:a:0', `-c:a:${i}`, 'aac', `-b:a:${i}`, `${RUNG_RATES[h].audioK}k`);
    });
    args.push('-ac', '2', '-ar', '48000');
  }

  const streamMap = o.ladder
    .map((h, i) => (o.hasAudio ? `v:${i},a:${i},name:${h}p` : `v:${i},name:${h}p`))
    .join(' ');
  args.push(
    '-map_metadata',
    '-1',
    '-map_chapters',
    '-1',
    '-max_muxing_queue_size',
    '1024',
    '-f',
    'hls',
    '-hls_time',
    String(SEGMENT_SECONDS),
    '-hls_playlist_type',
    'vod',
    '-hls_list_size',
    '0',
    '-hls_segment_type',
    'mpegts',
    '-hls_flags',
    'independent_segments',
    '-hls_key_info_file',
    toPosixPath(o.keyInfoPath),
    '-hls_segment_filename',
    `${out}/%v/${o.segmentPrefix}_%05d.ts`,
    '-master_pl_name',
    'master.m3u8',
    '-var_stream_map',
    streamMap,
    `${out}/%v/index.m3u8`,
  );
  return args;
}

/**
 * Fichier `-hls_key_info_file` : URI écrite dans les playlists (`key://{contentKeyId}`, réécrite
 * à la lecture), chemin du fichier de clé temporaire, IV en hexadécimal.
 */
export function keyInfoContent(contentKeyId: string, keyPath: string, ivHex: string): string {
  if (!/^[a-z0-9]+$/.test(contentKeyId)) throw new Error('Identifiant de clé invalide');
  if (!/^[0-9a-f]{32}$/.test(ivHex)) throw new Error('IV invalide');
  return `key://${contentKeyId}\n${toPosixPath(keyPath)}\n${ivHex}\n`;
}

export function buildProbeArgs(input: string): string[] {
  return [
    '-v',
    'error',
    '-print_format',
    'json',
    '-show_format',
    '-show_streams',
    toPosixPath(input),
  ];
}

/** Source de test (mire `testsrc2` 1280×720 + bip `sine`) pour la vidéo de démonstration. */
export function buildTestSourceArgs(output: string, seconds = 40): string[] {
  return [
    '-hide_banner',
    '-nostdin',
    '-y',
    '-loglevel',
    'error',
    '-f',
    'lavfi',
    '-i',
    'testsrc2=size=1280x720:rate=25',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=440:sample_rate=48000',
    '-map',
    '0:v:0',
    '-map',
    '1:a:0',
    '-t',
    String(seconds),
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-movflags',
    '+faststart',
    toPosixPath(output),
  ];
}

const probeSchema = z.object({
  streams: z
    .array(
      z.object({
        codec_type: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        avg_frame_rate: z.string().optional(),
        r_frame_rate: z.string().optional(),
        duration: z.string().optional(),
        disposition: z.object({ attached_pic: z.number().optional() }).partial().optional(),
        tags: z.record(z.string(), z.string()).optional(),
        side_data_list: z.array(z.object({ rotation: z.number().optional() }).loose()).optional(),
      }),
    )
    .default([]),
  format: z.object({ duration: z.string().optional() }).optional(),
});

export interface ProbeResult {
  durationSec: number;
  /** Dimensions affichées (rotation des vidéos de téléphone prise en compte). */
  width: number;
  height: number;
  hasAudio: boolean;
  fps: number | null;
}

/** Sonde illisible ou sans piste vidéo exploitable. */
export class InvalidSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSourceError';
  }
}

function parseRate(rate: string | undefined): number | null {
  if (!rate) return null;
  const [num, den] = rate.split('/').map(Number);
  const value = den ? num! / den : num!;
  return Number.isFinite(value) && value > 0 && value <= 120 ? value : null;
}

/** Lecture de la sortie JSON de ffprobe (`buildProbeArgs`). */
export function parseProbe(json: string): ProbeResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new InvalidSourceError('Sortie ffprobe illisible');
  }
  const parsed = probeSchema.safeParse(raw);
  if (!parsed.success) throw new InvalidSourceError('Sortie ffprobe inattendue');
  const { streams, format } = parsed.data;

  const video = streams.find(
    (s) => s.codec_type === 'video' && s.width && s.height && s.disposition?.attached_pic !== 1,
  );
  if (!video?.width || !video.height) throw new InvalidSourceError('Aucune piste vidéo');

  const duration = Number(format?.duration ?? video.duration);
  if (!Number.isFinite(duration) || duration <= 0) throw new InvalidSourceError('Durée inconnue');

  const rotation =
    video.side_data_list?.find((d) => typeof d.rotation === 'number')?.rotation ??
    Number(video.tags?.rotate ?? 0);
  const quarterTurn = Math.abs(Math.round(rotation)) % 180 === 90;

  return {
    durationSec: duration,
    width: quarterTurn ? video.height : video.width,
    height: quarterTurn ? video.width : video.height,
    hasAudio: streams.some((s) => s.codec_type === 'audio'),
    fps: parseRate(video.avg_frame_rate) ?? parseRate(video.r_frame_rate),
  };
}

/**
 * Progression (0–100) depuis une ligne de `-progress pipe:1`. `out_time_ms` est exprimé en
 * microsecondes (comme `out_time_us`). Plafonné à 99 tant que FFmpeg n'a pas écrit `progress=end`.
 */
export function parseProgress(line: string, durationSec: number): number | null {
  const trimmed = line.trim();
  if (trimmed === 'progress=end') return 100;
  const match = /^out_time_(?:us|ms)=(\d+)$/.exec(trimmed);
  if (!match || !(durationSec > 0)) return null;
  const seconds = Number(match[1]) / 1_000_000;
  return Math.max(0, Math.min(99, Math.floor((seconds / durationSec) * 100)));
}
