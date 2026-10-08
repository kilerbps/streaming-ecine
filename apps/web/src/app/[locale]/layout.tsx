import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { LOCALES, type Locale } from '@ecine/contracts';
import { PageViewTracker } from '@/components/analytics/page-view-tracker';
import { CookieBanner } from '@/components/layout/cookie-banner';
import { Footer } from '@/components/layout/footer';
import { MobileHeader, SideRail, TabBar } from '@/components/layout/navigation';
import { AppProviders } from '@/components/providers/app-providers';
import { ServiceWorker } from '@/components/pwa/service-worker';
import { JsonLd } from '@/components/seo/json-ld';
import { serverConfig } from '@/server/config';
import { readConsent } from '@/server/consent';
import { getPreferences, getSiteSettings, getViewer } from '@/server/data';
import { absoluteUrl } from '@/server/seo';
import { archivo } from '../fonts';
import { THEME_COLORS } from '@/lib/theme-colors';
import '../globals.css';

function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  return {
    metadataBase: new URL(serverConfig().SITE_URL),
    title: { default: t('defaultTitle'), template: t('titleTemplate') },
    description: t('defaultDescription'),
    applicationName: 'E-Ciné',
    manifest: '/manifest.webmanifest',
    icons: { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }], apple: '/apple-icon.png' },
    appleWebApp: { capable: true, title: 'E-Ciné', statusBarStyle: 'black-translucent' },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: THEME_COLORS.dark,
};

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [preferences, viewer, consent, messages, settings, nav] = await Promise.all([
    getPreferences(),
    getViewer(),
    readConsent(),
    getMessages(),
    getSiteSettings().catch(() => null),
    getTranslations('nav'),
  ]);

  const organization = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': absoluteUrl('/#organisation'),
        name: 'E-Ciné',
        url: absoluteUrl(`/${locale}`),
        logo: absoluteUrl('/icon.svg'),
        sameAs: Object.values(settings?.socials ?? {}),
      },
      {
        '@type': 'WebSite',
        name: 'E-Ciné',
        url: absoluteUrl(`/${locale}`),
        inLanguage: locale,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${absoluteUrl(`/${locale}/recherche`)}?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <html lang={locale} data-theme={preferences.theme} className={archivo.variable}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <AppProviders
            preferences={preferences}
            viewer={
              viewer
                ? {
                    displayName: viewer.displayName,
                    role: viewer.role,
                    emailVerified: viewer.emailVerified,
                  }
                : null
            }
          >
            <a
              href="#contenu"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent"
            >
              {nav('skipToContent')}
            </a>
            <MobileHeader locale={locale} />
            <SideRail locale={locale} />
            <div className="md:pl-24 lg:pl-60">
              <main id="contenu" tabIndex={-1} className="min-h-[70dvh] focus:outline-none">
                {children}
              </main>
              <Footer locale={locale} />
            </div>
            <TabBar locale={locale} />
            <CookieBanner initial={consent} />
            <ServiceWorker />
            <PageViewTracker enabled={Boolean(consent?.analytics)} />
          </AppProviders>
        </NextIntlClientProvider>
        <JsonLd data={organization} />
      </body>
    </html>
  );
}
