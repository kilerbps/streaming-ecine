import 'reflect-metadata';
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Logger } from '@nestjs/common';
import { IMAGE_WIDTHS } from '@ecine/contracts';
import { z } from 'zod';
import { PasswordService } from '../auth/password.service.js';
import { ProblemException } from '../common/problem.js';
import { type Env, loadEnv } from '../config/env.js';
import { processImage } from '../media/image-processing.js';
import { storageFile } from '../media/storage.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { coverSvg, MOTIF_LABELS, portraitSvg, posterSvg, renderSvg, squareSvg } from './artwork.js';
import {
  DEMO_ARTICLES,
  DEMO_CATEGORIES,
  DEMO_FILMS,
  DEMO_PAGES,
  DEMO_PEOPLE,
  DEMO_POSTS,
  DEMO_RIGHTS_NOTE,
  pageBody,
} from './demo-data.js';

/**
 * Données de démonstration (dist/seed/seed.js, `pnpm --filter @ecine/api db:seed`).
 * Idempotent : ce qui existe déjà (même slug, même e-mail) n'est jamais modifié ni écrasé.
 * Refuse de s'exécuter en production. Aucun membre d'équipe n'est créé (saisie par le propriétaire).
 */

const logger = new Logger('Seed');
const LOCALE = 'fr';
const DAY_MS = 24 * 3600 * 1000;

const seedEnvSchema = z.object({
  SEED_ADMIN_EMAIL: z.email('SEED_ADMIN_EMAIL : adresse e-mail valide requise'),
  SEED_ADMIN_PASSWORD: z.string().min(12, 'SEED_ADMIN_PASSWORD : 12 caractères au moins'),
});

/** Identifiant stable (même forme qu'un cuid) : relancer le script ne duplique ni images ni publications. */
function seedId(key: string): string {
  return `c${createHash('sha256').update(`ecine-seed:${key}`).digest('hex').slice(0, 24)}`;
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

class Seeder {
  private readonly passwords = new PasswordService();
  private created = 0;
  private skipped = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly env: Env,
  ) {}

  async run(admin: { email: string; password: string }): Promise<void> {
    const adminId = await this.admin(admin.email, admin.password);
    const categories = await this.categories();
    const people = await this.people();
    const films = await this.films(categories, people);
    await this.articles(adminId, films);
    await this.posts(adminId);
    await this.pages();
    await this.settings();
    logger.log(`Terminé : ${this.created} élément(s) créé(s), ${this.skipped} déjà présent(s).`);
  }

  /** Image générée puis traitée comme un envoi réel (storage/images/{id}/w{largeur}.webp). */
  private async image(key: string, svg: string, alt: string): Promise<string> {
    const id = seedId(`image:${key}`);
    const storageKey = `images/${id}`;
    const dir = storageFile(this.env, storageKey);
    const existing = await this.prisma.media.findUnique({ where: { id } });
    if (existing && existsSync(join(dir, `w${IMAGE_WIDTHS[0]}.webp`))) return id;

    const processed = await processImage(await renderSvg(svg), dir);
    await this.prisma.media.upsert({
      where: { id },
      create: {
        id,
        kind: 'IMAGE',
        storageKey,
        mime: 'image/webp',
        bytes: processed.bytes,
        width: processed.width,
        height: processed.height,
        alt,
      },
      update: { bytes: processed.bytes, width: processed.width, height: processed.height },
    });
    return id;
  }

  private async admin(email: string, password: string): Promise<string> {
    const normalized = email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (existing) {
      if (existing.role !== 'SUPER_ADMIN') {
        await this.prisma.user.update({
          where: { id: existing.id },
          data: { role: 'SUPER_ADMIN' },
        });
        logger.log('Compte existant promu SUPER_ADMIN (mot de passe inchangé).');
      } else {
        logger.log('Compte SUPER_ADMIN déjà présent (mot de passe inchangé).');
      }
      this.skipped += 1;
      return existing.id;
    }
    this.passwords.assertAcceptable(password, normalized);
    const user = await this.prisma.user.create({
      data: {
        email: normalized,
        passwordHash: await this.passwords.hash(password),
        displayName: 'Administrateur E-Ciné',
        role: 'SUPER_ADMIN',
        emailVerified: new Date(),
      },
    });
    this.created += 1;
    logger.log(
      'Compte SUPER_ADMIN créé. Activez la double authentification dès la première connexion.',
    );
    return user.id;
  }

  private async categories(): Promise<Map<string, string>> {
    const ids = new Map<string, string>();
    for (const c of DEMO_CATEGORIES) {
      const existing = await this.prisma.category.findUnique({
        where: { slug: c.slug },
        select: { id: true },
      });
      if (existing) {
        this.skipped += 1;
        ids.set(c.slug, existing.id);
        continue;
      }
      const row = await this.prisma.category.create({
        data: { slug: c.slug, translations: { create: { locale: LOCALE, name: c.name } } },
      });
      this.created += 1;
      ids.set(c.slug, row.id);
    }
    return ids;
  }

  private async people(): Promise<Map<string, string>> {
    const ids = new Map<string, string>();
    for (const p of DEMO_PEOPLE) {
      const existing = await this.prisma.person.findUnique({
        where: { slug: p.slug },
        select: { id: true },
      });
      if (existing) {
        this.skipped += 1;
        ids.set(p.slug, existing.id);
        continue;
      }
      const photoId = await this.image(
        `person:${p.slug}`,
        portraitSvg({ initials: p.initials, palette: p.palette }),
        `Portrait illustré de ${p.name} : initiales « ${p.initials} » sur un disque de couleur, fond ${p.palette.name}.`,
      );
      const row = await this.prisma.person.create({
        data: {
          slug: p.slug,
          state: 'PUBLISHED',
          photoId,
          birthYear: p.birthYear ?? null,
          socials: {},
          translations: { create: { locale: LOCALE, name: p.name, bio: p.bio } },
        },
      });
      this.created += 1;
      ids.set(p.slug, row.id);
    }
    return ids;
  }

  private async films(
    categories: Map<string, string>,
    people: Map<string, string>,
  ): Promise<Map<string, string>> {
    const ids = new Map<string, string>();
    for (const f of DEMO_FILMS) {
      const existing = await this.prisma.film.findUnique({
        where: { slug: f.slug },
        select: { id: true },
      });
      if (existing) {
        this.skipped += 1;
        ids.set(f.slug, existing.id);
        continue;
      }
      const kicker = DEMO_CATEGORIES.find((c) => c.slug === f.categories[0])?.name ?? 'Film';
      const posterId = await this.image(
        `poster:${f.slug}`,
        posterSvg({ title: f.title, kicker, palette: f.palette, motif: f.motif }),
        `Affiche illustrée du film « ${f.title} » : titre en lettres ${f.palette.inkName} sur fond ${f.palette.name}, avec ${MOTIF_LABELS[f.motif]}.`,
      );
      const row = await this.prisma.film.create({
        data: {
          slug: f.slug,
          kind: f.kind,
          state: 'PUBLISHED',
          publishAt: daysAgo(f.daysAgo),
          year: f.year,
          runtimeSec: f.runtimeSec,
          ageRating: f.ageRating ?? null,
          rightsNote: DEMO_RIGHTS_NOTE,
          rightsOk: true,
          posterId,
          translations: { create: { locale: LOCALE, title: f.title, synopsis: f.synopsis } },
          categories: {
            create: f.categories.map((slug) => ({ categoryId: categories.get(slug)! })),
          },
          credits: {
            create: f.credits.map((c, position) => ({
              personId: people.get(c.person)!,
              role: c.role,
              character: c.character ?? null,
              position,
            })),
          },
        },
      });
      this.created += 1;
      ids.set(f.slug, row.id);
    }
    return ids;
  }

  private async articles(authorId: string, films: Map<string, string>): Promise<void> {
    for (const a of DEMO_ARTICLES) {
      if (await this.prisma.article.findUnique({ where: { slug: a.slug }, select: { id: true } })) {
        this.skipped += 1;
        continue;
      }
      const coverId = await this.image(
        `cover:${a.slug}`,
        coverSvg({ title: a.title, label: a.label, palette: a.palette, motif: a.motif }),
        `Illustration de l’article « ${a.title} » : titre en lettres ${a.palette.inkName} sur fond ${a.palette.name}, avec ${MOTIF_LABELS[a.motif]}.`,
      );
      await this.prisma.article.create({
        data: {
          slug: a.slug,
          kind: a.kind,
          state: 'PUBLISHED',
          publishAt: daysAgo(a.daysAgo),
          coverId,
          authorId,
          eventStart:
            a.eventInDays === undefined ? null : new Date(Date.now() + a.eventInDays * DAY_MS),
          eventPlace: a.eventPlace ?? null,
          featuredFilmId: a.featuredFilm ? (films.get(a.featuredFilm) ?? null) : null,
          translations: {
            create: { locale: LOCALE, title: a.title, excerpt: a.excerpt, body: a.body },
          },
        },
      });
      this.created += 1;
    }
  }

  private async posts(authorId: string): Promise<void> {
    for (const p of DEMO_POSTS) {
      const id = seedId(`post:${p.key}`);
      if (await this.prisma.post.findUnique({ where: { id }, select: { id: true } })) {
        this.skipped += 1;
        continue;
      }
      const mediaIds: string[] = [];
      for (const [i, img] of p.images.entries()) {
        mediaIds.push(
          await this.image(
            `post:${p.key}:${i}`,
            squareSvg({ caption: img.caption, palette: img.palette, motif: img.motif }),
            img.alt,
          ),
        );
      }
      await this.prisma.post.create({
        data: {
          id,
          state: 'PUBLISHED',
          publishAt: daysAgo(p.daysAgo),
          authorId,
          caption: p.caption,
          locale: LOCALE,
          images: { create: mediaIds.map((mediaId, position) => ({ mediaId, position })) },
        },
      });
      this.created += 1;
    }
  }

  private async pages(): Promise<void> {
    for (const page of DEMO_PAGES) {
      if (
        await this.prisma.staticPage.findUnique({
          where: { slug: page.slug },
          select: { id: true },
        })
      ) {
        this.skipped += 1;
        continue;
      }
      await this.prisma.staticPage.create({
        data: {
          slug: page.slug,
          state: 'PUBLISHED',
          translations: { create: { locale: LOCALE, title: page.title, body: pageBody(page) } },
        },
      });
      this.created += 1;
    }
  }

  private async settings(): Promise<void> {
    const existing = await this.prisma.siteSettings.findUnique({ where: { id: 1 } });
    if (existing) {
      this.skipped += 1;
      return;
    }
    await this.prisma.siteSettings.create({
      data: {
        id: 1,
        contactEmail: 'contact@e-cine.example',
        phone: null,
        socials: {},
        adsEnabled: false,
      },
    });
    this.created += 1;
  }
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Le seed de démonstration est interdit en production (NODE_ENV=production).');
  }
  const seedEnv = seedEnvSchema.safeParse(process.env);
  if (!seedEnv.success) {
    throw new Error(
      `Variables du seed invalides :\n${seedEnv.error.issues.map((i) => `  - ${i.message}`).join('\n')}`,
    );
  }
  const env = loadEnv();
  if (env.NODE_ENV === 'production')
    throw new Error('Le seed de démonstration est interdit en production.');

  const prisma = new PrismaService(env);
  try {
    await new Seeder(prisma, env).run({
      email: seedEnv.data.SEED_ADMIN_EMAIL,
      password: seedEnv.data.SEED_ADMIN_PASSWORD,
    });
  } finally {
    await prisma.$disconnect();
  }
}

try {
  await main();
} catch (err) {
  const message =
    err instanceof ProblemException ? (err.problem.detail ?? err.message) : (err as Error).message;
  logger.error(`Échec du seed : ${message}`);
  process.exitCode = 1;
}
