import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ResetPasswordForm } from '@/components/features/auth/account-forms';

export const metadata: Metadata = { title: 'Nouveau mot de passe', referrer: 'no-referrer' };

export default async function ResetPasswordPage({
  searchParams,
}: PageProps<'/[locale]/compte/nouveau-mot-de-passe'>) {
  const t = await getTranslations('auth');
  const token = (await searchParams).token;
  return (
    <>
      <h1 className="mb-8 font-serif text-4xl">{t('resetTitle')}</h1>
      {typeof token === 'string' ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="text-danger">{t('verifyFailed')}</p>
      )}
    </>
  );
}
