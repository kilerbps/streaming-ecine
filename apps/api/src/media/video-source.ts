import type { VideoAsset } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';

export type VideoContainer = 'iso-bmff' | 'matroska';

/** Conteneur attendu pour chaque type déclaré (MP4/MOV : ISO BMFF ; MKV/WebM : EBML). */
const CONTAINER_BY_MIME: Record<string, VideoContainer> = {
  'video/mp4': 'iso-bmff',
  'video/quicktime': 'iso-bmff',
  'video/x-matroska': 'matroska',
  'video/webm': 'matroska',
};

/**
 * Conteneur réel d'après les premiers octets (« magic bytes ») : `ftyp` aux octets 4–8 pour MP4/MOV,
 * en-tête EBML `1A 45 DF A3` pour Matroska/WebM. `null` si non reconnu.
 */
export function detectVideoContainer(head: Buffer): VideoContainer | null {
  if (head.length >= 8 && head.subarray(4, 8).toString('latin1') === 'ftyp') return 'iso-bmff';
  if (
    head.length >= 4 &&
    head[0] === 0x1a &&
    head[1] === 0x45 &&
    head[2] === 0xdf &&
    head[3] === 0xa3
  )
    return 'matroska';
  return null;
}

/** Vrai si les premiers octets correspondent au type déclaré à l'ouverture de l'envoi. */
export function matchesVideoSignature(head: Buffer, mime: string): boolean {
  const expected = CONTAINER_BY_MIME[mime];
  return expected !== undefined && detectVideoContainer(head) === expected;
}

/** Enregistre une source privée (Media VIDEO_SOURCE) et sa vidéo en attente de transcodage. */
export function registerVideoSource(
  prisma: PrismaService,
  input: { filmId: string; mediaId: string; storageKey: string; mime: string; bytes: number },
): Promise<VideoAsset> {
  return prisma.$transaction(async (tx) => {
    await tx.media.create({
      data: {
        id: input.mediaId,
        kind: 'VIDEO_SOURCE',
        storageKey: input.storageKey,
        mime: input.mime,
        bytes: BigInt(input.bytes),
      },
    });
    return tx.videoAsset.create({
      data: { filmId: input.filmId, sourceMediaId: input.mediaId, state: 'PENDING' },
    });
  });
}
