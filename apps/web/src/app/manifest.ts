import type { MetadataRoute } from 'next';

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
    background_color: '#121110',
    theme_color: '#121110',
    categories: ['entertainment', 'education'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
