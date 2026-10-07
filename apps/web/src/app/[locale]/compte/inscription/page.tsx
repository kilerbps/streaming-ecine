import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AuthPage } from '@/components/features/auth/account-forms';

export const metadata: Metadata = { title: 'Créer un compte' };

export default async function RegisterPage() {
  const t = await getTranslations('auth');
  return (
    <>
      <h1 className="mb-8 font-serif text-4xl">{t('registerTitle')}</h1>
      <AuthPage mode="register" />
    </>
  );
}
