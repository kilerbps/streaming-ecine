import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { ServiceOnly } from '../auth/decorators.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MediaUrls, visibleWhere } from './content.helpers.js';

export interface SitemapEntry {
  slug: string;
  updatedAt: string;
  /** Image principale (affiche, portrait, couverture), variante 1280 px : sitemap d'images. */
  image?: string | null;
}

export interface SitemapData {
  films: SitemapEntry[];
  people: SitemapEntry[];
  articles: SitemapEntry[];
  pages: SitemapEntry[];
  categories: SitemapEntry[];
  /** Publications (photo et texte) : identifiant à la place du slug. */
  posts: Array<{ id: string; updatedAt: string; image: string | null }>;
}

type MediaRef = { id: string; width: number | null; height: number | null } | null;

/** Données du sitemap, réservées au serveur Next.js (clé de service). */
@ApiExcludeController()
@ServiceOnly()
@SkipThrottle()
@Controller('sitemap-data')
export class SitemapController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly urls: MediaUrls,
  ) {}

  @Get()
  async data(): Promise<SitemapData> {
    const media = { select: { id: true, width: true, height: true } } as const;
    const visible = visibleWhere();
    const [films, people, articles, pages, categories, posts] = await Promise.all([
      this.prisma.film.findMany({
        where: { ...visible, seoNoIndex: false },
        select: { slug: true, updatedAt: true, poster: media },
      }),
      this.prisma.person.findMany({
        where: { state: 'PUBLISHED', deletedAt: null },
        select: { slug: true, updatedAt: true, photo: media },
      }),
      this.prisma.article.findMany({
        where: visible,
        select: { slug: true, updatedAt: true, cover: media },
      }),
      this.prisma.staticPage.findMany({
        where: { state: 'PUBLISHED' },
        select: { slug: true, updatedAt: true },
      }),
      // Une catégorie change quand ses films changent : date du film visible le plus récent.
      this.prisma.category.findMany({
        where: { films: { some: { film: visible } } },
        select: {
          slug: true,
          createdAt: true,
          films: {
            where: { film: visible },
            select: { film: { select: { updatedAt: true } } },
            orderBy: { film: { updatedAt: 'desc' } },
            take: 1,
          },
        },
      }),
      this.prisma.post.findMany({
        where: visible,
        select: {
          id: true,
          updatedAt: true,
          images: { orderBy: { position: 'asc' }, take: 1, select: { media } },
        },
      }),
    ]);
    const image = (ref: MediaRef) => {
      const src = this.urls.image(ref ? { ...ref, alt: null, decorative: false } : null)?.src;
      return src ? `${src}/w1280.webp` : null;
    };
    return {
      films: films.map((f) => ({
        slug: f.slug,
        updatedAt: f.updatedAt.toISOString(),
        image: image(f.poster),
      })),
      people: people.map((p) => ({
        slug: p.slug,
        updatedAt: p.updatedAt.toISOString(),
        image: image(p.photo),
      })),
      articles: articles.map((a) => ({
        slug: a.slug,
        updatedAt: a.updatedAt.toISOString(),
        image: image(a.cover),
      })),
      pages: pages.map((p) => ({ slug: p.slug, updatedAt: p.updatedAt.toISOString() })),
      categories: categories.map((c) => ({
        slug: c.slug,
        updatedAt: (c.films[0]?.film.updatedAt ?? c.createdAt).toISOString(),
      })),
      posts: posts.map((p) => ({
        id: p.id,
        updatedAt: p.updatedAt.toISOString(),
        image: image(p.images[0]?.media ?? null),
      })),
    };
  }
}
