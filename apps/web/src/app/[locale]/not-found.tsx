import { getTranslations } from 'next-intl/server';
import { SearchBox } from '@/components/features/search/search-box';
import { LinkButton } from '@/components/ui/link-button';
import { Motif } from '@/components/ui/motif';
import { routes } from '@/lib/routes';

/** 404 utile (FR-132) : recherche + un seul CTA « Revenir à l'accueil », motif graphique. Statut HTTP 404 réel. */
export default async function NotFound() {
  const t = await getTranslations('errors');
  return (
    <div className="container-page grid gap-10 py-12 md:grid-cols-[1fr_1.4fr] md:items-center md:py-24">
      <div className="aspect-[3/1] w-full max-w-sm md:aspect-square">
        <Motif name="losanges" tone="highlight" />
      </div>
      <div>
        <p className="meta">Erreur 404</p>
        <h1 className="mt-3 font-serif text-4xl md:text-6xl">{t('notFoundTitle')}</h1>
        <p className="mt-4 max-w-lg text-lg text-muted">{t('notFoundBody')}</p>
        <div className="mt-6 max-w-lg">
          <SearchBox locale="fr" />
        </div>
        <LinkButton href={routes.home('fr')} variant="primary" size="lg" className="mt-8">
          {t('backHome')}
        </LinkButton>
      </div>
    </div>
  );
}
