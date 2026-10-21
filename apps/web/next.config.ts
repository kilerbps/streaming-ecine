import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

/** Racine du monorepo : le site embarque @ecine/contracts dans sa sortie autonome (Docker). */
const workspaceRoot = fileURLToPath(new URL('../../', import.meta.url));

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** En-têtes de sécurité statiques. La CSP (avec nonce) est posée par src/proxy.ts. */
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
  },
];

const nextConfig: NextConfig = {
  // Image Docker du VPS (ADR-0016) : serveur Node autonome, sans node_modules complet.
  output: 'standalone',
  outputFileTracingRoot: workspaceRoot,
  turbopack: { root: workspaceRoot },
  reactStrictMode: true,
  poweredByHeader: false,
  logging: {
    // En développement, Next.js écrit sinon chaque appel d'action serveur avec ses arguments dans le
    // terminal : mots de passe de connexion, codes 2FA et jetons y apparaîtraient en clair.
    serverFunctions: false,
  },
  images: {
    // Images déjà compressées par l'API (sharp) en largeurs fixes : pas de réoptimisation par Vercel.
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
  },
  experimental: {
    serverActions: {
      // Morceaux d'envoi vidéo (3 Mio) et images de l'administration : sous la limite Vercel de 4,5 Mo.
      bodySizeLimit: '4mb',
    },
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
