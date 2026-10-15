'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { useResumePosition } from '@/components/features/player/player';
import { usePreferences } from '@/components/providers/preferences';
import { LinkButton } from '@/components/ui/link-button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Sheet } from '@/components/ui/sheet';

/**
 * Feuille de l'aperçu rapide, ouverte par la route interceptée : 60 % de la hauteur, 92 % en glissant
 * vers le haut ; panneau centré de 640 px sur PC. La fermer revient à l'écran d'origine.
 */
export function PreviewSheet({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  return (
    <Sheet
      open={open}
      title={title}
      expandable
      wide
      history={false}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) router.back();
      }}
    >
      {children}
    </Sheet>
  );
}

/** Bouton principal de l'aperçu : « Regarder », ou « Reprendre · 38 min restantes » avec la barre. */
export function PreviewWatchButton({
  filmId,
  href,
  serverPosition,
  runtimeSec,
}: {
  filmId: string;
  href: string;
  serverPosition: number | null;
  runtimeSec: number | null;
}) {
  const t = useTranslations('film');
  const resume = useResumePosition(filmId, serverPosition, runtimeSec);
  const label =
    resume !== null && runtimeSec
      ? t('resumeRemaining', { minutes: Math.max(1, Math.ceil((runtimeSec - resume) / 60)) })
      : t('watch');
  return (
    <div className="flex flex-col gap-2">
      <LinkButton
        transitionTypes={['push']}
        href={href}
        variant="primary"
        size="lg"
        icon="play"
        className="w-full"
      >
        {label}
      </LinkButton>
      {resume !== null && runtimeSec ? (
        <ProgressBar value={resume / runtimeSec} label={label} />
      ) : null}
    </div>
  );
}

/** Consommation de données estimée (débits du lecteur) ; plafond rappelé en économie de données. */
export function DataUseLine() {
  const t = useTranslations('film');
  const { saveData } = usePreferences();
  return (
    <p className="text-[13px] leading-[18px] text-muted">
      {saveData ? t('dataSaver') : t('dataAuto')}
    </p>
  );
}
