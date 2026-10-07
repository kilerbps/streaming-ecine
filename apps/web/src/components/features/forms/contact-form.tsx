'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useCallback, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { contactInputSchema } from '@ecine/contracts';
import type { z } from 'zod';
import { Turnstile } from '@/components/features/auth/turnstile';
import { usePreferences } from '@/components/providers/preferences';
import { Button } from '@/components/ui/button';
import { FormError, TextAreaField, TextField } from '@/components/ui/field';
import { contactAction } from '@/server/actions/forms';

type Input = z.input<typeof contactInputSchema>;
type Field = 'name' | 'email' | 'subject' | 'message';

/** Contact (FR-070) : même schéma Zod côté client et serveur, pot de miel, délai minimal, Turnstile. */
export function ContactForm() {
  const t = useTranslations('contact');
  const { feedback, theme } = usePreferences();
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>();
  const onToken = useCallback((token: string | undefined) => setTurnstileToken(token), []);
  const [renderedAt] = useState(() => Date.now());
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<Input, unknown, z.output<typeof contactInputSchema>>({
    resolver: zodResolver(contactInputSchema),
    defaultValues: { renderedAt },
  });

  const submit = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await contactAction({ ...values, turnstileToken });
      if (result.ok) {
        feedback('success');
        setSent(true);
        reset();
        return;
      }
      feedback('error');
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        if (['name', 'email', 'subject', 'message'].includes(field))
          setError(field as Field, { message });
      }
      setFormError(result.error);
    });
  });

  if (sent) {
    return (
      <div role="status" className="border-l-2 border-success bg-surface-1 p-6">
        <p className="font-serif text-xl">{t('sent')}</p>
      </div>
    );
  }

  return (
    <form method="post" onSubmit={submit} noValidate className="flex flex-col gap-5">
      <FormError message={formError} />
      <div className="grid gap-5 md:grid-cols-2">
        <TextField
          label={t('name')}
          autoComplete="name"
          error={errors.name?.message}
          {...register('name')}
        />
        <TextField
          label={t('email')}
          type="email"
          autoComplete="email"
          inputMode="email"
          error={errors.email?.message}
          {...register('email')}
        />
      </div>
      <TextField label={t('subject')} error={errors.subject?.message} {...register('subject')} />
      <TextAreaField
        label={t('message')}
        rows={7}
        error={errors.message?.message}
        {...register('message')}
      />
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden">
        <label>
          Site web
          <input type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
        </label>
      </div>
      <input type="hidden" {...register('renderedAt', { valueAsNumber: true })} />
      <Turnstile onToken={onToken} theme={theme} />
      <Button type="submit" variant="primary" size="lg" pending={pending} className="self-start">
        {t('send')}
      </Button>
    </form>
  );
}
