import 'server-only';
import type { Viewport } from 'next';
import { headers } from 'next/headers';
import { LITE_DETECTION_SCRIPT, type Preferences, type ThemeSetting } from '@/lib/preferences';
import { THEME_COLORS } from '@/lib/theme-colors';

/** Attributs de `<html>` rendus côté serveur : thème, économie de données, mode allégé (aucun flash). */
export function htmlPreferenceAttributes(prefs: Preferences) {
  return {
    'data-theme': prefs.theme,
    'data-savedata': prefs.saveData ? 'on' : undefined,
    'data-perf': prefs.lite ? 'lite' : undefined,
  };
}

/** Couleur de la barre du navigateur selon le thème ; en Automatique, une par schéma du système. */
export function themeColorFor(theme: ThemeSetting): Viewport['themeColor'] {
  if (theme === 'auto') {
    return [
      { media: '(prefers-color-scheme: light)', color: THEME_COLORS.light },
      { media: '(prefers-color-scheme: dark)', color: THEME_COLORS.dark },
    ];
  }
  return THEME_COLORS[theme];
}

/**
 * Détection du mode allégé avant l'affichage (mode Automatique, appareil pas encore détecté) :
 * script en ligne en tête du <body>, exécuté pendant la lecture du HTML, avant le premier rendu,
 * autorisé par le nonce CSP de la requête (ADR-0004). `next/script` (beforeInteractive) le
 * différerait après le démarrage de Next.js. Limite connue : sur une réponse 404, React reconstruit
 * la mise en page côté client et signale la balise en développement (sans effet en production).
 */
export async function LiteDetection({ prefs }: { prefs: Preferences }) {
  if (prefs.perf !== 'auto' || prefs.lite) return null;
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return <script nonce={nonce} dangerouslySetInnerHTML={{ __html: LITE_DETECTION_SCRIPT }} />;
}
