import type { Metadata } from 'next';
import Link from 'next/link';
import { adminHomeSchema } from '@ecine/contracts';
import { HomeProgrammer } from '@/components/admin/home-programmer';
import { PageHeader } from '@/components/admin/page-header';
import { AccessDenied, LoadProblem } from '@/components/admin/problems';
import { adminLoad, viewerHasRole } from '@/server/actions/admin/core';

export const metadata: Metadata = { title: 'Accueil' };

export default async function AdminHomePage() {
  if (!(await viewerHasRole('EDITOR'))) return <AccessDenied />;
  const home = await adminLoad(adminHomeSchema, '/admin/home');
  return (
    <>
      <PageHeader
        title="Accueil"
        description={
          <>
            Affiche à la une, rangées éditoriales et talents à l’honneur ; les changements
            s’appliquent dès l’enregistrement ou à l’heure programmée.{' '}
            <Link href="/fr" className="underline underline-offset-4" target="_blank">
              Voir l’accueil
            </Link>
          </>
        }
      />
      {home.ok ? (
        // Nouvelle clé après chaque enregistrement : le formulaire repart des données de l'API.
        <HomeProgrammer key={JSON.stringify(home.data)} home={home.data} />
      ) : (
        <LoadProblem failure={home} />
      )}
    </>
  );
}
