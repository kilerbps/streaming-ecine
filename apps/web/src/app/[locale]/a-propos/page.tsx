import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@ecine/contracts';
import { Poster } from '@/components/features/content/poster';
import { StaticPageView, staticPageMetadata } from '@/components/features/content/static-page';
import { getTeam } from '@/server/data';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/a-propos'>): Promise<Metadata> {
  const { locale } = await params;
  return staticPageMetadata(locale as Locale, 'a-propos');
}

/** À propos (FR-050) + équipe dirigeante gérée en administration (FR-051). */
export default async function AboutPage({ params }: PageProps<'/[locale]/a-propos'>) {
  const { locale } = await params;
  const [t, team] = await Promise.all([getTranslations('about'), getTeam().catch(() => [])]);
  return (
    <StaticPageView locale={locale as Locale} slug="a-propos">
      <section aria-labelledby="equipe" className="mt-20">
        <h2 id="equipe" className="font-serif text-3xl">
          {t('team')}
        </h2>
        {team.length === 0 ? (
          <p className="mt-4 text-muted">{t('teamEmpty')}</p>
        ) : (
          <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {team.map((member) => (
              <li key={member.id}>
                <Poster
                  image={member.photo}
                  ratio="4/5"
                  sizes="(min-width: 1056px) 22vw, (min-width: 672px) 30vw, 46vw"
                />
                <p className="mt-3 font-serif text-xl">{member.name}</p>
                <p className="meta mt-1">{member.title}</p>
                {member.bio ? <p className="mt-2 text-sm text-muted">{member.bio}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </StaticPageView>
  );
}
