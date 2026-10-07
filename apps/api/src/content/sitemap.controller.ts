import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { ServiceOnly } from '../auth/decorators.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { visibleWhere } from './content.helpers.js';

interface SitemapEntry {
  slug: string;
  updatedAt: string;
}

/** Données du sitemap, réservées au serveur Next.js (clé de service). */
@ApiExcludeController()
@ServiceOnly()
@SkipThrottle()
@Controller('sitemap-data')
export class SitemapController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async data(): Promise<{
    films: SitemapEntry[];
    people: SitemapEntry[];
    articles: SitemapEntry[];
    pages: SitemapEntry[];
    categories: SitemapEntry[];
  }> {
    const select = { slug: true, updatedAt: true } as const;
    const [films, people, articles, pages, categories] = await Promise.all([
      this.prisma.film.findMany({ where: { ...visibleWhere(), seoNoIndex: false }, select }),
      this.prisma.person.findMany({ where: { state: 'PUBLISHED', deletedAt: null }, select }),
      this.prisma.article.findMany({ where: visibleWhere(), select }),
      this.prisma.staticPage.findMany({ where: { state: 'PUBLISHED' }, select }),
      this.prisma.category.findMany({
        where: { films: { some: { film: visibleWhere() } } },
        select: { slug: true, createdAt: true },
      }),
    ]);
    const map = (rows: Array<{ slug: string; updatedAt: Date }>) =>
      rows.map((r) => ({ slug: r.slug, updatedAt: r.updatedAt.toISOString() }));
    return {
      films: map(films),
      people: map(people),
      articles: map(articles),
      pages: map(pages),
      categories: categories.map((c) => ({ slug: c.slug, updatedAt: c.createdAt.toISOString() })),
    };
  }
}
