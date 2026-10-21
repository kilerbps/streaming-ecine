import { z } from 'zod';

const bool = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1');

const secret = (name: string) =>
  z.string().min(32, `${name} doit contenir au moins 32 caractères (openssl rand -base64 48)`);

/** Adresse HTTP d'un service du réseau Docker interne : nom sans point (ex. `web`), jamais d'IP. */
function isInternalHttp(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' && /^[a-z][a-z0-9-]*$/.test(url.hostname);
  } catch {
    return false;
  }
}

/** Configuration validée au démarrage : le serveur refuse de démarrer si une variable manque. */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().default(4000),
    TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(1),

    DATABASE_URL: z.string().startsWith('postgresql://'),
    REDIS_URL: z.string().startsWith('redis'),

    /** Origine du site Next.js (CORS, liens dans les e-mails). */
    APP_URL: z.url(),
    /** URL publique de l'API (réécriture des playlists HLS). */
    API_PUBLIC_URL: z.url(),
    /** URL publique des médias (images compressées, segments HLS). */
    MEDIA_PUBLIC_URL: z.url(),
    CORS_ORIGINS: z.string().default(''),

    JWT_ACCESS_SECRET: secret('JWT_ACCESS_SECRET'),
    PLAYBACK_TOKEN_SECRET: secret('PLAYBACK_TOKEN_SECRET'),
    /** Clé maîtresse (32 octets en base64) qui chiffre les clés AES des vidéos et les secrets TOTP. */
    MEDIA_KEY_SECRET: z
      .string()
      .refine(
        (v) => Buffer.from(v, 'base64').length === 32,
        'MEDIA_KEY_SECRET : 32 octets en base64',
      ),
    IP_HASH_SALT: secret('IP_HASH_SALT'),
    /** Clé de service partagée avec Next.js (sitemap-data, appels internes). */
    SERVICE_API_KEY: secret('SERVICE_API_KEY'),
    REVALIDATE_URL: z.url().optional(),
    REVALIDATE_SECRET: secret('REVALIDATE_SECRET'),

    COOKIE_SECURE: bool.optional(),
    STORAGE_DIR: z.string().default('./storage'),
    /** Binaires de transcodage utilisés par le worker (dans le PATH par défaut). */
    FFMPEG_PATH: z.string().min(1).default('ffmpeg'),
    FFPROBE_PATH: z.string().min(1).default('ffprobe'),

    MAIL_DRIVER: z.enum(['log', 'resend']).default('log'),
    MAIL_FROM: z.string().default('E-Ciné <no-reply@e-cine.example>'),
    RESEND_API_KEY: z.string().optional(),

    /**
     * Notifications Web Push des rappels (ADR-0014) : paire VAPID (npx web-push generate-vapid-keys).
     * Absente : les rappels partent seulement par e-mail.
     */
    VAPID_PUBLIC_KEY: z.string().min(80).max(100).optional(),
    VAPID_PRIVATE_KEY: z.string().min(40).max(50).optional(),
    VAPID_SUBJECT: z.string().startsWith('mailto:').or(z.url()).optional(),

    TURNSTILE_SECRET: z.string().optional(),
    /**
     * Limites de débit par identité (ADR-0015) : `observe` journalise « aurait bloqué » sans bloquer
     * (deux semaines au lancement) ; seuls les plafonds anti-inondation et la vérification des
     * hébergeurs bloquent alors. `enforce` applique toutes les limites.
     */
    RATE_LIMIT_MODE: z.enum(['observe', 'enforce']).default('observe'),
    /** 2FA obligatoire pour ADMIN/SUPER_ADMIN. Désactivable uniquement en développement local. */
    ADMIN_MFA_REQUIRED: bool.default(true),
    SWAGGER_ENABLED: bool.optional(),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;
    if (env.MAIL_DRIVER === 'resend' && !env.RESEND_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['RESEND_API_KEY'],
        message: 'Requis avec MAIL_DRIVER=resend',
      });
    }
    if (!env.TURNSTILE_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['TURNSTILE_SECRET'],
        message: 'Requis en production (anti-spam)',
      });
    }
    if (!env.ADMIN_MFA_REQUIRED) {
      ctx.addIssue({
        code: 'custom',
        path: ['ADMIN_MFA_REQUIRED'],
        message: 'La 2FA admin est obligatoire en production',
      });
    }
    if (env.COOKIE_SECURE === false) {
      ctx.addIssue({ code: 'custom', path: ['COOKIE_SECURE'], message: 'Interdit en production' });
    }
    if (env.MAIL_DRIVER === 'log') {
      // Le pilote « log » écrit le contenu des e-mails, donc les liens de réinitialisation, dans les journaux.
      ctx.addIssue({
        code: 'custom',
        path: ['MAIL_DRIVER'],
        message: 'Le pilote « log » est interdit en production (MAIL_DRIVER=resend)',
      });
    }
    if (env.MAIL_FROM.includes('e-cine.example')) {
      ctx.addIssue({
        code: 'custom',
        path: ['MAIL_FROM'],
        message: 'Adresse d’expédition factice : utiliser le domaine vérifié chez Resend',
      });
    }
    if (!env.REVALIDATE_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['REVALIDATE_URL'],
        message: 'Requis en production (mise à jour du site après publication)',
      });
    }
    for (const key of [
      'APP_URL',
      'API_PUBLIC_URL',
      'MEDIA_PUBLIC_URL',
      'REVALIDATE_URL',
    ] as const) {
      const value = env[key];
      // Seule exception : le webhook de revalidation vers le site sur le même hôte Docker
      // (`http://web:3000/…`, ADR-0016) ; il ne quitte jamais le réseau interne.
      const internal = key === 'REVALIDATE_URL' && value !== undefined && isInternalHttp(value);
      if (value && !value.startsWith('https://') && !internal) {
        ctx.addIssue({ code: 'custom', path: [key], message: 'HTTPS obligatoire en production' });
      }
    }
  });

export type Env = z.infer<typeof envSchema> & { COOKIE_SECURE: boolean; SWAGGER_ENABLED: boolean };

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Configuration invalide :\n${lines.join('\n')}`);
  }
  const env = parsed.data;
  const isProd = env.NODE_ENV === 'production';
  return {
    ...env,
    COOKIE_SECURE: env.COOKIE_SECURE ?? isProd,
    SWAGGER_ENABLED: env.SWAGGER_ENABLED ?? !isProd,
  };
}

export const ENV = Symbol('ENV');
