import { z } from 'zod';

/** Session de lecture : jeton ≤ 5 min, renouvelé par le lecteur (docs/06-SECURITY.md §6). */
export const PLAYBACK_TOKEN_TTL_SEC = 300;

export const playbackSessionSchema = z.object({
  sessionId: z.string(),
  manifestUrl: z.string(),
  token: z.string(),
  expiresAt: z.string(),
});
export type PlaybackSession = z.infer<typeof playbackSessionSchema>;

/** Ouverture de session : `apercu=1` pour un aperçu automatique (240p, jamais compté comme lecture). */
export const playbackSessionQuerySchema = z.strictObject({ apercu: z.enum(['1']).optional() });

export const playbackRefreshSchema = z.object({
  token: z.string(),
  expiresAt: z.string(),
});
export type PlaybackRefresh = z.infer<typeof playbackRefreshSchema>;

/** Nom du paramètre de requête qui porte le jeton sur les URLs média (jamais dans l'URL de page). */
export const PLAYBACK_TOKEN_PARAM = 't';

/**
 * Listes de lecture « sans jeton » (`?bare=1`, ADR-0015) : le lecteur hls.js ajoute le jeton à
 * chaque requête, les adresses réécrites restent donc stables d'un renouvellement à l'autre (la
 * clé n'est chargée qu'une fois). Le HLS natif (anciens iPhone) garde les adresses avec jeton.
 */
export const PLAYBACK_BARE_PARAM = 'bare';

/**
 * Aperçu promotionnel (ADR-0015, exception validée le 20 octobre 2026) : extrait statique au passage
 * choisi en administration, 240p, sans son, filigrané, servi sans jeton et mis en cache un an.
 */
export const PREVIEW_CLIP = { seconds: 14, maxSeconds: 20, height: 240 } as const;
