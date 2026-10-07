import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AuthPage } from '@/components/features/auth/account-forms';

export const metadata: Metadata = { title: 'Connexion' };

export default async function LoginPage({ searchParams }: PageProps<'/[locale]/compte/connexion'>) {
  const t = await getTranslations('auth');
  const retour = (await searchParams).retour;
  return (
    <>
      <h1 className="mb-8 font-serif text-4xl">{t('loginTitle')}</h1>
      <AuthPage mode="login" returnTo={typeof retour === 'string' ? retour : undefined} />
    </>
  );
}
