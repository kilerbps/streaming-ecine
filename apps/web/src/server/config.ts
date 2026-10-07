import 'server-only';
import { z } from 'zod';
import { cookieSecure } from './cookie-names';

const schema = z
  .object({
    API_INTERNAL_URL: z.url(),
    SITE_URL: z.url(),
    API_PUBLIC_URL: z.url(),
    MEDIA_PUBLIC_URL: z.url(),
    CANONICAL_HOST: z.string().optional(),
    SERVICE_API_KEY: z.string().min(32),
    REVALIDATE_SECRET: z.string().min(32),
    /** Absent : `true` en production. Voir `cookieSecure`. */
    COOKIE_SECURE: z.enum(['true', 'false']).optional(),
    DESIGN_PAGE_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    /** Fourni par Vercel : `production`, `preview` ou `development`. */
    VERCEL_ENV: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.VERCEL_ENV === 'production' && env.COOKIE_SECURE === 'false') {
      ctx.addIssue({
        code: 'custom',
        path: ['COOKIE_SECURE'],
        message: 'Interdit en production : les cookies de session doivent être sécurisés',
      });
    }
  })
  .transform((env) => ({ ...env, COOKIE_SECURE: cookieSecure(env.COOKIE_SECURE, env.NODE_ENV) }));

export type ServerConfig = z.infer<typeof schema>;

let cached: ServerConfig | null = null;

/** Lit et valide la configuration (exportée pour les tests ; le site passe par `serverConfig`). */
export function parseServerConfig(source: NodeJS.ProcessEnv): ServerConfig {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Configuration du site invalide :\n${lines.join('\n')}`);
  }
  return parsed.data;
}

/** Configuration serveur validée (le site refuse de démarrer si une variable manque). */
export function serverConfig(): ServerConfig {
  cached ??= parseServerConfig(process.env);
  return cached;
}
