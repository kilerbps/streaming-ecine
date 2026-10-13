import Image from 'next/image';
import type { CSSProperties } from 'react';
import type { Image as ImageData, ImageRatio } from '@ecine/contracts';
import { cropKey, objectPosition } from '@/lib/image-framing';
import { Illustration } from './illustration';

export type MediaRatio = '2/3' | '4/5' | '16/9' | '1/1' | '3/2' | '9/16';

/** Recadrage à appliquer : un ratio, ou un ratio par taille d'écran (mobile, puis dès 1 056 px). */
export type MediaCrop = ImageRatio | { base: ImageRatio; lg: ImageRatio };

/**
 * Image de contenu dans un cadre de proportions fixes (aucun saut de mise en page). Ordre d'apparition :
 * couleur dominante → aperçu flou → image (charte, Skeletons), tous deux calculés à l'envoi. Le cadrage
 * suit le recadrage du ratio affiché, sinon le point focal posé en administration : les visages ne
 * sont pas coupés. Sans image : illustration du logo, jamais d'image générique.
 */
export function MediaImage({
  image,
  ratio = '2/3',
  crop,
  sizes,
  preload = false,
  className = '',
  imageClassName = '',
}: {
  image: ImageData | null;
  /** `null` : proportions fixées par `className` (ex. 4:5 sur mobile, 16:9 sur PC). */
  ratio?: MediaRatio | null;
  /** Recadrage à utiliser ; par défaut, celui du ratio affiché. */
  crop?: MediaCrop;
  sizes: string;
  preload?: boolean;
  className?: string;
  imageClassName?: string;
}) {
  const base = typeof crop === 'object' ? crop.base : (crop ?? cropKey(ratio));
  const lg = typeof crop === 'object' ? crop.lg : base;
  const position = image
    ? ({
        '--pos': objectPosition(image, base) ?? '50% 50%',
        '--pos-lg': objectPosition(image, lg) ?? '50% 50%',
      } as CSSProperties)
    : undefined;
  const framing = '[object-position:var(--pos)] lg:[object-position:var(--pos-lg)]';

  return (
    <div
      className={`relative w-full overflow-hidden bg-surface-2 ${className}`}
      style={{
        aspectRatio: ratio ?? undefined,
        backgroundColor: image?.color ?? undefined,
        ...position,
      }}
    >
      {image ? (
        <>
          {image.blur ? (
            // Aperçu flou par un élément dédié : l'option placeholder de next/image passe par un style
            // en ligne de fond ; l'image finale le recouvre dès qu'elle arrive.
            // eslint-disable-next-line @next/next/no-img-element -- aperçu de 16 px inclus en data:, pas une image chargée
            <img
              src={image.blur}
              alt=""
              aria-hidden="true"
              className={`absolute inset-0 size-full scale-110 object-cover blur-lg ${framing}`}
            />
          ) : null}
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes={sizes}
            preload={preload}
            loading={preload ? 'eager' : undefined}
            className={`object-cover ${framing} ${imageClassName}`}
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
