import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { hasRole, siteSettingsSchema, type Me } from '@ecine/contracts';
import { AdminShell } from '@/components/admin/admin-shell';
import { AccessDenied, MfaRequired, Unavailable } from '@/components/admin/problems';
import { LogoutButton } from '@/components/features/account/logout-button';
import { AppProviders } from '@/components/providers/app-providers';
import { Logo } from '@/components/ui/logo';
import { adminLoad, adminLoginUrl } from '@/server/actions/admin/core';
import { getPreferences, getViewer } from '@/server/data';
import { htmlPreferenceAttributes, themeColorFor } from '@/server/html-preferences';
import { archivo } from '../fonts';
import '../globals.css';

/** Administration : jamais indexée (en plus de l'en-tête X-Robots-Tag posé par proxy.ts). */
export const metadata: Metadata = {
  title: { default: 'Administration', template: '%s · Administration E-Ciné' },
  robots: { index: false, follow: false },
  icons: { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }] },
};

/** Barre du navigateur : couleur du thème choisi, Automatique par défaut en administration (D-09). */
export async function generateViewport(): Promise<Viewport> {
  const preferences = await getPreferences('auto');
  return { width: 'device-width', initialScale: 1, themeColor: themeColorFor(preferences.theme) };
}

/** Vrai si l'API refuse l'administration faute de double authentification (comptes ADMIN et plus). */
async function mfaMissing(): Promise<boolean> {
  const probe = await adminLoad(siteSettingsSchema, '/admin/site-settings');
  return !probe.ok && probe.kind === 'mfa';
}

/**
 * Racine séparée du site public : même design system, même fournisseurs (thème, sons, toasts, session).
 * Garde légère ici (connexion, rôle) ; l'autorisation réelle est faite par l'API à chaque requête.
 */
export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  const [preferences, messages] = await Promise.all([getPreferences('auto'), getMessages()]);
  let viewer: Me | null;
  try {
    viewer = await getViewer();
  } catch {
    // API injoignable : page sobre plutôt qu'une erreur brute (aucun détail technique).
    return (
      <html
        lang="fr"
        {...htmlPreferenceAttributes(preferences)}
        className={archivo.variable}
        suppressHydrationWarning
      >
        <body>
          <main id="admin-contenu" className="mx-auto max-w-4xl px-4 py-6 md:px-8">
            <Unavailable message="Le serveur E-Ciné ne répond pas pour le moment. Vos contenus ne sont pas touchés : réessayez dans quelques instants." />
          </main>
        </body>
      </html>
    );
  }
  if (!viewer) redirect(await adminLoginUrl());

  let content;
  if (!hasRole(viewer.role, 'MODERATOR')) {
    content = (
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
        <header className="flex items-center justify-between border-b border-border pb-4">
          <Link href="/fr" aria-label="E-Ciné, retour au site">
            <Logo withBadge={false} className="h-8 w-auto" />
          </Link>
          <LogoutButton />
        </header>
        <main id="admin-contenu">
          <AccessDenied
            home={false}
            message="Cet espace est réservé à l’équipe E-Ciné (modération, édition, administration)."
          />
          <Link href="/fr" className="underline">
            Retour au site
          </Link>
        </main>
      </div>
    );
  } else if (hasRole(viewer.role, 'ADMIN') && (await mfaMissing())) {
    content = (
      <AdminShell viewer={{ displayName: viewer.displayName, role: viewer.role }} locked>
        <MfaRequired />
      </AdminShell>
    );
  } else {
    content = (
      <AdminShell viewer={{ displayName: viewer.displayName, role: viewer.role }}>
        {children}
      </AdminShell>
    );
  }

  return (
    <html
      lang="fr"
      {...htmlPreferenceAttributes(preferences)}
      className={archivo.variable}
      suppressHydrationWarning
    >
      <body>
        <NextIntlClientProvider messages={messages}>
          <AppProviders
            preferences={preferences}
            viewer={{
              displayName: viewer.displayName,
              role: viewer.role,
              emailVerified: viewer.emailVerified,
            }}
          >
            {content}
          </AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
