import Image from 'next/image';
import type { Image as ImageData } from '@ecine/contracts';
import { Illustration } from './illustration';

export type MediaRatio = '2/3' | '4/5' | '16/9' | '1/1' | '3/2' | '9/16';

/**
 * Image de contenu dans un cadre de proportions fixes (aucun saut de mise en page). Ordre d'apparition :
 * couleur dominante → aperçu flou → image (charte, Skeletons). Couleur et aperçu sont calculés à
 * l'envoi de l'image en administration (lot 3) ; sans eux, le cadre reste en `--surface-2`.
 * Sans image : illustration du logo, jamais d'image générique.
 */
export function MediaImage({
  image,
  ratio = '2/3',
  sizes,
  preload = false,
  color,
  blurDataUrl,
  focal,
  className = '',
  imageClassName = '',
}: {
  image: ImageData | null;
  /** `null` : proportions fixées par `className` (ex. 4:5 sur mobile, 16:9 sur PC). */
  ratio?: MediaRatio | null;
  sizes: string;
  preload?: boolean;
  /** Couleur dominante (#rrggbb) affichée avant l'image. */
  color?: string | null;
  /** Aperçu flou de 16 px (data:image/webp). */
  blurDataUrl?: string | null;
  /** Point focal en pourcentage (« 50% 30% ») : les visages ne sont pas coupés. */
  focal?: string | null;
  className?: string;
  imageClassName?: string;
}) {
  return (
    <div
      className={`relative w-full overflow-hidden bg-surface-2 ${className}`}
      style={{ aspectRatio: ratio ?? undefined, backgroundColor: color ?? undefined }}
    >
      {image ? (
        <>
          {blurDataUrl ? (
            // Aperçu flou par un élément dédié : l'option placeholder de next/image passe par un style
            // en ligne de fond, et l'image finale le recouvre (fondu de 240 ms prévu au lot 3).
            // eslint-disable-next-line @next/next/no-img-element -- aperçu de 16 px inclus en data:, pas une image chargée
            <img
              src={blurDataUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 size-full scale-110 object-cover blur-lg"
              style={{ objectPosition: focal ?? undefined }}
            />
          ) : null}
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes={sizes}
            preload={preload}
            loading={preload ? 'eager' : undefined}
            className={`object-cover ${imageClassName}`}
            style={{ objectPosition: focal ?? undefined }}
          />
        </>
      ) : (
        <div className="absolute inset-0 grid place-items-center p-[18%]">
          <Illustration variant="empty" className="h-auto w-full" />
        </div>
      )}
    </div>
  );
}
