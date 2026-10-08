'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import {
  changePasswordInputSchema,
  deleteMeInputSchema,
  updateMeInputSchema,
  type Me,
  type TwoFactorSetup,
} from '@ecine/contracts';
import type { z } from 'zod';
import { useAuth } from '@/components/providers/auth';
import { usePreferences } from '@/components/providers/preferences';
import { useToast } from '@/components/providers/toast';
import { Button } from '@/components/ui/button';
import { CheckboxField, FormError, TextField } from '@/components/ui/field';
import { routes } from '@/lib/routes';
import {
  changePasswordAction,
  deleteAccountAction,
  enableTwoFactorAction,
  resendVerificationAction,
  setupTwoFactorAction,
  updateProfileAction,
} from '@/server/actions/auth';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border py-8">
      <h2 className="mb-5 font-serif text-2xl">{title}</h2>
      {children}
    </section>
  );
}

export function VerifyEmailBanner() {
  const t = useTranslations('me');
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-l-2 border-signal bg-surface-1 px-4 py-3">
      <p className="text-sm">{t('verifyEmailBanner')}</p>
      <Button
        size="sm"
        variant="ghost"
        pending={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await resendVerificationAction();
            toast(r.ok ? t('verificationSent') : r.error, r.ok ? 'success' : 'error');
          })
        }
      >
        {t('resendVerification')}
      </Button>
    </div>
  );
}

function ProfileForm({ me }: { me: Me }) {
  const t = useTranslations('me');
  const ta = useTranslations('auth');
  const toast = useToast();
  const { setViewer } = useAuth();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof updateMeInputSchema>, unknown, z.output<typeof updateMeInputSchema>>({
    resolver: zodResolver(updateMeInputSchema),
    defaultValues: { displayName: me.displayName },
  });
  return (
    <form
      method="post"
      noValidate
      className="flex flex-col gap-5"
      onSubmit={handleSubmit((values) =>
        startTransition(async () => {
          const r = await updateProfileAction(values);
          if (r.ok) {
            setViewer({
              displayName: r.data.displayName,
              role: r.data.role,
              emailVerified: r.data.emailVerified,
            });
            toast(t('saved'), 'success');
          } else toast(r.error, 'error');
        }),
      )}
    >
      <TextField
        label={ta('displayName')}
        error={errors.displayName?.message}
        {...register('displayName')}
      />
      <TextField label={ta('email')} value={me.email} readOnly disabled />
      <Button type="submit" variant="secondary" pending={pending} className="self-start">
        {t('save')}
      </Button>
    </form>
  );
}

function PasswordForm() {
  const t = useTranslations('me');
  const ta = useTranslations('auth');
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<
    z.input<typeof changePasswordInputSchema>,
    unknown,
    z.output<typeof changePasswordInputSchema>
  >({
    resolver: zodResolver(changePasswordInputSchema),
  });
  return (
    <form
      method="post"
      noValidate
      className="flex flex-col gap-5"
      onSubmit={handleSubmit((values) =>
        startTransition(async () => {
          const r = await changePasswordAction(values);
          if (r.ok) {
            // Toutes les sessions sont révoquées : reconnexion avec le nouveau mot de passe.
            toast(ta('resetDone'), 'success');
            router.replace(routes.login('fr'));
            router.refresh();
            return;
          }
          if (r.fieldErrors?.currentPassword)
            setError('currentPassword', { message: r.fieldErrors.currentPassword });
          if (r.fieldErrors?.newPassword)
            setError('newPassword', { message: r.fieldErrors.newPassword });
          setFormError(r.error);
        }),
      )}
    >
      <FormError message={formError} />
      <TextField
        label={t('currentPassword')}
        type="password"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        {...register('currentPassword')}
      />
      <TextField
        label={t('newPassword')}
        type="password"
        autoComplete="new-password"
        help={ta('passwordHelp')}
        error={errors.newPassword?.message}
        {...register('newPassword')}
      />
      <Button type="submit" variant="secondary" pending={pending} className="self-start">
        {t('changePassword')}
      </Button>
    </form>
  );
}

function TwoFactor({ enabled }: { enabled: boolean }) {
  const t = useTranslations('me');
  const ta = useTranslations('auth');
  const router = useRouter();
  const toast = useToast();
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (enabled) return <p className="text-success">{t('twoFactorOn')}</p>;
  if (!setup) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-muted">{t('twoFactorOff')}</p>
        <Button
          variant="secondary"
          className="self-start"
          pending={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await setupTwoFactorAction();
              if (r.ok) setSetup(r.data);
              else toast(r.error, 'error');
            })
          }
        >
          {t('twoFactorSetup')}
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t('twoFactorScan')}</p>
      <code className="block break-all border border-border bg-surface-1 p-3 font-mono text-sm">
        {setup.secret}
      </code>
      <a href={setup.otpauthUrl} className="text-sm underline">
        otpauth://
      </a>
      <FormError message={error} />
      <TextField
        label={ta('totp')}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <Button
        variant="secondary"
        className="self-start"
        pending={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await enableTwoFactorAction({ code });
            if (r.ok) {
              toast(t('twoFactorOn'), 'success');
              router.replace(routes.login('fr'));
              router.refresh();
            } else setError(r.error);
          })
        }
      >
        {t('twoFactorEnable')}
      </Button>
    </div>
  );
}

function DeleteAccount() {
  const t = useTranslations('me');
  const ta = useTranslations('auth');
  const router = useRouter();
  const { setViewer } = useAuth();
  const { feedback } = usePreferences();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof deleteMeInputSchema>, unknown, z.output<typeof deleteMeInputSchema>>({
    resolver: zodResolver(deleteMeInputSchema),
  });
  return (
    <form
      method="post"
      noValidate
      className="flex flex-col gap-5"
      onSubmit={handleSubmit((values) =>
        startTransition(async () => {
          const r = await deleteAccountAction(values);
          if (r.ok) {
            feedback('success');
            setViewer(null);
            router.replace(routes.home('fr'));
            router.refresh();
          } else setFormError(r.error);
        }),
      )}
    >
      <p className="text-muted">{t('deleteHelp')}</p>
      <FormError message={formError} />
      <TextField
        label={ta('password')}
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <CheckboxField
        label={t('deleteConfirm')}
        error={errors.confirm?.message}
        {...register('confirm')}
      />
      <Button type="submit" variant="danger" pending={pending} className="self-start">
        {t('delete')}
      </Button>
    </form>
  );
}

/** Réglages du compte : profil, sécurité (mot de passe, 2FA), données (export, suppression). */
export function AccountSettings({ me }: { me: Me }) {
  const t = useTranslations('me');
  return (
    <>
      <Section title={t('profile')}>
        <ProfileForm me={me} />
      </Section>
      <Section title={t('security')}>
        <PasswordForm />
        <div className="mt-10">
          <h3 className="mb-3 font-medium">{t('twoFactor')}</h3>
          <TwoFactor enabled={me.twoFactorEnabled} />
        </div>
      </Section>
      <Section title={t('data')}>
        <p className="mb-3 text-muted">{t('exportHelp')}</p>
        <a
          href="/api/compte/export"
          className="inline-flex min-h-11 items-center underline underline-offset-4"
          download
        >
          {t('export')}
        </a>
        <div className="mt-10">
          <h3 className="mb-3 font-medium text-danger">{t('delete')}</h3>
          <DeleteAccount />
        </div>
      </Section>
    </>
  );
}
