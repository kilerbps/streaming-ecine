'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { reportReasonSchema, type ReportInput } from '@ecine/contracts';
import { useAuth } from '@/components/providers/auth';
import { usePreferences } from '@/components/providers/preferences';
import { useToast } from '@/components/providers/toast';
import { Button } from '@/components/ui/button';
import { FormError, TextAreaField } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { Sheet } from '@/components/ui/sheet';
import { reportAction } from '@/server/actions/interactions';

/** Signalement (FR-091) : bouton discret, motif obligatoire, précisions facultatives ; connexion requise. */
export function ReportButton({
  targetType,
  targetId,
  withLabel = false,
}: {
  targetType: ReportInput['targetType'];
  targetId: string;
  /** Libellé visible à côté du drapeau (section Détails d'une fiche). */
  withLabel?: boolean;
}) {
  const t = useTranslations('actions');
  const { requireAuth, sessionExpired } = useAuth();
  const { feedback } = usePreferences();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportInput['reason']>('RIGHTS');
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      const result = await reportAction({
        targetType,
        targetId,
        reason,
        details: details.trim() || undefined,
      });
      if (result.ok) {
        feedback('success');
        toast(t('reportThanks'), 'success');
        setOpen(false);
        setDetails('');
        return;
      }
      feedback('error');
      if (result.code === 'auth') {
        setOpen(false);
        sessionExpired(() => setOpen(true));
      } else setError(result.error);
    });

  return (
    <>
      <button
        type="button"
        onClick={() => requireAuth(() => setOpen(true), 'report')}
        className="inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-muted hover:bg-surface-2 hover:text-text"
        aria-label={withLabel ? undefined : t('report')}
      >
        <Icon name="flag" size={withLabel ? 20 : 24} />
        {withLabel ? <span className="text-[15px]">{t('report')}</span> : null}
      </button>
      <Sheet open={open} onOpenChange={setOpen} title={t('reportTitle')}>
        <form
          method="post"
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <FormError message={error} />
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{t('reportReason')}</legend>
            {reportReasonSchema.options.map((value) => (
              <label key={value} className="flex min-h-11 cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="reason"
                  value={value}
                  checked={reason === value}
                  onChange={() => setReason(value)}
                  className="size-4 accent-[var(--accent)]"
                />
                {t(`reason${value}`)}
              </label>
            ))}
          </fieldset>
          <TextAreaField
            label={t('reportDetails')}
            optional
            maxLength={1000}
            rows={4}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
          <Button type="submit" variant="primary" pending={pending}>
            {t('reportSend')}
          </Button>
        </form>
      </Sheet>
    </>
  );
}
