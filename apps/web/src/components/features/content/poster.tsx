import Image from 'next/image';
import type { Image as ImageData } from '@ecine/contracts';
import { Motif } from '@/components/ui/motif';

/**
 * Image de contenu dans un cadre de proportions fixes (aucun saut de mise en page).
 * Sans image : aplat + motif, jamais d'image générique.
 */
export function Poster({
  image,
  ratio = '2/3',
  sizes,
  preload = false,
  className = '',
}: {
  image: ImageData | null;
  ratio?: '2/3' | '4/5' | '16/9' | '1/1' | '3/2';
  sizes: string;
  preload?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative w-full overflow-hidden bg-surface-2 ${className}`}
      style={{ aspectRatio: ratio }}
    >
      {image ? (
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={sizes}
          preload={preload}
          loading={preload ? 'eager' : undefined}
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 p-6">
          <Motif name="losanges" />
        </div>
      )}
    </div>
  );
}
