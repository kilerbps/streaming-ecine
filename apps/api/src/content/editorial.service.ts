import { Injectable } from '@nestjs/common';
import type {
  ArticleDetail,
  ArticleKind,
  ArticleSummary,
  Page,
  Post,
  SiteSettings,
  StaticPage,
  TeamMember,
} from '@ecine/contracts';
import { socialsSchema } from '@ecine/contracts';
import { z } from 'zod';
import { decodeCursor, encodeCursor } from '../common/cursor.js';
import { ProblemException } from '../common/problem.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CacheService } from '../redis/cache.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { iso, localesFor, MediaUrls, pickTranslation, visibleWhere } from './content.helpers.js';
import { FilmMapper, filmSummaryInclude } from './film.mapper.js';

const listCursor = z.object({ p: z.iso.datetime(), i: z.string() });

export function articleSummaryInclude(locales: string[]) {
  return {
    translations: {
      where: { locale: { in: locales } },
      select: { locale: true, title: true, excerpt: true },
    },
    cover: true,
  } satisfies Prisma.ArticleInclude;
}
type ArticleWithSummary = Prisma.ArticleGetPayload<{
  include: ReturnType<typeof articleSummaryInclude>;
}>;

export const postInclude = {
  images: { orderBy: { position: 'asc' }, include: { media: true } },
} satisfies Prisma.PostInclude;
type PostWithImages = Prisma.PostGetPayload<{ include: typeof postInclude }>;

@Injectable()
export class EditorialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly media: MediaUrls,
    private readonly films: FilmMapper,
  ) {}

  articleSummary(article: ArticleWithSummary, locale: string): ArticleSummary {
    const t = pickTranslation(article.translations, locale);
    return {
      id: article.id,
      slug: article.slug,
      kind: article.kind,
      title: t?.title ?? article.slug,
      excerpt: t?.excerpt ?? '',
      cover: this.media.image(article.cover),
      publishedAt: (article.publishAt ?? article.createdAt).toISOString(),
      eventStart: iso(article.eventStart),
      eventPlace: article.eventPlace,
    };
  }

  postView(post: PostWithImages, likeCount: number): Post {
    return {
      id: post.id,
      caption: post.caption,
      images: post.images.map((i) => this.media.image(i.media)).filter((i) => i !== null),
      publishedAt: (post.publishAt ?? post.createdAt).toISOString(),
      likeCount,
    };
  }

  listArticles(
    kind: ArticleKind | undefined,
    limit: number,
    cursorRaw: string | undefined,
    locale: string,
  ): Promise<Page<ArticleSummary>> {
    return this.cache.wrap(
      'articles',
      `list:${locale}:${kind ?? ''}:${limit}:${cursorRaw ?? ''}`,
      120,
      async () => {
        const cursor = decodeCursor(cursorRaw, listCursor);
        const articles = await this.prisma.article.findMany({
          where: {
            ...visibleWhere(),
            ...(kind ? { kind } : {}),
            ...(cursor
              ? {
                  OR: [
                    { publishAt: { lt: new Date(cursor.p) } },
                    { publishAt: new Date(cursor.p), id: { lt: cursor.i } },
                  ],
                }
              : {}),
          },
          include: articleSummaryInclude(localesFor(locale)),
          orderBy: [{ publishAt: 'desc' }, { id: 'desc' }],
          take: limit + 1,
        });
        const page = articles.slice(0, limit);
        const last = page.at(-1);
        return {
          items: page.map((a) => this.articleSummary(a, locale)),
          nextCursor:
            articles.length > limit && last?.publishAt
              ? encodeCursor({ p: last.publishAt.toISOString(), i: last.id })
              : null,
        };
      },
    );
  }

  article(slug: string, locale: string): Promise<ArticleDetail> {
    return this.cache.wrap('articles', `detail:${locale}:${slug}`, 300, async () => {
      const locales = localesFor(locale);
      const article = await this.prisma.article.findFirst({
        where: { slug, ...visibleWhere() },
        include: {
          translations: { where: { locale: { in: locales } } },
          cover: true,
          author: { select: { displayName: true } },
          featuredFilm: { include: filmSummaryInclude(locales) },
        },
      });
      if (!article) throw ProblemException.notFound('Cette actualité est introuvable.');
      const t = pickTranslation(article.translations, locale);
      const featured =
        article.featuredFilm &&
        !article.featuredFilm.deletedAt &&
        article.featuredFilm.state === 'PUBLISHED'
          ? article.featuredFilm
          : null;
      return {
        ...this.articleSummary(article, locale),
        body: t?.body ?? '',
        author: { name: article.author.displayName },
        featuredFilm: featured ? this.films.summary(featured, locale) : null,
        seo: { title: t?.seoTitle ?? null, description: t?.seoDescription ?? null },
        updatedAt: article.updatedAt.toISOString(),
      };
    });
  }

  async post(id: string): Promise<Post> {
    const post = await this.prisma.post.findFirst({
      where: { id, ...visibleWhere() },
      include: postInclude,
    });
    if (!post) throw ProblemException.notFound('Cette publication est introuvable.');
    const likeCount = await this.prisma.like.count({ where: { targetType: 'POST', targetId: id } });
    return this.postView(post, likeCount);
  }

  page(slug: string, locale: string): Promise<StaticPage> {
    return this.cache.wrap('pages', `${locale}:${slug}`, 600, async () => {
      const page = await this.prisma.staticPage.findFirst({
        where: { slug, state: 'PUBLISHED' },
        include: { translations: { where: { locale: { in: localesFor(locale) } } } },
      });
      const t = page ? pickTranslation(page.translations, locale) : undefined;
      if (!page || !t) throw ProblemException.notFound('Cette page est introuvable.');
      return {
        slug: page.slug,
        title: t.title,
        body: t.body,
        version: page.version,
        updatedAt: page.updatedAt.toISOString(),
      };
    });
  }

  team(): Promise<TeamMember[]> {
    return this.cache.wrap('team', 'all', 600, async () => {
      const members = await this.prisma.teamMember.findMany({
        where: { visible: true },
        include: { photo: true },
        orderBy: [{ position: 'asc' }, { name: 'asc' }],
      });
      return members.map((m) => ({
        id: m.id,
        name: m.name,
        title: m.title,
        bio: m.bio,
        photo: this.media.image(m.photo),
      }));
    });
  }

  settings(): Promise<SiteSettings> {
    return this.cache.wrap('settings', 'site', 600, async () => {
      const settings = await this.prisma.siteSettings.findUnique({ where: { id: 1 } });
      const socials = socialsSchema.safeParse(settings?.socials ?? {});
      return {
        contactEmail: settings?.contactEmail ?? '',
        phone: settings?.phone ?? null,
        socials: socials.success ? socials.data : {},
        adsEnabled: settings?.adsEnabled ?? false,
      };
    });
  }

  async resolveRedirect(path: string): Promise<{ toPath: string; status: number } | null> {
    const redirect = await this.prisma.redirect.findUnique({ where: { fromPath: path } });
    return redirect ? { toPath: redirect.toPath, status: redirect.status } : null;
  }
}
