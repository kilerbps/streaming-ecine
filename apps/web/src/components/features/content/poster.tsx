import type { Image as ImageData } from '@ecine/contracts';
import { MediaImage } from '@/components/ui/media-image';

/**
 * Image de contenu dans un cadre de proportions fixes (aucun saut de mise en page).
 * Sans image : illustration du logo, jamais d'image générique. Voir `ui/media-image.tsx`.
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
    <MediaImage image={image} ratio={ratio} sizes={sizes} preload={preload} className={className} />
  );
}
