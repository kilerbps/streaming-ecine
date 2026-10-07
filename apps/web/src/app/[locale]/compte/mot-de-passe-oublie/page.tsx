import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ForgotPasswordForm } from '@/components/features/auth/account-forms';

export const metadata: Metadata = { title: 'Mot de passe oublié' };

export default async function ForgotPasswordPage() {
  const t = await getTranslations('auth');
  return (
    <>
      <h1 className="font-serif text-4xl">{t('forgotTitle')}</h1>
      <p className="mb-8 mt-3 text-muted">{t('forgotIntro')}</p>
      <ForgotPasswordForm />
    </>
  );
}
