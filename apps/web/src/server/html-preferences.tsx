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
 * Détection du mode allégé avant l'affichage (mode Automatique, appareil pas encore détecté).
 * Script en ligne autorisé par le nonce CSP de la requête (ADR-0004).
 */
export async function LiteDetection({ prefs }: { prefs: Preferences }) {
  if (prefs.perf !== 'auto' || prefs.lite) return null;
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return <script nonce={nonce} dangerouslySetInnerHTML={{ __html: LITE_DETECTION_SCRIPT }} />;
}
