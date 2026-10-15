'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import type { TwoFactorSetup } from '@ecine/contracts';
import { useToast } from '@/components/providers/toast';
import { Button } from '@/components/ui/button';
import { FormError, TextField } from '@/components/ui/field';
import { routes } from '@/lib/routes';
import {
  disableTwoFactorAction,
  enableTwoFactorAction,
  logoutAction,
  regenerateRecoveryCodesAction,
  setupTwoFactorAction,
} from '@/server/actions/auth';

/** Codes de secours : affichés une seule fois, à copier ou à télécharger. */
function RecoveryCodesList({
  codes,
  onDone,
  doneLabel,
}: {
  codes: string[];
  onDone: () => void | Promise<void>;
  doneLabel: string;
}) {
  const t = useTranslations('me');
  const toast = useToast();
  const text = codes.join('\n');
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] leading-5">{t('recoveryIntro')}</p>
      <ul className="grid grid-cols-2 gap-2 rounded-md bg-surface-1 p-4 font-mono text-[15px] leading-6 sm:grid-cols-5">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          icon="document"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            toast(t('recoveryCopied'), 'success');
          }}
        >
          {t('recoveryCopy')}
        </Button>
        <Button
          variant="secondary"
          icon="download"
          onClick={() => {
            const url = URL.createObjectURL(
              new Blob([`${t('recoveryFileTitle')}\n\n${text}\n`], { type: 'text/plain' }),
            );
            const link = document.createElement('a');
            link.href = url;
            link.download = 'e-cine-codes-de-secours.txt';
            link.click();
            URL.revokeObjectURL(url);
          }}
        >
          {t('recoveryDownload')}
        </Button>
        <Button variant="primary" onClick={() => void onDone()}>
          {doneLabel}
        </Button>
      </div>
    </div>
  );
}

/** Mot de passe et code (application ou secours) : désactivation et renouvellement des codes. */
function ConfirmForm({
  submitLabel,
  danger = false,
  onSubmit,
  onCancel,
}: {
  submitLabel: string;
  danger?: boolean;
  onSubmit: (input: { password: string; code: string }) => Promise<string | null>;
  onCancel: () => void;
}) {
  const t = useTranslations('me');
  const ta = useTranslations('auth');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="flex max-w-sm flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => setError(await onSubmit({ password, code })));
      }}
    >
      <FormError message={error} />
      <TextField
        label={t('currentPassword')}
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <TextField
        label={ta('totp')}
        help={ta('totpHelp')}
        autoComplete="one-time-code"
        autoCapitalize="off"
        maxLength={9}
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant={danger ? 'danger' : 'secondary'} pending={pending}>
          {submitLabel}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {t('cancel')}
        </Button>
      </div>
    </form>
  );
}

/**
 * Double authentification (docs/design/04, Réglages) : QR code rendu par le serveur, clé en texte
 * pour la saisie manuelle, codes de secours montrés une seule fois, renouvellement et désactivation
 * qui demandent le mot de passe.
 */
export function TwoFactorSettings({
  enabled,
  recoveryCodesLeft,
}: {
  enabled: boolean;
  recoveryCodesLeft: number;
}) {
  const t = useTranslations('me');
  const ta = useTranslations('auth');
  const router = useRouter();
  const toast = useToast();
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [mode, setMode] = useState<'idle' | 'disable' | 'regenerate'>('idle');
  const [pending, startTransition] = useTransition();

  if (codes) {
    // Après l'activation, la session doit être rouverte avec le second facteur.
    return (
      <RecoveryCodesList
        codes={codes}
        doneLabel={enabled ? t('recoveryDone') : t('recoveryDoneLogin')}
        onDone={async () => {
          if (!enabled) {
            // Sessions déjà révoquées par l'API : effacer les cookies, puis se reconnecter.
            await logoutAction();
            router.replace(
              `${routes.login('fr')}?retour=${encodeURIComponent(routes.settings('fr'))}`,
            );
            return;
          }
          setCodes(null);
          router.refresh();
        }}
      />
    );
  }

  if (enabled) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[15px] leading-5 text-success">{t('twoFactorOn')}</p>
        <p className="text-[15px] leading-5 text-muted">
          {t('recoveryLeft', { count: recoveryCodesLeft })}
        </p>
        {mode === 'idle' ? (
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setMode('regenerate')}>
              {t('recoveryRegenerate')}
            </Button>
            <Button variant="ghost" onClick={() => setMode('disable')}>
              {t('twoFactorDisable')}
            </Button>
          </div>
        ) : (
          <ConfirmForm
            submitLabel={mode === 'disable' ? t('twoFactorDisable') : t('recoveryRegenerate')}
            danger={mode === 'disable'}
            onCancel={() => setMode('idle')}
            onSubmit={async (input) => {
              if (mode === 'disable') {
                const r = await disableTwoFactorAction(input);
                if (!r.ok) return r.error;
                toast(t('twoFactorOffToast'), 'success');
                setMode('idle');
                router.refresh();
                return null;
              }
              const r = await regenerateRecoveryCodesAction(input);
              if (!r.ok) return r.error;
              setMode('idle');
              setCodes(r.data.recoveryCodes);
              return null;
            }}
          />
        )}
      </div>
    );
  }

  if (!setup) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[15px] leading-5 text-muted">{t('twoFactorOff')}</p>
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
      <p className="text-[15px] leading-5">{t('twoFactorScan')}</p>
      <div className="flex flex-wrap items-start gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element -- QR code SVG produit par l'API (data URL) */}
        <img
          src={setup.qrCode}
          alt={t('twoFactorQrAlt')}
          width={192}
          height={192}
          className="rounded-md bg-[var(--on-image-text)] p-2"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-[13px] leading-[18px] text-muted">{t('twoFactorManual')}</p>
          <code className="block break-all rounded-md bg-surface-1 p-3 font-mono text-[15px]">
            {setup.secret.replace(/(.{4})/g, '$1 ').trim()}
          </code>
          <a href={setup.otpauthUrl} className="text-[15px] underline underline-offset-4">
            {t('twoFactorOpenApp')}
          </a>
        </div>
      </div>
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
            if (r.ok) setCodes(r.data.recoveryCodes);
            else setError(r.error);
          })
        }
      >
        {t('twoFactorEnable')}
      </Button>
    </div>
  );
}
