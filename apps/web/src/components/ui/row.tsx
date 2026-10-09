import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from './icon';

/**
 * Rangée : titre (style Titre 2) et lien « Tout voir », puis défilement horizontal natif avec aimantation
 * `proximity`. Elle va jusqu'au bord de l'écran ; les tuiles commencent à la marge de page (jamais
 * contre le bord gauche, réservé au geste de retour de l'iPhone). Au-delà de la 3e rangée, le rendu est
 * différé par `content-visibility: auto` (`deferred`).
 */
export function Row({
  title,
  seeAll,
  children,
  deferred = false,
  id,
}: {
  title: string;
  /** Lien « Tout voir » : adresse et libellé accessible (« Tout voir : {titre} »). */
  seeAll?: { href: string; label: string };
  children: ReactNode;
  deferred?: boolean;
  id?: string;
}) {
  const headingId = id ? `${id}-titre` : undefined;
  return (
    <section
      aria-labelledby={headingId}
      className={`tile-size ${deferred ? '[content-visibility:auto] [contain-intrinsic-size:auto_260px]' : ''}`}
    >
      <div className="flex items-center justify-between gap-4 px-4 md:px-8 lg:px-12">
        <h2 id={headingId} className="text-xl leading-[25px] lg:text-2xl lg:leading-[30px]">
          {title}
        </h2>
        {seeAll ? (
          <Link
            transitionTypes={['push']}
            href={seeAll.href}
            aria-label={seeAll.label}
            className="press-icon -mr-2.5 grid size-11 shrink-0 place-items-center rounded-full text-muted hover:text-text"
          >
            <Icon name="chevronRight" />
          </Link>
        ) : null}
      </div>
      <div className="no-scrollbar mt-3 flex snap-x snap-proximity scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 md:scroll-px-8 md:px-8 lg:scroll-px-12 lg:px-12">
        {children}
      </div>
    </section>
  );
}
