import type { Metadata } from 'next';
import { adminCategorySchema } from '@ecine/contracts';
import { z } from 'zod';
import { EDITOR_GRID } from '@/components/admin/editor-kit';
import { FilmEditor } from '@/components/admin/film-editor';
import { PageHeader } from '@/components/admin/page-header';
import { AccessDenied, LoadProblem } from '@/components/admin/problems';
import { adminLoad, viewerHasRole } from '@/server/actions/admin/core';

export const metadata: Metadata = { title: 'Nouveau film' };

export default async function NewFilmPage() {
  if (!(await viewerHasRole('EDITOR'))) return <AccessDenied />;
  const categories = await adminLoad(z.array(adminCategorySchema), '/admin/categories');
  if (!categories.ok) return <LoadProblem failure={categories} />;
  return (
    <>
      <PageHeader
        title="Nouveau film"
        back={{ href: '/admin/films', label: 'Films' }}
        description="Le film est créé en brouillon : il n’apparaît pas sur le site avant sa publication."
      />
      <div className={EDITOR_GRID}>
        <FilmEditor film={null} categories={categories.data} check={null} />
      </div>
    </>
  );
}
