import type { Role } from '@ecine/contracts';

/**
 * Configuration partagée de l'administration (Server Components, Server Actions et composants clients).
 * Une seule source pour les chemins d'API, les URL de l'interface et les actions permises par type.
 */

export type ContentKind = 'films' | 'people' | 'articles' | 'posts' | 'pages';
export type ContentOp = 'publish' | 'schedule' | 'unpublish' | 'archive' | 'delete' | 'restore';

export const CONTENT: Record<ContentKind, { api: string; ui: string; ops: readonly ContentOp[] }> =
  {
    films: {
      api: '/admin/films',
      ui: '/admin/films',
      ops: ['publish', 'schedule', 'unpublish', 'archive', 'delete', 'restore'],
    },
    people: {
      api: '/admin/people',
      ui: '/admin/people',
      ops: ['publish', 'unpublish', 'delete', 'restore'],
    },
    articles: {
      api: '/admin/articles',
      ui: '/admin/actualites',
      ops: ['publish', 'schedule', 'unpublish', 'archive', 'delete', 'restore'],
    },
    posts: {
      api: '/admin/posts',
      ui: '/admin/publications',
      ops: ['publish', 'schedule', 'unpublish', 'archive', 'delete', 'restore'],
    },
    pages: { api: '/admin/pages', ui: '/admin/pages', ops: ['publish', 'unpublish'] },
  };

/** Rôle minimum de chaque écran (miroir des @Roles de l'API, qui reste l'autorité). */
export const SCREEN_ROLE = {
  dashboard: 'MODERATOR',
  content: 'EDITOR',
  reports: 'MODERATOR',
  messages: 'EDITOR',
  users: 'ADMIN',
  settings: 'ADMIN',
  stats: 'ADMIN',
  audit: 'ADMIN',
} as const satisfies Record<string, Role>;

/** Envoi d'images par Server Action : sous la limite de 4 Mio configurée dans next.config.ts. */
export const ADMIN_IMAGE_MAX_BYTES = 4_000_000;

/** Fuseau d'affichage et de saisie des dates de l'administration (Kinshasa, UTC+1, sans heure d'été). */
export const ADMIN_TIME_ZONE = 'Africa/Kinshasa';
export const KINSHASA_OFFSET = '+01:00';

/** Clés de stockage local (jamais de jeton : uniquement des valeurs de formulaire et l'état d'un envoi). */
export const storageKeys = {
  draft: (kind: string, id: string | null) => `ecine:admin-draft:${kind}:${id ?? 'new'}`,
  upload: (filmId: string) => `ecine:admin-upload:${filmId}`,
};
