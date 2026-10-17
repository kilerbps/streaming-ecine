/**
 * Aperçus vidéo automatiques (D-12, docs/design/03, Conditions) : affiche à la une et aperçu rapide.
 * Toujours muets, en 240p (session d'aperçu), 1,5 Mo au plus, arrêtés hors de l'écran.
 */

/** Données d'un aperçu au plus (R-PERF-05). */
export const PREVIEW_MAX_BYTES = 1_500_000;
/** Sans API réseau (iPhone) : présence à l'écran exigée avant de démarrer. */
export const PREVIEW_DELAY_UNKNOWN_NETWORK_MS = 2_000;

export interface PreviewContext {
  /** Réglages → « Aperçus automatiques ». */
  autoPreviews: boolean;
  /** Mode allégé (réglé ou détecté). */
  lite: boolean;
  /** Économie de données (réglage ou en-tête Save-Data). */
  saveData: boolean;
  reducedMotion: boolean;
  /** API réseau du navigateur ; `null` quand elle n'existe pas (Safari). */
  connection: { effectiveType?: string; type?: string; saveData?: boolean } | null;
}

/**
 * `now` : démarrage dès la présence à l'écran (4G ou Wi-Fi détectés) ; `delayed` : réseau inconnu,
 * après 2 s de présence et un seul par écran ; `never` sinon.
 */
export function previewMode(context: PreviewContext): 'now' | 'delayed' | 'never' {
  if (!context.autoPreviews || context.lite || context.saveData || context.reducedMotion) {
    return 'never';
  }
  const { connection } = context;
  if (!connection) return 'delayed';
  if (connection.saveData) return 'never';
  if (connection.type === 'wifi' || connection.type === 'ethernet') return 'now';
  return connection.effectiveType === '4g' ? 'now' : 'never';
}
