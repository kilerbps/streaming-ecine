'use client';

import { useTranslations } from 'next-intl';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { Player, useResumePosition } from '@/components/features/player/player';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { formatTimecode } from '@/lib/format';

type PlayerProps = ComponentProps<typeof Player>;

/**
 * Scène de la fiche film : image immersive (4:5 sur mobile, 16:9 plein cadre sur PC, texte dans les
 * 40 % de gauche) et le seul bouton principal, « Regarder » ou « Reprendre · temps restant ». Le
 * toucher ouvre le lecteur à la place de l'image ; titre et informations passent alors dessous.
 * Zone d'image : toujours en Nuit.
 */
export function FilmStage({
  player,
  image,
  children,
  fallback,
}: {
  /** `null` : film sans vidéo lisible (annoncé ou en préparation). */
  player: PlayerProps | null;
  /** Image de la scène, rendue côté serveur (MediaImage 4:5 / 16:9). */
  image: ReactNode;
  /** Titre et informations, posés sur le voile. */
  children: ReactNode;
  /** Remplace le bouton quand il n'y a rien à lire. */
  fallback?: ReactNode;
}) {
  const t = useTranslations('film');
  const [open, setOpen] = useState(Boolean(player?.autoStart));
  const resume = useResumePosition(
    player?.filmId ?? '',
    player?.serverPosition ?? null,
    player?.runtimeSec ?? null,
  );
  const runtime = player?.runtimeSec ?? null;

  if (player && open) {
    return (
      <div>
        <div className="bg-[var(--player-bg)]">
          <div className="mx-auto w-full lg:max-w-[calc(80dvh*16/9)]">
            <Player {...player} autoStart />
          </div>
        </div>
        <div className="container-page flex flex-col gap-3 pt-5">{children}</div>
      </div>
    );
  }

  const label =
    resume === null
      ? t('watch')
      : runtime
        ? t('resumeRemaining', { minutes: Math.max(1, Math.ceil((runtime - resume) / 60)) })
        : t('resume', { time: formatTimecode(resume) });

  return (
    <div data-theme="dark" className="relative overflow-hidden bg-bg text-text">
      {image}
      <div className="absolute inset-0 bg-[image:var(--scrim-bottom)]" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 px-4 pb-5 md:px-8 lg:bottom-[10%] lg:w-[46%] lg:px-12 lg:pb-0 xl:px-16">
        {children}
        {player ? (
          <div className="mt-1 flex flex-col gap-2 md:max-w-sm">
            <Button
              variant="primary"
              size="lg"
              icon="play"
              iconFilled
              className="w-full"
              onClick={() => setOpen(true)}
            >
              {label}
            </Button>
            {resume !== null && runtime ? (
              <ProgressBar value={resume / runtime} label={label} />
            ) : null}
          </div>
        ) : (
          fallback
        )}
      </div>
    </div>
  );
}
