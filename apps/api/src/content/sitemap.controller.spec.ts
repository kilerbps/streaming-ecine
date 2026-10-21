import { describe, expect, it, vi } from 'vitest';
import type { Env } from '../config/env.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { MediaUrls } from './content.helpers.js';
import { SitemapController } from './sitemap.controller.js';

const day = (d: number) => new Date(Date.UTC(2026, 9, d));
const media = { id: 'm1', width: 1000, height: 1500 };

function controller() {
  const prisma = {
    film: {
      findMany: vi.fn().mockResolvedValue([{ slug: 'kin', updatedAt: day(20), poster: media }]),
    },
    person: {
      findMany: vi.fn().mockResolvedValue([{ slug: 'a-b', updatedAt: day(19), photo: null }]),
    },
    article: { findMany: vi.fn().mockResolvedValue([]) },
    staticPage: { findMany: vi.fn().mockResolvedValue([{ slug: 'cookies', updatedAt: day(1) }]) },
    category: {
      findMany: vi.fn().mockResolvedValue([
        { slug: 'drame', createdAt: day(2), films: [{ film: { updatedAt: day(18) } }] },
        { slug: 'vide', createdAt: day(3), films: [] },
      ]),
    },
    post: {
      findMany: vi.fn().mockResolvedValue([{ id: 'p1', updatedAt: day(17), images: [{ media }] }]),
    },
  };
  const urls = new MediaUrls({ MEDIA_PUBLIC_URL: 'https://media.ecine.art' } as Env);
  return { prisma, ctrl: new SitemapController(prisma as unknown as PrismaService, urls) };
}

describe('SitemapController', () => {
  it('donne dates, images 1280 px, publications et date des catégories', async () => {
    const { ctrl } = controller();
    const data = await ctrl.data();
    expect(data.films).toEqual([
      {
        slug: 'kin',
        updatedAt: day(20).toISOString(),
        image: 'https://media.ecine.art/images/m1/w1280.webp',
      },
    ]);
    expect(data.people[0]?.image).toBeNull();
    expect(data.posts).toEqual([
      {
        id: 'p1',
        updatedAt: day(17).toISOString(),
        image: 'https://media.ecine.art/images/m1/w1280.webp',
      },
    ]);
    // Catégorie : date du film visible le plus récent, sinon sa date de création.
    expect(data.categories).toEqual([
      { slug: 'drame', updatedAt: day(18).toISOString() },
      { slug: 'vide', updatedAt: day(3).toISOString() },
    ]);
  });

  it('exclut les films marqués « ne pas indexer »', async () => {
    const { ctrl, prisma } = controller();
    await ctrl.data();
    const [query] = prisma.film.findMany.mock.calls[0] as [{ where: { seoNoIndex: boolean } }];
    expect(query.where.seoNoIndex).toBe(false);
  });
});
