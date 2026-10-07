import type { Metadata } from 'next';
import { adminCategorySchema, adminFilmSchema, publishCheckSchema } from '@ecine/contracts';
import { z } from 'zod';
import { StateBadge } from '@/components/admin/badges';
import { EDITOR_ASIDE_EXTRA, EDITOR_GRID } from '@/components/admin/editor-kit';
import { FilmEditor } from '@/components/admin/film-editor';
import { FILM_KIND_LABELS } from '@/components/admin/labels';
import { PageHeader } from '@/components/admin/page-header';
import { AccessDenied, LoadProblem } from '@/components/admin/problems';
import { VideoPanel } from '@/components/admin/video-panel';
import { adminLoad, enc, viewerHasRole } from '@/server/actions/admin/core';

export const metadata: Metadata = { title: 'Film' };

export default async function EditFilmPage({ params }: PageProps<'/admin/films/[id]'>) {
  if (!(await viewerHasRole('EDITOR'))) return <AccessDenied />;
  const { id } = await params;
  const [film, categories, check] = await Promise.all([
    adminLoad(adminFilmSchema, `/admin/films/${enc(id)}`),
    adminLoad(z.array(adminCategorySchema), '/admin/categories'),
    adminLoad(publishCheckSchema, `/admin/films/${enc(id)}/publish-check`),
  ]);
  if (!film.ok) return <LoadProblem failure={film} />;
  if (!categories.ok) return <LoadProblem failure={categories} />;

  return (
    <>
      <PageHeader
        title={film.data.title || 'Film sans titre'}
        back={{ href: '/admin/films', label: 'Films' }}
        badges={
          <>
            <StateBadge state={film.data.state} deleted={film.data.deletedAt !== null} />
            <span className="meta">
              {[FILM_KIND_LABELS[film.data.kind], film.data.year].filter(Boolean).join(' · ')}
            </span>
          </>
        }
      />
      <div className={EDITOR_GRID}>
        <FilmEditor
          key={film.data.updatedAt}
          film={film.data}
          categories={categories.data}
          check={check.ok ? check.data : null}
        />
        <div className={EDITOR_ASIDE_EXTRA}>
          <VideoPanel
            filmId={film.data.id}
            videos={film.data.videos}
            disabled={film.data.deletedAt !== null}
          />
        </div>
      </div>
    </>
  );
}
