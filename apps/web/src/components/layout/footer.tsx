import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@ecine/contracts';
import { routes } from '@/lib/routes';
import { CookiePreferencesLink } from './cookie-banner';

export async function Footer({ locale }: { locale: Locale }) {
  const t = await getTranslations('footer');
  const nav = await getTranslations('nav');
  const links = [
    { href: routes.about(locale), label: nav('about') },
    { href: routes.contact(locale), label: nav('contact') },
    { href: routes.legal(locale), label: t('legal') },
    { href: routes.privacy(locale), label: t('privacy') },
    { href: routes.terms(locale), label: t('terms') },
    { href: routes.cookies(locale), label: t('cookies') },
  ];
  return (
    <footer className="mt-24 border-t border-border pb-[var(--tabbar-space)] lg:pb-12">
      <div className="container-page grid gap-8 pt-10 md:grid-cols-[1fr_2fr]">
        <div>
          <p className="font-display text-xl font-extrabold">E-Ciné</p>
          <p className="mt-2 max-w-xs text-sm text-muted">{t('tagline')}</p>
        </div>
        <nav aria-label="Liens du pied de page">
          <ul className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-3">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-muted hover:text-text underline-offset-4 hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <CookiePreferencesLink />
            </li>
          </ul>
          <p className="meta mt-8">
            © {new Date().getFullYear()} E-Ciné. {t('rights')}
          </p>
        </nav>
      </div>
    </footer>
  );
}
