import { Archivo } from 'next/font/google';

/**
 * Archivo 700 et 800 : titres d'affiche et d'écran, chiffres du Top 10 (charte « Nuit de Kin », D-05).
 * Tout le reste utilise la police du système (aucun fichier). Déclarée une seule fois, pour le site et
 * l'administration ; budget de 45 Ko (R-PERF-04), sinon ne garder que la graisse 800.
 */
export const archivo = Archivo({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-archivo',
  display: 'swap',
  adjustFontFallback: true,
});
