/**
 * Aperçus vidéo automatiques (D-12, docs/design/03, Conditions ; ADR-0015) : affiche à la une et
 * aperçu rapide. Extrait statique muet en 240p (environ 0,6 Mo, sous le plafond de 1,5 Mo de
 * R-PERF-05), arrêté hors de l'écran.
 */

/** Réseau connu : démarrage après 1 s de visibilité (rien pendant un défilement rapide). */
export const PREVIEW_START_DELAY_MS = 1_000;
/** Sans API réseau (iPhone) : présence à l'écran exigée avant de démarrer. */
export const PREVIEW_DELAY_UNKNOWN_NETWORK_MS = 2_000;
/** Aperçus par visite au plus (environ 3 Mo) : un « Wi-Fi » est souvent un partage de connexion. */
export const PREVIEW_BUDGET_PER_VISIT = 5;

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
