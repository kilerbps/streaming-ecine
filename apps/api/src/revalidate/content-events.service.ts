import { Global, Inject, Injectable, Logger, Module } from '@nestjs/common';
import { ENV, type Env } from '../config/env.js';
import { hmacHex } from '../common/crypto.js';
import { CacheService } from '../redis/cache.service.js';

export type ContentEntity =
  | 'film'
  | 'person'
  | 'article'
  | 'post'
  | 'page'
  | 'team'
  | 'settings'
  | 'category'
  | 'redirect'
  | 'video';

/** Espaces de cache Redis touchés par chaque type de contenu. */
const CACHE_NAMESPACES: Record<ContentEntity, string[]> = {
  film: ['films', 'feed', 'categories', 'people', 'articles', 'search', 'playback'],
  person: ['people', 'films', 'search'],
  article: ['articles', 'feed', 'search'],
  post: ['feed'],
  page: ['pages'],
  team: ['team'],
  settings: ['settings'],
  category: ['categories', 'films', 'search'],
  redirect: [],
  video: ['playback', 'films', 'feed'],
};

/**
 * Étiquettes de revalidation Next.js (partagées avec apps/web/src/server/api-client.ts).
 * Liste : `films`, `film:{slug}`, `people`, `person:{slug}`, `articles`, `article:{slug}`, `feed`,
 * `pages`, `page:{slug}`, `team`, `settings`, `categories`, `sitemap`.
 */
function tagsFor(entity: ContentEntity, slugs: string[]): string[] {
  switch (entity) {
    case 'film':
    case 'video':
      return ['films', 'feed', 'categories', 'people', 'sitemap', ...slugs.map((s) => `film:${s}`)];
    case 'person':
      return ['people', 'films', 'sitemap', ...slugs.map((s) => `person:${s}`)];
    case 'article':
      return ['articles', 'feed', 'sitemap', ...slugs.map((s) => `article:${s}`)];
    case 'post':
      return ['feed'];
    case 'page':
      return ['pages', 'sitemap', ...slugs.map((s) => `page:${s}`)];
    case 'team':
      return ['team'];
    case 'settings':
      return ['settings'];
    case 'category':
      return ['categories', 'films'];
    case 'redirect':
      return [];
  }
}

/**
 * À appeler après toute écriture de contenu : invalide le cache Redis puis demande à Next.js
 * de revalider ses pages (webhook signé HMAC-SHA256 + horodatage anti-rejeu).
 */
@Injectable()
export class ContentEventsService {
  private readonly logger = new Logger(ContentEventsService.name);

  constructor(
    private readonly cache: CacheService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async changed(
    entity: ContentEntity,
    slugs: Array<string | null | undefined> = [],
  ): Promise<void> {
    const cleanSlugs = slugs.filter((s): s is string => Boolean(s));
    await this.cache.invalidate(...CACHE_NAMESPACES[entity]);
    const tags = [...new Set(tagsFor(entity, cleanSlugs))];
    if (tags.length > 0) await this.revalidate(tags);
  }

  private async revalidate(tags: string[]): Promise<void> {
    if (!this.env.REVALIDATE_URL) return;
    const body = JSON.stringify({ tags });
    const timestamp = String(Date.now());
    try {
      const res = await fetch(this.env.REVALIDATE_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-ecine-timestamp': timestamp,
          'x-ecine-signature': `sha256=${hmacHex(this.env.REVALIDATE_SECRET, `${timestamp}.${body}`)}`,
        },
        body,
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) this.logger.warn(`Revalidation refusée par Next.js (HTTP ${res.status})`);
    } catch (err) {
      // Le site se mettra à jour à l'expiration naturelle du cache : pas d'échec de l'écriture.
      this.logger.warn(`Revalidation Next.js injoignable : ${(err as Error).message}`);
    }
  }
}

@Global()
@Module({ providers: [ContentEventsService], exports: [ContentEventsService] })
export class ContentEventsModule {}
