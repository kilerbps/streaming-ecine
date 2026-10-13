import type { Image, ImageRatio } from '@ecine/contracts';

/** Ratio d'affichage (« 2/3 ») vers la clé de recadrage enregistrée en administration (« 2:3 »). */
export function cropKey(ratio: string | null | undefined): ImageRatio | null {
  switch (ratio) {
    case '2/3':
      return '2:3';
    case '4/5':
      return '4:5';
    case '16/9':
      return '16:9';
    case '1/1':
      return '1:1';
    case '9/16':
      return '9:16';
    default:
      return null;
  }
}

const percent = (value: number) => `${Math.round(Math.min(1, Math.max(0, value)) * 1000) / 10}%`;

/**
 * Cadrage d'une image remplie (`object-fit: cover`) : `object-position` tiré du recadrage du ratio
 * s'il existe, sinon du point focal (les visages restent dans le cadre). Avec `cover`, une position
 * p aligne le point p de l'image sur le point p du cadre : pour un recadrage commençant en x et
 * large de w, p = x / (1 − w).
 */
export function objectPosition(
  image: Pick<Image, 'focal' | 'crops'>,
  ratio: ImageRatio | null,
): string | undefined {
  const rect = ratio ? image.crops?.[ratio] : undefined;
  if (rect) {
    const px = rect.w >= 1 ? 0.5 : rect.x / (1 - rect.w);
    const py = rect.h >= 1 ? 0.5 : rect.y / (1 - rect.h);
    return `${percent(px)} ${percent(py)}`;
  }
  if (image.focal) return `${percent(image.focal.x)} ${percent(image.focal.y)}`;
  return undefined;
}
