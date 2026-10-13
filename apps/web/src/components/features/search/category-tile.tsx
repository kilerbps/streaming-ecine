import Link from 'next/link';
import type { CategoryOverview } from '@ecine/contracts';
import { MediaImage } from '@/components/ui/media-image';

/**
 * Vignette « Explorer par catégorie » : image 16:9 (affiche du titre le plus récent), voile du bas,
 * nom et nombre de titres. Zone d'image : toujours en Nuit, quel que soit le thème.
 */
export function CategoryTile({
  category,
  href,
  countLabel,
  eager = false,
}: {
  category: CategoryOverview;
  href: string;
  countLabel: string;
  eager?: boolean;
}) {
  return (
    <Link
      transitionTypes={['push']}
      href={href}
      data-theme="dark"
      className="press group relative block overflow-hidden rounded-md bg-surface-2"
    >
      <MediaImage
        image={category.cover}
        ratio="16/9"
        preload={eager}
        sizes="(min-width: 1056px) 23vw, (min-width: 672px) 30vw, 46vw"
        imageClassName="transition-transform duration-[var(--dur-base)] ease-[var(--ease-standard)] lg:group-hover:scale-[1.04]"
      />
      <div className="absolute inset-0 bg-[image:var(--scrim-bottom)]" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col p-3 lg:p-4">
        <span className="line-clamp-2 text-[17px] font-semibold leading-[22px] text-text lg:text-xl lg:leading-[25px]">
          {category.name}
        </span>
        <span className="text-[13px] leading-[18px] text-muted">{countLabel}</span>
      </div>
    </Link>
  );
}
