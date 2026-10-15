'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { forgotPasswordInputSchema, resetPasswordInputSchema, type Me } from '@ecine/contracts';
import type { z } from 'zod';
import { useAuth } from '@/components/providers/auth';
import { usePreferences } from '@/components/providers/preferences';
import { Button } from '@/components/ui/button';
import { FormError, TextField } from '@/components/ui/field';
import { PasswordField } from '@/components/ui/password-field';
import { Loader } from '@/components/ui/loader';
import { routes, safeInternalPath } from '@/lib/routes';
import {
  forgotPasswordAction,
  resetPasswordAction,
  verifyEmailAction,
} from '@/server/actions/auth';
import { AuthForms } from './auth-forms';

/** Page de connexion / inscription : après succès, retour à la page d'origine (chemin interne uniquement). */
export function AuthPage({ mode, returnTo }: { mode: 'login' | 'register'; returnTo?: string }) {
  const router = useRouter();
  const { setViewer } = useAuth();
  const onAuthenticated = (me: Me) => {
    setViewer({ displayName: me.displayName, role: me.role, emailVerified: me.emailVerified });
    router.replace(safeInternalPath(returnTo, routes.me('fr')));
    router.refresh();
  };
  return <AuthForms onAuthenticated={onAuthenticated} initialMode={mode} />;
}

export function ForgotPasswordForm() {
  const t = useTranslations('auth');
  const { feedback } = usePreferences();
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<
    z.input<typeof forgotPasswordInputSchema>,
    unknown,
    z.output<typeof forgotPasswordInputSchema>
  >({
    resolver: zodResolver(forgotPasswordInputSchema),
  });
  const submit = handleSubmit((values) =>
    startTransition(async () => {
      const result = await forgotPasswordAction(values);
      if (result.ok) {
        feedback('success');
        setSent(true);
      } else {
        feedback('error');
        setFormError(result.error);
      }
    }),
  );
  if (sent)
    return (
      <p role="status" className="border-l-2 border-success bg-surface-1 p-4">
        {t('forgotSent')}
      </p>
    );
  return (
    <form method="post" onSubmit={submit} noValidate className="flex flex-col gap-5">
      <FormError message={formError} />
      <TextField
        label={t('email')}
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <Button type="submit" variant="primary" size="lg" pending={pending}>
        {t('forgotSend')}
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations('auth');
  const { feedback } = usePreferences();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<
    z.input<typeof resetPasswordInputSchema>,
    unknown,
    z.output<typeof resetPasswordInputSchema>
  >({
    resolver: zodResolver(resetPasswordInputSchema),
    defaultValues: { token },
  });
  const submit = handleSubmit((values) =>
    startTransition(async () => {
      const result = await resetPasswordAction(values);
      if (result.ok) {
        feedback('success');
        setDone(true);
        return;
      }
      feedback('error');
      if (result.fieldErrors?.password)
        setError('password', { message: result.fieldErrors.password });
      setFormError(result.error);
    }),
  );
  if (done) {
    return (
      <div role="status" className="flex flex-col gap-4 border-l-2 border-success bg-surface-1 p-4">
        <p>{t('resetDone')}</p>
        <Link href={routes.login('fr')} className="underline">
          {t('login')}
        </Link>
      </div>
    );
  }
  return (
    <form method="post" onSubmit={submit} noValidate className="flex flex-col gap-5">
      <FormError message={formError} />
      <input type="hidden" {...register('token')} />
      <PasswordField
        label={t('password')}
        autoComplete="new-password"
        help={t('passwordHelp')}
        error={errors.password?.message}
        {...register('password')}
      />
      <Button type="submit" variant="primary" size="lg" pending={pending}>
        {t('resetSubmit')}
      </Button>
    </form>
  );
}

/** Confirmation d'adresse : le jeton est envoyé une seule fois puis retiré de l'URL. */
export function VerifyEmail({ token }: { token: string }) {
  const t = useTranslations('auth');
  const router = useRouter();
  const [state, setState] = useState<'pending' | 'ok' | 'error'>('pending');
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    window.history.replaceState(null, '', window.location.pathname);
    void verifyEmailAction(token).then((result) => {
      setState(result.ok ? 'ok' : 'error');
      if (result.ok) router.refresh();
    });
  }, [token, router]);
  if (state === 'pending') return <Loader />;
  return (
    <p
      role="status"
      className={`border-l-2 bg-surface-1 p-4 ${state === 'ok' ? 'border-success' : 'border-danger'}`}
    >
      {state === 'ok' ? t('verifyDone') : t('verifyFailed')}
    </p>
  );
}
