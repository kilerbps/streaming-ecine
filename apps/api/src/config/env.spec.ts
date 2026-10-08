import { loadEnv } from './env.js';

const SECRET = 'x'.repeat(48);

/** Configuration de production complète et valide ; chaque test en retire ou en fausse une partie. */
function production(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://ecine:mdp@postgres:5432/ecine',
    REDIS_URL: 'redis://:mdp@redis:6379',
    APP_URL: 'https://e-cine.cd',
    API_PUBLIC_URL: 'https://api.e-cine.cd',
    MEDIA_PUBLIC_URL: 'https://media.e-cine.cd',
    REVALIDATE_URL: 'https://e-cine.cd/api/revalidate',
    JWT_ACCESS_SECRET: SECRET,
    PLAYBACK_TOKEN_SECRET: SECRET,
    MEDIA_KEY_SECRET: Buffer.alloc(32, 1).toString('base64'),
    IP_HASH_SALT: SECRET,
    SERVICE_API_KEY: SECRET,
    REVALIDATE_SECRET: SECRET,
    MAIL_DRIVER: 'resend',
    MAIL_FROM: 'E-Ciné <no-reply@e-cine.cd>',
    RESEND_API_KEY: 're_test',
    TURNSTILE_SECRET: 'turnstile',
    ...overrides,
  };
}

function problems(source: NodeJS.ProcessEnv): string {
  try {
    loadEnv(source);
    return '';
  } catch (err) {
    return (err as Error).message;
  }
}

describe('configuration de production', () => {
  it('accepte une configuration complète', () => {
    const env = loadEnv(production());
    expect(env.COOKIE_SECURE).toBe(true);
    expect(env.SWAGGER_ENABLED).toBe(false);
  });

  it('refuse le pilote d’e-mail « log » (liens de réinitialisation dans les journaux)', () => {
    expect(problems(production({ MAIL_DRIVER: 'log' }))).toContain('MAIL_DRIVER');
  });

  it('refuse l’adresse d’expédition factice', () => {
    expect(problems(production({ MAIL_FROM: undefined }))).toContain('MAIL_FROM');
  });

  it('exige REVALIDATE_URL', () => {
    expect(problems(production({ REVALIDATE_URL: undefined }))).toContain('REVALIDATE_URL');
  });

  it('exige HTTPS pour les URL publiques', () => {
    const message = problems(production({ MEDIA_PUBLIC_URL: 'http://media.e-cine.cd' }));
    expect(message).toContain('MEDIA_PUBLIC_URL: HTTPS obligatoire');
  });

  it('garde les règles existantes (Turnstile, 2FA admin, cookies sécurisés)', () => {
    const message = problems(
      production({
        TURNSTILE_SECRET: undefined,
        ADMIN_MFA_REQUIRED: 'false',
        COOKIE_SECURE: 'false',
      }),
    );
    expect(message).toContain('TURNSTILE_SECRET');
    expect(message).toContain('ADMIN_MFA_REQUIRED');
    expect(message).toContain('COOKIE_SECURE');
  });

  it('n’impose rien de tout cela en développement', () => {
    const env = loadEnv(
      production({
        NODE_ENV: 'development',
        MAIL_DRIVER: 'log',
        MAIL_FROM: undefined,
        REVALIDATE_URL: undefined,
        APP_URL: 'http://localhost:3000',
      }),
    );
    expect(env.MAIL_DRIVER).toBe('log');
    expect(env.COOKIE_SECURE).toBe(false);
  });
});
