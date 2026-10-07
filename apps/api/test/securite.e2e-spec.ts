/**
 * Tests d'intégration de sécurité (docs/04-API-SPEC.md §5, docs/06-SECURITY.md §2) sur une vraie base :
 * sans jeton, mauvais rôle, mauvais propriétaire (BOLA), rejeu de refresh, anti-spam, lecture protégée.
 * Prérequis : pnpm infra:up. Base « ecine_test » et Redis index 1 : vidés à chaque exécution.
 */
import 'dotenv/config';
import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';

const TEST_DB = (process.env.DATABASE_URL ?? '').replace(/\/[^/?]+(\?|$)/, '/ecine_test$1');
const TEST_REDIS = `${(process.env.REDIS_URL ?? '').replace(/\/\d+$/, '')}/1`;
Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: TEST_DB,
  REDIS_URL: TEST_REDIS,
  STORAGE_DIR: mkdtempSync(join(tmpdir(), 'ecine-test-')),
  MAIL_DRIVER: 'log',
  LOG_LEVEL: 'fatal',
});
// Aucun appel externe pendant les tests : pas de Turnstile, pas de revalidation Next.js.
delete process.env.TURNSTILE_SECRET;
delete process.env.REVALIDATE_URL;

let app: NestExpressApplication;
let filmId: string;
const password = 'une phrase de passe pour les tests';

async function register(agent: ReturnType<typeof request.agent>, email: string) {
  return agent
    .post('/v1/auth/register')
    .send({ email, password, displayName: 'Testeur', acceptTerms: true })
    .expect(201);
}

beforeAll(async () => {
  if (!TEST_DB.includes('/ecine_test'))
    throw new Error('Refus : la base de test doit être ecine_test');
  try {
    execSync('pnpm exec prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: TEST_DB },
      stdio: 'pipe',
    });
  } catch (error) {
    const { stdout, stderr } = error as { stdout?: Buffer; stderr?: Buffer };
    throw new Error(
      `Migration de la base de test impossible :\n${String(stdout ?? '')}\n${String(stderr ?? '')}`,
    );
  }

  const { AppModule } = await import('../src/app.module.js');
  const { configureApp } = await import('../src/bootstrap.js');
  const { ENV } = await import('../src/config/env.js');
  const { PrismaService } = await import('../src/prisma/prisma.service.js');
  const { RedisService } = await import('../src/redis/redis.service.js');

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
  configureApp(app, app.get(ENV));
  await app.init();

  const prisma = app.get(PrismaService);
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(
    `TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} CASCADE`,
  );
  await app.get(RedisService).client.flushdb();

  const film = await prisma.film.create({
    data: {
      slug: 'film-test',
      kind: 'SHORT',
      state: 'PUBLISHED',
      publishAt: new Date(Date.now() - 60_000),
      rightsNote: 'Test',
      rightsOk: true,
      translations: {
        create: { locale: 'fr', title: 'Film de test', synopsis: 'Résumé de test.' },
      },
    },
  });
  filmId = film.id;
}, 120_000);

afterAll(async () => {
  await app?.close();
});

describe('Authentification', () => {
  it('refuse /me sans jeton (401, problem+json)', async () => {
    const res = await request(app.getHttpServer() as App)
      .get('/v1/me')
      .expect(401);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.body).toMatchObject({ status: 401, type: 'urn:ecine:problem:unauthenticated' });
  });

  it('refuse un jeton d’accès altéré', async () => {
    await request(app.getHttpServer() as App)
      .get('/v1/me')
      .set('Cookie', 'ecine_at=eyJhbGciOiJIUzI1NiJ9.e30.faux')
      .expect(401);
  });

  it('ne renvoie jamais le hachage du mot de passe', async () => {
    const agent = request.agent(app.getHttpServer());
    const res = await register(agent, 'champs@example.cd');
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|tokenHash/);
  });

  it('révoque toute la famille en cas de rejeu d’un refresh token', async () => {
    const agent = request.agent(app.getHttpServer());
    const res = await register(agent, 'rejeu@example.cd');
    const oldRefresh = (res.headers['set-cookie'] as unknown as string[])
      .find((c) => c.startsWith('ecine_rt='))!
      .split(';')[0]!;
    await agent.post('/v1/auth/refresh').expect(204);
    // Après la fenêtre de grâce, simulée en marquant la rotation comme ancienne.
    const { PrismaService } = await import('../src/prisma/prisma.service.js');
    await app.get(PrismaService).session.updateMany({
      where: { rotatedAt: { not: null } },
      data: { rotatedAt: new Date(Date.now() - 60_000) },
    });
    await request(app.getHttpServer() as App)
      .post('/v1/auth/refresh')
      .set('Cookie', oldRefresh)
      .expect(401);
    await agent.get('/v1/me').expect(401);
  });

  it('refuse une requête navigateur venant d’une origine étrangère', async () => {
    await request(app.getHttpServer() as App)
      .post('/v1/auth/logout')
      .set('Origin', 'https://evil.example')
      .expect(403);
  });
});

describe('Autorisation', () => {
  it('un membre ne peut pas accéder à l’administration (403)', async () => {
    const agent = request.agent(app.getHttpServer());
    await register(agent, 'membre@example.cd');
    await agent.get('/v1/admin/films').expect(403);
    await agent.get('/v1/admin/users').expect(403);
  });

  it('un visiteur anonyme ne peut pas agir (401)', async () => {
    await request(app.getHttpServer() as App)
      .put(`/v1/bookmarks/${filmId}`)
      .expect(401);
    await request(app.getHttpServer() as App)
      .put(`/v1/likes/FILM/${filmId}`)
      .expect(401);
  });

  it('BOLA : la liste d’un membre reste invisible pour un autre', async () => {
    const a = request.agent(app.getHttpServer());
    const b = request.agent(app.getHttpServer());
    await register(a, 'a@example.cd');
    await register(b, 'b@example.cd');
    await a.put(`/v1/bookmarks/${filmId}`).expect(200);
    await a.put(`/v1/me/progress/${filmId}`).send({ positionSec: 120 }).expect(204);
    const mine = await a.get('/v1/me/bookmarks').expect(200);
    const theirs = await b.get('/v1/me/bookmarks').expect(200);
    const ids = (body: unknown) =>
      (body as { items: Array<{ id: string }> }).items.map((f) => f.id);
    expect(ids(mine.body)).toEqual([filmId]);
    expect(ids(theirs.body)).toEqual([]);
    const state = await b.get(`/v1/me/films/${filmId}/state`).expect(200);
    expect(state.body).toEqual({ liked: false, bookmarked: false, positionSec: null });
  });

  it('refuse d’aimer un contenu inexistant (404)', async () => {
    // Connexion à un compte existant : l'inscription est limitée à 5 par heure et par IP.
    const agent = request.agent(app.getHttpServer());
    await agent.post('/v1/auth/login').send({ email: 'membre@example.cd', password }).expect(200);
    await agent.put('/v1/likes/FILM/inexistant').expect(404);
  });

  it('limite les inscriptions en rafale depuis une même IP (429)', async () => {
    const res = await request(app.getHttpServer() as App)
      .post('/v1/auth/register')
      .send({ email: 'rafale@example.cd', password, displayName: 'Rafale', acceptTerms: true });
    expect(res.status).toBe(429);
    expect(res.headers['retry-after']).toBeDefined();
  });
});

describe('Entrées et anti-spam', () => {
  const base = {
    name: 'Kabongo',
    email: 'k@example.cd',
    subject: 'Projection',
    message: 'Bonjour, je souhaite organiser une projection à Kinshasa.',
  };

  it('refuse un formulaire envoyé trop vite', async () => {
    await request(app.getHttpServer() as App)
      .post('/v1/contact')
      .send({ ...base, renderedAt: Date.now() })
      .expect(400);
  });

  it('refuse un pot de miel rempli et les champs inconnus', async () => {
    await request(app.getHttpServer() as App)
      .post('/v1/contact')
      .send({ ...base, website: 'http://spam', renderedAt: Date.now() - 10_000 })
      .expect(400);
    await request(app.getHttpServer() as App)
      .post('/v1/contact')
      .send({ ...base, admin: true, renderedAt: Date.now() - 10_000 })
      .expect(400);
  });

  it('accepte un message valide', async () => {
    await request(app.getHttpServer() as App)
      .post('/v1/contact')
      .send({ ...base, renderedAt: Date.now() - 10_000 })
      .expect(202);
  });

  it('refuse un corps trop volumineux (413)', async () => {
    await request(app.getHttpServer() as App)
      .post('/v1/auth/forgot-password')
      .set('content-type', 'application/json')
      .send(JSON.stringify({ email: 'a'.repeat(120_000) }))
      .expect(413);
  });
});

describe('Lecture vidéo protégée', () => {
  it('refuse une session pour une vidéo inexistante', async () => {
    await request(app.getHttpServer() as App)
      .post('/v1/playback/inexistante/session')
      .expect(404);
  });

  it('refuse manifeste, clé et segment sans jeton', async () => {
    await request(app.getHttpServer() as App)
      .get('/v1/playback/video1/master.m3u8')
      .expect(403);
    await request(app.getHttpServer() as App)
      .get('/v1/playback/keys/cle1234567890')
      .expect(403);
    await request(app.getHttpServer() as App)
      .get('/media/hls/video1/240p/abcdefghij12_00000.ts')
      .expect(403);
  });
});
