import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { LOCALES, type Locale } from '@ecine/contracts';
import { PageViewTracker } from '@/components/analytics/page-view-tracker';
import { CookieBanner } from '@/components/layout/cookie-banner';
import { Footer } from '@/components/layout/footer';
import { AppHeader, TabBar, TopNav } from '@/components/layout/navigation';
import { AppProviders } from '@/components/providers/app-providers';
import { InstallPrompt } from '@/components/pwa/install-prompt';
import { ServiceWorker } from '@/components/pwa/service-worker';
import { JsonLd } from '@/components/seo/json-ld';
import { serverConfig } from '@/server/config';
import { readConsent } from '@/server/consent';
import { cookies } from 'next/headers';
import { PREFERENCE_COOKIES } from '@/lib/preferences';
import {
  getArticles,
  getCategories,
  getPreferences,
  getSiteSettings,
  getViewer,
} from '@/server/data';
import { htmlPreferenceAttributes, LiteDetection, themeColorFor } from '@/server/html-preferences';
import { absoluteUrl } from '@/server/seo';
import { archivo } from '../fonts';
import { STARTUP_IMAGES } from '../startup-images.generated';
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
    appleWebApp: {
      capable: true,
      title: 'E-Ciné',
      statusBarStyle: 'black-translucent',
      startupImage: STARTUP_IMAGES,
    },
    formatDetection: { telephone: false },
  };
}

/** Barre du navigateur : couleur du thème choisi dès le rendu serveur (Nuit par défaut, D-09). */
export async function generateViewport(): Promise<Viewport> {
  const preferences = await getPreferences();
  return {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    themeColor: themeColorFor(preferences.theme),
  };
}

export default async function LocaleLayout({ children, modal, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [preferences, viewer, consent, messages, settings, nav, categories, latestNews, jar] =
    await Promise.all([
      getPreferences(),
      getViewer(),
      readConsent(),
      getMessages(),
      getSiteSettings().catch(() => null),
      getTranslations('nav'),
      getCategories().catch(() => []),
      getArticles({ limit: 1 }).catch(() => null),
      cookies(),
    ]);
  // Pastille de Nouveautés : une actualité publiée depuis la dernière visite de l'écran.
  const newsSeen = jar.get(PREFERENCE_COOKIES.newsSeen)?.value;
  const latestPublished = latestNews?.items[0]?.publishedAt;
  const whatsNewDot = Boolean(newsSeen && latestPublished && latestPublished > newsSeen);

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
    <html
      lang={locale}
      {...htmlPreferenceAttributes(preferences)}
      className={archivo.variable}
      suppressHydrationWarning
    >
      <body>
        <LiteDetection prefs={preferences} />
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
            <AppHeader locale={locale} categories={categories} />
            <TopNav locale={locale} whatsNewDot={whatsNewDot} />
            <main
              id="contenu"
              tabIndex={-1}
              className="min-h-[70dvh] focus:outline-none lg:pt-[var(--topnav-h)]"
            >
              {children}
            </main>
            {modal}
            <Footer locale={locale} />
            <TabBar locale={locale} whatsNewDot={whatsNewDot} />
            <CookieBanner initial={consent} />
            <ServiceWorker />
            <InstallPrompt />
            <PageViewTracker enabled={Boolean(consent?.analytics)} />
          </AppProviders>
        </NextIntlClientProvider>
        <JsonLd data={organization} />
      </body>
    </html>
  );
}
