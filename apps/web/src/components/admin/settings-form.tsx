'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { siteSettingsInputSchema, type SiteSettings } from '@ecine/contracts';
import type { z } from 'zod';
import { CheckboxField, FormError, TextField } from '@/components/ui/field';
import { saveSettingsAction } from '@/server/actions/admin/site';
import { applyServerErrors, FormSection, SaveBar, useUnsavedWarning } from './editor-kit';
import { emptyToUndefined } from './fields';
import { SOCIAL_FIELDS } from './labels';
import { useAdminAction } from './use-admin-action';

type Values = z.input<typeof siteSettingsInputSchema>;
type Output = z.output<typeof siteSettingsInputSchema>;

/** Paramètres du site : contacts affichés, réseaux sociaux, interrupteur publicitaire (désactivé en V1). */
export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const { run, pending } = useAdminAction();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<Values, unknown, Output>({
    resolver: zodResolver(siteSettingsInputSchema),
    defaultValues: {
      contactEmail: settings.contactEmail,
      phone: settings.phone ?? '',
      socials: { ...settings.socials },
      adsEnabled: settings.adsEnabled,
    },
    mode: 'onTouched',
  });
  useUnsavedWarning(isDirty);

  const submit = handleSubmit(
    (values) => {
      setFormError(null);
      run(() => saveSettingsAction(values), {
        success: 'Paramètres enregistrés : le site est mis à jour.',
        onError: (failure) => {
          applyServerErrors(setError, failure);
          setFormError(failure.error);
        },
      });
    },
    () => setFormError('Certaines informations sont à corriger : voir les champs signalés.'),
  );

  return (
    <form onSubmit={submit} noValidate className="flex max-w-3xl flex-col gap-6">
      <FormError message={formError} />
      <FormSection
        title="Contact"
        description="Affichés sur la page Contact et dans le pied de page."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <TextField
            label="Adresse e-mail de contact"
            type="email"
            inputMode="email"
            error={errors.contactEmail?.message}
            {...register('contactEmail')}
          />
          <TextField
            label="Téléphone"
            optional
            type="tel"
            inputMode="tel"
            placeholder="+243 …"
            error={errors.phone?.message}
            {...register('phone')}
          />
        </div>
      </FormSection>
      <FormSection
        title="Réseaux sociaux"
        description="Adresses complètes commençant par https://. Laissez vide pour masquer un réseau."
      >
        <div className="grid gap-5 md:grid-cols-2">
          {SOCIAL_FIELDS.map(([key, label]) => (
            <TextField
              key={key}
              label={label}
              optional
              type="url"
              inputMode="url"
              placeholder="https://…"
              error={errors.socials?.[key]?.message}
              {...register(`socials.${key}`, { setValueAs: emptyToUndefined })}
            />
          ))}
        </div>
      </FormSection>
      <FormSection title="Publicité" description="Prévue pour une version ultérieure.">
        <div className="border-l-2 border-highlight bg-bg px-4 py-3 text-sm">
          <p>
            En version 1, <strong>aucune publicité n’est diffusée</strong>, même si cette case est
            cochée : le site n’affiche aucun emplacement publicitaire et ne charge aucun script de
            régie. Cet interrupteur prépare la version 2 (après validation juridique et ajout du
            consentement « publicité »).
          </p>
        </div>
        <CheckboxField
          label="Autoriser la publicité (sans effet en V1)"
          {...register('adsEnabled')}
        />
      </FormSection>
      <SaveBar
        dirty={isDirty}
        pending={pending}
        primary
        label="Enregistrer les paramètres"
        note={isDirty ? 'Modifications non enregistrées.' : 'Tout est enregistré.'}
      />
    </form>
  );
}
