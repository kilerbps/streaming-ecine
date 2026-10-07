import type { Metadata } from 'next';
import { adminArticleSchema, adminFilmSchema, publishCheckSchema } from '@ecine/contracts';
import { ArticleEditor } from '@/components/admin/article-editor';
import { StateBadge } from '@/components/admin/badges';
import { EDITOR_GRID } from '@/components/admin/editor-kit';
import { ARTICLE_KIND_LABELS } from '@/components/admin/labels';
import { PageHeader } from '@/components/admin/page-header';
import { AccessDenied, LoadProblem } from '@/components/admin/problems';
import { adminLoad, enc, viewerHasRole } from '@/server/actions/admin/core';
import { privateRequest } from '@/server/api-client';

export const metadata: Metadata = { title: 'Actualité' };

/** Titre du film mis en avant (affichage seulement : un échec n'empêche pas d'éditer l'actualité). */
async function featuredTitle(filmId: string | null): Promise<{ id: string; title: string } | null> {
  if (!filmId) return null;
  try {
    const film = await privateRequest(adminFilmSchema, `/admin/films/${enc(filmId)}`);
    return { id: filmId, title: film.title };
  } catch {
    return { id: filmId, title: 'Film sélectionné' };
  }
}

export default async function EditArticlePage({ params }: PageProps<'/admin/actualites/[id]'>) {
  if (!(await viewerHasRole('EDITOR'))) return <AccessDenied />;
  const { id } = await params;
  const [article, check] = await Promise.all([
    adminLoad(adminArticleSchema, `/admin/articles/${enc(id)}`),
    adminLoad(publishCheckSchema, `/admin/articles/${enc(id)}/publish-check`),
  ]);
  if (!article.ok) return <LoadProblem failure={article} />;
  const featured = await featuredTitle(article.data.featuredFilmId);
  return (
    <>
      <PageHeader
        title={article.data.title || 'Sans titre'}
        back={{ href: '/admin/actualites', label: 'Actualités' }}
        badges={
          <>
            <StateBadge state={article.data.state} deleted={article.data.deletedAt !== null} />
            <span className="meta">{ARTICLE_KIND_LABELS[article.data.kind]}</span>
          </>
        }
      />
      <div className={EDITOR_GRID}>
        <ArticleEditor
          key={article.data.updatedAt}
          article={article.data}
          featuredFilm={featured}
          check={check.ok ? check.data : null}
        />
      </div>
    </>
  );
}
