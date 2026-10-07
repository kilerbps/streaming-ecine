import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@ecine/contracts';
import { ContactForm } from '@/components/features/forms/contact-form';
import { Icon } from '@/components/ui/icon';
import { getSiteSettings } from '@/server/data';
import { pageMetadata } from '@/server/seo';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/contact'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('contact');
  return pageMetadata({
    locale: locale as Locale,
    path: '/contact',
    title: t('title'),
    description: t('intro'),
  });
}

/** Contact (FR-070/071) : formulaire + coordonnées issues des paramètres du site. */
export default async function ContactPage() {
  const [t, settings] = await Promise.all([
    getTranslations('contact'),
    getSiteSettings().catch(() => null),
  ]);
  return (
    <div className="container-page pt-8 md:pt-12">
      <div className="grid gap-12 lg:grid-cols-[7fr_4fr] lg:gap-20">
        <div>
          <h1 className="font-serif text-4xl md:text-6xl">{t('title')}</h1>
          <p className="mt-4 max-w-xl text-lg text-muted">{t('intro')}</p>
          <div className="mt-10">
            <ContactForm />
          </div>
        </div>
        {settings ? (
          <aside className="self-start border-t-2 border-highlight pt-6">
            <h2 className="eyebrow text-muted">{t('direct')}</h2>
            <ul className="mt-4 flex flex-col gap-3">
              {settings.contactEmail ? (
                <li>
                  <a
                    href={`mailto:${settings.contactEmail}`}
                    className="inline-flex min-h-11 items-center gap-3 underline underline-offset-4"
                  >
                    <Icon name="mail" />
                    {settings.contactEmail}
                  </a>
                </li>
              ) : null}
              {settings.phone ? (
                <li>
                  <a
                    href={`tel:${settings.phone.replace(/\s/g, '')}`}
                    className="inline-flex min-h-11 items-center gap-3 underline underline-offset-4"
                  >
                    <Icon name="phone" />
                    {settings.phone}
                  </a>
                </li>
              ) : null}
              {Object.entries(settings.socials).map(([network, url]) =>
                url ? (
                  <li key={network}>
                    <a
                      href={url}
                      rel="noopener noreferrer"
                      target="_blank"
                      className="inline-flex min-h-11 items-center gap-3 capitalize underline underline-offset-4"
                    >
                      <Icon name="globe" />
                      {network}
                    </a>
                  </li>
                ) : null,
              )}
            </ul>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
