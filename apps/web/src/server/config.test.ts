import { describe, expect, it } from 'vitest';
import { parseServerConfig } from './config';
import { cookieSecure } from './cookie-names';

const base = {
  API_INTERNAL_URL: 'http://api:4000',
  SITE_URL: 'https://e-cine.cd',
  API_PUBLIC_URL: 'https://api.e-cine.cd',
  MEDIA_PUBLIC_URL: 'https://media.e-cine.cd',
  SERVICE_API_KEY: 'k'.repeat(40),
  REVALIDATE_SECRET: 'r'.repeat(40),
};

describe('cookies sécurisés', () => {
  it('sont activés par défaut en production, désactivés en développement', () => {
    expect(cookieSecure(undefined, 'production')).toBe(true);
    expect(cookieSecure('', 'production')).toBe(true);
    expect(cookieSecure(undefined, 'development')).toBe(false);
  });

  it('suivent une valeur explicite', () => {
    expect(cookieSecure('false', 'production')).toBe(false);
    expect(cookieSecure('true', 'development')).toBe(true);
  });

  it('ne peuvent pas être désactivés sur Vercel en production', () => {
    expect(() =>
      parseServerConfig({ ...base, NODE_ENV: 'production', VERCEL_ENV: 'production', COOKIE_SECURE: 'false' }),
    ).toThrow(/COOKIE_SECURE/);
  });

  it('restent désactivables pour un build de production servi en HTTP (CI)', () => {
    const config = parseServerConfig({ ...base, NODE_ENV: 'production', COOKIE_SECURE: 'false' });
    expect(config.COOKIE_SECURE).toBe(false);
  });

  it('sont activés sur une préproduction Vercel sans réglage', () => {
    const config = parseServerConfig({ ...base, NODE_ENV: 'production', VERCEL_ENV: 'preview' });
    expect(config.COOKIE_SECURE).toBe(true);
  });
});
