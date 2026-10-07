/**
 * Réécriture des playlists HLS : chaque URI (variante, segment, clé) reçoit le jeton de lecture.
 * Les chemins internes de stockage ne sortent jamais tels quels.
 */
export const RENDITION_RE = /^\d{3,4}p$/;
export const SEGMENT_RE = /^[a-z0-9]{12}_\d{5}\.ts$/;
const KEY_URI_RE = /URI="key:\/\/([a-z0-9]+)"/;

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
