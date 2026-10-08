import { getTranslations } from 'next-intl/server';

const SOLAR_URL = 'https://github.com/480-Design/Solar-Icon-Set';
const CC_BY_URL = 'https://creativecommons.org/licenses/by/4.0/deed.fr';

/**
 * Attribution des ressources tierces exigée par leur licence (Solar, CC BY 4.0), affichée sur
 * À propos et les mentions légales. Liste complète : THIRD_PARTY_NOTICES.md.
 */
export async function Credits() {
  const t = await getTranslations('legal');
  const link = (href: string, rel: string) =>
    function ExternalLink(chunks: React.ReactNode) {
      return (
        <a href={href} rel={rel} className="text-accent-text underline">
          {chunks}
        </a>
      );
    };
  return (
    <section aria-labelledby="credits" className="mt-16 max-w-3xl">
      <h2 id="credits" className="text-xl">
        {t('credits')}
      </h2>
      <p className="mt-3 text-sm text-muted">
        {t.rich('creditsIcons', {
          solar: link(SOLAR_URL, 'noopener'),
          license: link(CC_BY_URL, 'license noopener'),
        })}
      </p>
    </section>
  );
}
