import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  articleDetailSchema,
  articleListQuerySchema,
  articleSummarySchema,
  categoryOverviewSchema,
  cursorQuerySchema,
  feedPageSchema,
  feedQuerySchema,
  filmDetailSchema,
  filmListQuerySchema,
  filmSummarySchema,
  homeSchema,
  idSchema,
  pageSchema,
  personDetailSchema,
  personSummarySchema,
  postSchema,
  searchQuerySchema,
  searchResultsSchema,
  siteSettingsSchema,
  slugSchema,
  staticPageSchema,
  teamMemberSchema,
  type ArticleDetail,
  type ArticleSummary,
  type CategoryOverview,
  type FeedPage,
  type FilmDetail,
  type FilmSummary,
  type Home,
  type Page,
  type PersonDetail,
  type PersonSummary,
  type Post,
  type SearchResults,
  type SiteSettings,
  type StaticPage,
  type TeamMember,
} from '@ecine/contracts';
import { z } from 'zod';
import { QuerySchema, Returns } from '../common/contract.decorators.js';
import { ProblemException } from '../common/problem.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { Public } from '../auth/decorators.js';
import { FeedService } from '../feed/feed.service.js';
import { SearchService } from '../search/search.service.js';
import { EditorialService } from './editorial.service.js';
import { FilmsService } from './films.service.js';
import { HomeService } from './home.service.js';
import { RequestLocale } from './locale.decorator.js';
import { PeopleService } from './people.service.js';

const withLocale = <T extends z.ZodObject>(schema: T) =>
  schema.extend({ locale: z.string().max(5).optional() });
const redirectQuery = z.strictObject({
  path: z
    .string()
    .regex(/^\/[^\s]*$/)
    .max(512),
});

/** Lectures publiques : cache court côté HTTP (Redis + revalidation par étiquettes côté Next.js). */
function publicCache(res: Response, seconds = 60): void {
  res.setHeader(
    'Cache-Control',
    `public, max-age=${seconds}, stale-while-revalidate=${seconds * 5}`,
  );
}

@ApiTags('public')
@Public()
@Controller()
export class ContentController {
  constructor(
    private readonly films: FilmsService,
    private readonly homeService: HomeService,
    private readonly people: PeopleService,
    private readonly editorial: EditorialService,
    private readonly feed: FeedService,
    private readonly searchService: SearchService,
  ) {}

  @Get('feed')
  @QuerySchema(feedQuerySchema)
  @Returns(feedPageSchema)
  getFeed(
    @Query(new ZodPipe(withLocale(feedQuerySchema))) q: z.infer<typeof feedQuerySchema>,
    @RequestLocale() locale: string,
  ): Promise<FeedPage> {
    return this.feed.page(q, locale);
  }

  @Get('films')
  @QuerySchema(filmListQuerySchema)
  @Returns(pageSchema(filmSummarySchema))
  listFilms(
    @Query(new ZodPipe(withLocale(filmListQuerySchema))) q: z.infer<typeof filmListQuerySchema>,
    @RequestLocale() locale: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Page<FilmSummary>> {
    publicCache(res);
    return this.films.list(q, locale);
  }

  @Get('films/:slug')
  @Returns(filmDetailSchema)
  film(
    @Param('slug', new ZodPipe(slugSchema)) slug: string,
    @RequestLocale() locale: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<FilmDetail> {
    publicCache(res);
    return this.films.detail(slug, locale);
  }

  /** Accueil en rangées : affiche à la une et rangées automatiques ou programmées (lot 3). */
  @Get('home')
  @Returns(homeSchema)
  home(@RequestLocale() locale: string, @Res({ passthrough: true }) res: Response): Promise<Home> {
    publicCache(res, 120);
    return this.homeService.home(locale);
  }

  @Get('categories')
  @Returns(z.array(categoryOverviewSchema))
  categories(
    @RequestLocale() locale: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CategoryOverview[]> {
    publicCache(res, 300);
    return this.films.categories(locale);
  }

  @Get('people')
  @Returns(pageSchema(personSummarySchema))
  listPeople(
    @Query(new ZodPipe(withLocale(cursorQuerySchema))) q: z.infer<typeof cursorQuerySchema>,
    @RequestLocale() locale: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Page<PersonSummary>> {
    publicCache(res);
    return this.people.list(q.limit, q.cursor, locale);
  }

  @Get('people/:slug')
  @Returns(personDetailSchema)
  person(
    @Param('slug', new ZodPipe(slugSchema)) slug: string,
    @RequestLocale() locale: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PersonDetail> {
    publicCache(res);
    return this.people.detail(slug, locale);
  }

  @Get('articles')
  @QuerySchema(articleListQuerySchema)
  @Returns(pageSchema(articleSummarySchema))
  listArticles(
    @Query(new ZodPipe(withLocale(articleListQuerySchema)))
    q: z.infer<typeof articleListQuerySchema>,
    @RequestLocale() locale: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Page<ArticleSummary>> {
    publicCache(res);
    return this.editorial.listArticles(q.kind, q.limit, q.cursor, locale);
  }

  @Get('articles/:slug')
  @Returns(articleDetailSchema)
  article(
    @Param('slug', new ZodPipe(slugSchema)) slug: string,
    @RequestLocale() locale: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ArticleDetail> {
    publicCache(res);
    return this.editorial.article(slug, locale);
  }

  @Get('posts/:id')
  @Returns(postSchema)
  post(
    @Param('id', new ZodPipe(idSchema)) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Post> {
    publicCache(res);
    return this.editorial.post(id);
  }

  @Get('search')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @QuerySchema(searchQuerySchema)
  @Returns(searchResultsSchema)
  search(
    @Query(new ZodPipe(withLocale(searchQuerySchema))) q: z.infer<typeof searchQuerySchema>,
    @RequestLocale() locale: string,
  ): Promise<SearchResults> {
    return this.searchService.search(q.q, q.limit, locale);
  }

  @Get('pages/:slug')
  @Returns(staticPageSchema)
  page(
    @Param('slug', new ZodPipe(slugSchema)) slug: string,
    @RequestLocale() locale: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StaticPage> {
    publicCache(res, 300);
    return this.editorial.page(slug, locale);
  }

  @Get('team')
  @Returns(z.array(teamMemberSchema))
  team(@Res({ passthrough: true }) res: Response): Promise<TeamMember[]> {
    publicCache(res, 300);
    return this.editorial.team();
  }

  @Get('site-settings')
  @Returns(siteSettingsSchema)
  settings(@Res({ passthrough: true }) res: Response): Promise<SiteSettings> {
    publicCache(res, 300);
    return this.editorial.settings();
  }

  /** Résolution des anciennes URLs (changement de slug → 301, aucun lien cassé). */
  @Get('redirects/resolve')
  async resolveRedirect(
    @Query(new ZodPipe(redirectQuery)) q: z.infer<typeof redirectQuery>,
  ): Promise<{ toPath: string; status: number }> {
    const redirect = await this.editorial.resolveRedirect(q.path);
    if (!redirect) throw ProblemException.notFound();
    return redirect;
  }
}
