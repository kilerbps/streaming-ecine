import { PLAYBACK_BARE_PARAM, PLAYBACK_TOKEN_PARAM } from '@ecine/contracts';

/**
 * Réécriture des playlists HLS : chaque URI (variante, segment, clé) reçoit le jeton de lecture,
 * sauf en mode `bare` où le lecteur hls.js l'ajoute lui-même à chaque requête.
 * Les chemins internes de stockage ne sortent jamais tels quels.
 */
export const RENDITION_RE = /^\d{3,4}p$/;
export const SEGMENT_RE = /^[a-z0-9]{12}_\d{5}\.ts$/;
const KEY_URI_RE = /URI="key:\/\/([a-z0-9]+)"/;

/** Hauteur d'un rendu (« 240p » → 240). */
export const renditionHeight = (rendition: string) => Number.parseInt(rendition, 10);

/**
 * Garde les variantes de `maxHeight` au plus (aperçu automatique en 240p) ; s'il n'y en a aucune, la
 * plus basse. Chaque variante est une ligne #EXT-X-STREAM-INF suivie de son URI.
 */
export function capMaster(playlist: string, maxHeight: number): string {
  const lines = playlist.split('\n');
  const variants: Array<{ info: number; uri: number; height: number }> = [];
  lines.forEach((line, index) => {
    const match = /^(\d{3,4})p\/index\.m3u8$/.exec(line.trim());
    if (match && index > 0 && lines[index - 1]!.startsWith('#EXT-X-STREAM-INF')) {
      variants.push({ info: index - 1, uri: index, height: Number(match[1]) });
    }
  });
  if (variants.length === 0) return playlist;
  const lowest = Math.min(...variants.map((v) => v.height));
  const keep = (v: { height: number }) => v.height <= Math.max(maxHeight, lowest);
  const dropped = new Set(variants.filter((v) => !keep(v)).flatMap((v) => [v.info, v.uri]));
  return lines.filter((_, index) => !dropped.has(index)).join('\n');
}

/** Adresses réécrites d'une liste : avec le jeton (HLS natif), ou sans (`bare`, hls.js). */
export function mediaHrefs(options: {
  api: string;
  media: string;
  videoId: string;
  token: string;
  bare: boolean;
}) {
  const { api, media, videoId, bare } = options;
  const t = `${PLAYBACK_TOKEN_PARAM}=${encodeURIComponent(options.token)}`;
  return {
    variant: (rendition: string) =>
      `${api}/v1/playback/${videoId}/${rendition}/index.m3u8?${bare ? `${PLAYBACK_BARE_PARAM}=1` : t}`,
    segment: (rendition: string, segment: string) =>
      `${media}/hls/${videoId}/${rendition}/${segment}${bare ? '' : `?${t}`}`,
    key: (keyId: string) => `${api}/v1/playback/keys/${keyId}?${bare ? '' : `${t}&`}v=${videoId}`,
  };
}

export function rewriteMaster(playlist: string, variantUrl: (rendition: string) => string): string {
  return playlist
    .split('\n')
    .map((line) => {
      const match = /^(\d{3,4}p)\/index\.m3u8$/.exec(line.trim());
      return match ? variantUrl(match[1]!) : line;
    })
    .join('\n');
}

export function rewriteVariant(
  playlist: string,
  segmentUrl: (segment: string) => string,
  keyUrl: (keyId: string) => string,
): string {
  return playlist
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('#EXT-X-KEY')) {
        return line.replace(KEY_URI_RE, (_m, keyId: string) => `URI="${keyUrl(keyId)}"`);
      }
      if (SEGMENT_RE.test(trimmed)) return segmentUrl(trimmed);
      return line;
    })
    .join('\n');
}
