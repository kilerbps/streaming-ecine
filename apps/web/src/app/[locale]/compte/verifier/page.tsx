import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { VerifyEmail } from '@/components/features/auth/account-forms';

export const metadata: Metadata = { title: "Confirmation de l'adresse", referrer: 'no-referrer' };

export default async function VerifyEmailPage({
  searchParams,
}: PageProps<'/[locale]/compte/verifier'>) {
  const t = await getTranslations('auth');
  const { token, confirme } = await searchParams;
  return (
    <>
      <h1 className="mb-8 font-serif text-4xl">{t('verifyTitle')}</h1>
      {confirme === '1' ? (
        <p role="status" className="border-l-2 border-success bg-surface-1 p-4">
          {t('verifyDone')}
        </p>
      ) : typeof token === 'string' ? (
        <VerifyEmail token={token} />
      ) : (
        <p className="text-danger">{t('verifyFailed')}</p>
      )}
    </>
  );
}
