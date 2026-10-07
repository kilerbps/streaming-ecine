import type { Metadata } from 'next';
import { adminCategorySchema } from '@ecine/contracts';
import { z } from 'zod';
import { CategoriesManager } from '@/components/admin/categories-manager';
import { PageHeader } from '@/components/admin/page-header';
import { AccessDenied, LoadProblem } from '@/components/admin/problems';
import { adminLoad, viewerHasRole } from '@/server/actions/admin/core';

export const metadata: Metadata = { title: 'Catégories' };

export default async function AdminCategoriesPage() {
  if (!(await viewerHasRole('EDITOR'))) return <AccessDenied />;
  const categories = await adminLoad(z.array(adminCategorySchema), '/admin/categories');
  return (
    <>
      <PageHeader
        title="Catégories"
        description="Genres du catalogue, affichés sur les fiches et dans les filtres du site."
      />
      {categories.ok ? (
        <CategoriesManager categories={categories.data} />
      ) : (
        <LoadProblem failure={categories} />
      )}
    </>
  );
}
