import 'server-only';
import { z } from 'zod';

const schema = z.object({
  API_INTERNAL_URL: z.url(),
  SITE_URL: z.url(),
  API_PUBLIC_URL: z.url(),
  MEDIA_PUBLIC_URL: z.url(),
  CANONICAL_HOST: z.string().optional(),
  SERVICE_API_KEY: z.string().min(32),
  REVALIDATE_SECRET: z.string().min(32),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  DESIGN_PAGE_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

let cached: z.infer<typeof schema> | null = null;

/** Configuration serveur validée (le site refuse de démarrer si une variable manque). */
export function serverConfig(): z.infer<typeof schema> {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Configuration du site invalide :\n${lines.join('\n')}`);
  }
  cached = parsed.data;
  return cached;
}
