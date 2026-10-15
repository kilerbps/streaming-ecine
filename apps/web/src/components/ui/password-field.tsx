'use client';

import { useTranslations } from 'next-intl';
import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { CONTROL, FieldShell, describedBy } from './field';

/**
 * Mot de passe avec bouton Afficher / Masquer (docs/design/04, connexion à la demande) : la saisie
 * au pouce se vérifie d'un coup d'œil.
 */
export function PasswordField({
  label,
  help,
  error,
  id: idProp,
  ...rest
}: {
  label: ReactNode;
  help?: ReactNode;
  error?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const t = useTranslations('auth');
  const autoId = useId();
  const id = idProp ?? autoId;
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell id={id} label={label} help={help} error={error}>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className={`${CONTROL} pr-24`}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, help, error)}
          {...rest}
        />
        <button
          type="button"
          aria-controls={id}
          onClick={() => setVisible((v) => !v)}
          className="press absolute inset-y-0 right-0 min-w-11 rounded-r-md px-3 text-sm font-medium text-muted hover:text-text"
        >
          {visible ? t('hidePassword') : t('showPassword')}
          <span className="sr-only"> {t('passwordSr')}</span>
        </button>
      </div>
    </FieldShell>
  );
}
