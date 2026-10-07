'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { registerInputSchema, type Me } from '@ecine/contracts';
import type { z } from 'zod';
import { usePreferences } from '@/components/providers/preferences';
import { Button } from '@/components/ui/button';
import { CheckboxField, FormError, TextField } from '@/components/ui/field';
import { routes } from '@/lib/routes';
import { registerAction } from '@/server/actions/auth';
import { Turnstile } from './turnstile';

type Input = z.input<typeof registerInputSchema>;
type Field = 'email' | 'password' | 'displayName' | 'acceptTerms';

export function RegisterForm({
  onSuccess,
  onSwitch,
}: {
  onSuccess: (me: Me) => void;
  onSwitch?: () => void;
}) {
  const t = useTranslations('auth');
  const { feedback, theme } = usePreferences();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>();
  const onToken = useCallback((token: string | undefined) => setTurnstileToken(token), []);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Input, unknown, z.output<typeof registerInputSchema>>({
    resolver: zodResolver(registerInputSchema),
  });

  const submit = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await registerAction({ ...values, turnstileToken });
      if (result.ok) {
        feedback('success');
        onSuccess(result.data);
        return;
      }
      feedback('error');
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        if (['email', 'password', 'displayName', 'acceptTerms'].includes(field))
          setError(field as Field, { message });
      }
      setFormError(result.error);
    });
  });

  return (
    <form method="post" onSubmit={submit} noValidate className="flex flex-col gap-5">
      <FormError message={formError} />
      <TextField
        label={t('displayName')}
        autoComplete="nickname"
        error={errors.displayName?.message}
        {...register('displayName')}
      />
      <TextField
        label={t('email')}
        type="email"
        autoComplete="email"
        inputMode="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <TextField
        label={t('password')}
        type="password"
        autoComplete="new-password"
        help={t('passwordHelp')}
        error={errors.password?.message}
        {...register('password')}
      />
      {/* Pot de miel : invisible pour les humains, rempli par les robots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden">
        <label>
          Site web
          <input type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
        </label>
      </div>
      <CheckboxField
        label={t.rich('acceptTerms', {
          terms: (chunks) => (
            <Link href={routes.terms('fr')} className="underline" target="_blank">
              {chunks}
            </Link>
          ),
          privacy: (chunks) => (
            <Link href={routes.privacy('fr')} className="underline" target="_blank">
              {chunks}
            </Link>
          ),
        })}
        error={errors.acceptTerms?.message}
        {...register('acceptTerms')}
      />
      <Turnstile onToken={onToken} theme={theme} />
      <Button type="submit" variant="primary" size="lg" pending={pending}>
        {t('register')}
      </Button>
      {onSwitch ? (
        <p className="text-sm text-muted">
          {t('hasAccount')}{' '}
          <button type="button" onClick={onSwitch} className="underline text-text">
            {t('login')}
          </button>
        </p>
      ) : null}
    </form>
  );
}
