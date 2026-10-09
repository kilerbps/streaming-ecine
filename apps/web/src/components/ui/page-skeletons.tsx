import type { ReactNode } from 'react';
import { Skeleton, SkeletonPoster, SkeletonText } from './loader';

/**
 * Skeletons des écrans (`loading.tsx`), à la forme de la page attendue pour qu'aucun contenu ne saute
 * au remplacement. Ils n'apparaissent qu'après 150 ms (classe `.skeleton`) : une navigation rapide
 * ne clignote pas. Charte « Nuit de Kin », Skeletons et états de chargement.
 */
function Frame({
  label,
  className = '',
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div aria-busy="true" className={`container-page pt-8 md:pt-12 ${className}`}>
      <p role="status" className="sr-only">
        {label}
      </p>
      {children}
    </div>
  );
}

function TitleBlock({ intro = true }: { intro?: boolean }) {
  return (
    <div className="mb-8 flex flex-col gap-3 md:mb-12">
      <Skeleton className="h-8 w-56 rounded-sm lg:h-11 lg:w-80" />
      {intro ? <SkeletonText lines={2} className="max-w-sm" /> : null}
    </div>
  );
}

function PillRow({ count = 5 }: { count?: number }) {
  return (
    <div className="mb-10 flex gap-2 overflow-hidden">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />
      ))}
    </div>
  );
}

/** Films, Courts-métrages, Catégorie : titre, pastilles, grille de 9 affiches. */
export function CatalogSkeleton({ label }: { label: string }) {
  return (
    <Frame label={label}>
      <TitleBlock />
      <PillRow />
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i}>
            <Skeleton className="aspect-[2/3] w-full rounded-sm" />
            <SkeletonText lines={2} className="mt-2" />
          </div>
        ))}
      </div>
    </Frame>
  );
}

/** Fil de découverte (accueil, Découvrir) : titre, puis deux cartes affiche et texte. */
export function FeedSkeleton({ label }: { label: string }) {
  return (
    <Frame label={label} className="max-w-5xl">
      <TitleBlock />
      <div className="flex flex-col gap-12">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="grid gap-6 md:grid-cols-[2fr_3fr] md:items-center md:gap-10">
            <Skeleton className="aspect-[2/3] w-full rounded-sm" />
            <div className="flex flex-col gap-3">
              <Skeleton className="h-5 w-24 rounded-xs" />
              <Skeleton className="h-8 w-3/4 rounded-sm" />
              <SkeletonText lines={4} />
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/** Fiche film : image 16:9, deux lignes de titre, boutons ronds, synopsis, distribution. */
export function FilmSkeleton({ label }: { label: string }) {
  return (
    <Frame label={label} className="max-w-6xl">
      <Skeleton className="aspect-video w-full rounded-lg" />
      <div className="mt-6 flex max-w-2xl flex-col gap-3">
        <Skeleton className="h-8 w-4/5 rounded-sm" />
        <Skeleton className="h-8 w-1/2 rounded-sm" />
      </div>
      <div className="mt-6 flex gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="size-11 rounded-full" />
        ))}
      </div>
      <SkeletonText lines={4} className="mt-8 max-w-2xl" />
      <div className="mt-10 flex gap-4 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex w-[72px] shrink-0 flex-col items-center gap-2 lg:w-24">
            <Skeleton className="size-[72px] rounded-full lg:size-24" />
            <Skeleton className="h-3 w-full rounded-xs" />
          </div>
        ))}
      </div>
    </Frame>
  );
}

/** Actualités (et Nouveautés) : titre, article à la une, puis liste. */
export function NewsSkeleton({ label }: { label: string }) {
  return (
    <Frame label={label}>
      <TitleBlock />
      <div className="grid gap-6 border-b border-border pb-10 md:grid-cols-[7fr_5fr] md:gap-10">
        <Skeleton className="aspect-video w-full rounded-md" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-4/5 rounded-sm" />
          <SkeletonText lines={3} />
        </div>
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_96px] gap-4 border-b border-border py-6 md:grid-cols-[160px_1fr_200px] md:gap-8"
        >
          <Skeleton className="hidden h-4 w-24 rounded-xs md:block" />
          <SkeletonText lines={2} />
          <Skeleton className="aspect-video w-full rounded-sm" />
        </div>
      ))}
    </Frame>
  );
}

/** Recherche : titre, champ, grille de 6 vignettes. */
export function SearchSkeleton({ label }: { label: string }) {
  return (
    <Frame label={label}>
      <TitleBlock intro={false} />
      <Skeleton className="h-11 w-full max-w-2xl rounded-full" />
      <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="aspect-video w-full rounded-md" />
        ))}
      </div>
    </Frame>
  );
}

/** Moi : titre, en-tête de profil, deux rangées. */
export function MeSkeleton({ label }: { label: string }) {
  return (
    <Frame label={label}>
      <TitleBlock intro={false} />
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <SkeletonText lines={2} className="w-48" />
      </div>
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i} className="tile-size mt-10">
          <Skeleton className="h-6 w-44 rounded-xs" />
          <div className="mt-3 flex gap-2 overflow-hidden">
            {Array.from({ length: 4 }, (_, j) => (
              <SkeletonPoster key={j} />
            ))}
          </div>
        </div>
      ))}
    </Frame>
  );
}

/**
 * Talent (`portrait`), article (`cover`), pages éditoriales (`text`) : image s'il y en a une, trois
 * lignes de titre, six lignes de texte.
 */
export function DetailSkeleton({
  label,
  media = 'cover',
}: {
  label: string;
  media?: 'portrait' | 'cover' | 'text';
}) {
  return (
    <Frame label={label} className="max-w-5xl">
      <div
        className={
          media === 'portrait' ? 'grid gap-8 md:grid-cols-[1fr_2fr]' : 'flex flex-col gap-8'
        }
      >
        {media === 'text' ? null : (
          <Skeleton
            className={
              media === 'portrait'
                ? 'aspect-[4/5] w-full rounded-lg'
                : 'aspect-video w-full rounded-lg'
            }
          />
        )}
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-4/5 rounded-sm" />
          <Skeleton className="h-8 w-3/5 rounded-sm" />
          <Skeleton className="h-8 w-2/5 rounded-sm" />
          <SkeletonText lines={6} className="mt-4 max-w-2xl" />
        </div>
      </div>
    </Frame>
  );
}

/** Formulaires (compte, contact) : titre et quatre champs. */
export function FormSkeleton({ label }: { label: string }) {
  return (
    <Frame label={label} className="max-w-xl">
      <TitleBlock />
      <div className="flex flex-col gap-6">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32 rounded-xs" />
            <Skeleton className="h-11 w-full rounded-md" />
          </div>
        ))}
      </div>
    </Frame>
  );
}

/** Administration : titre, barre de filtres, dix lignes de tableau. */
export function AdminSkeleton({ label }: { label: string }) {
  return (
    <div aria-busy="true" className="py-2">
      <p role="status" className="sr-only">
        {label}
      </p>
      <Skeleton className="h-8 w-64 rounded-sm" />
      <div className="mt-6 flex gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-32 rounded-md" />
        ))}
      </div>
      <div className="mt-6 flex flex-col divide-y divide-border">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 py-3">
            <Skeleton className="size-10 shrink-0 rounded-sm" />
            <Skeleton className="h-4 flex-1 rounded-xs" />
            <Skeleton className="hidden h-4 w-24 rounded-xs md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
