'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { loginInputSchema, type Me } from '@ecine/contracts';
import type { z } from 'zod';
import { usePreferences } from '@/components/providers/preferences';
import { Button } from '@/components/ui/button';
import { FormError, TextField } from '@/components/ui/field';
import { PasswordField } from '@/components/ui/password-field';
import { routes } from '@/lib/routes';
import { loginAction } from '@/server/actions/auth';

type Input = z.input<typeof loginInputSchema>;

export function LoginForm({
  onSuccess,
  onSwitch,
}: {
  onSuccess: (me: Me) => void;
  onSwitch?: () => void;
}) {
  const t = useTranslations('auth');
  const { feedback } = usePreferences();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [needTotp, setNeedTotp] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<Input, unknown, z.output<typeof loginInputSchema>>({
    resolver: zodResolver(loginInputSchema),
    // Erreurs à la sortie du champ, jamais à chaque frappe (docs/design/04).
    mode: 'onBlur',
    reValidateMode: 'onBlur',
  });

  // Second facteur demandé : le champ du code prend le focus (collage d'un code accepté).
  useEffect(() => {
    if (needTotp) setFocus('totp');
  }, [needTotp, setFocus]);

  const submit = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await loginAction(values);
      if (result.ok) {
        feedback('success');
        onSuccess(result.data);
        return;
      }
      feedback('error');
      if (result.code === 'mfa') {
        setNeedTotp(true);
        setFormError(result.error);
        return;
      }
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        if (field === 'email' || field === 'password' || field === 'totp')
          setError(field, { message });
      }
      setFormError(result.error);
    });
  });

  return (
    <form method="post" onSubmit={submit} noValidate className="flex flex-col gap-5">
      <FormError message={formError} />
      <TextField
        label={t('email')}
        type="email"
        autoComplete="email"
        inputMode="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <PasswordField
        label={t('password')}
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      {needTotp ? (
        <TextField
          label={t('totp')}
          help={t('totpHelp')}
          autoComplete="one-time-code"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={9}
          error={errors.totp?.message}
          {...register('totp')}
        />
      ) : null}
      <Button type="submit" variant="primary" size="lg" pending={pending}>
        {t('login')}
      </Button>
      <div className="flex flex-col gap-2 text-sm">
        <Link href={routes.forgot('fr')} className="underline text-muted hover:text-text">
          {t('forgot')}
        </Link>
        {onSwitch ? (
          <p className="text-muted">
            {t('noAccount')}{' '}
            <button type="button" onClick={onSwitch} className="underline text-text">
              {t('register')}
            </button>
          </p>
        ) : null}
      </div>
    </form>
  );
}
