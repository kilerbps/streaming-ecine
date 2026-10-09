import type { MetadataRoute } from 'next';
import { THEME_COLORS } from '@/lib/theme-colors';

/** Manifeste PWA : installable, plein écran autonome, couleurs alignées sur le thème sombre (--bg). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'E-Ciné — le cinéma congolais, en streaming',
    short_name: 'E-Ciné',
    description: 'Films, courts-métrages et actualités du cinéma congolais.',
    lang: 'fr',
    start_url: '/fr',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: THEME_COLORS.dark,
    theme_color: THEME_COLORS.dark,
    categories: ['entertainment', 'education'],
    // Raccourcis de l'icône (appui long sur l'écran d'accueil d'Android).
    shortcuts: [
      {
        name: 'Reprendre',
        url: '/fr/moi',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Rechercher',
        url: '/fr/recherche',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Ma liste',
        url: '/fr/moi/ma-liste',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
    ],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
