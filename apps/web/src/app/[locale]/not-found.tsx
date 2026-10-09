import { getTranslations } from 'next-intl/server';
import { SearchBox } from '@/components/features/search/search-box';
import { LinkButton } from '@/components/ui/link-button';
import { SystemMessage } from '@/components/ui/system-message';
import { routes } from '@/lib/routes';

/** 404 utile (FR-132) : recherche et un seul bouton « Revenir à l'accueil ». Statut HTTP 404 réel. */
export default async function NotFound() {
  const t = await getTranslations('errors');
  return (
    <SystemMessage
      illustration="missing"
      label={t('notFoundLabel')}
      title={t('notFoundTitle')}
      actions={
        <>
          <div className="max-w-lg">
            <SearchBox locale="fr" />
          </div>
          <LinkButton href={routes.home('fr')} variant="primary" size="lg" className="self-start">
            {t('backHome')}
          </LinkButton>
        </>
      }
    >
      {t('notFoundBody')}
    </SystemMessage>
  );
}
