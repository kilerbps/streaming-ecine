import type { CropRect, FocalPoint, Image, ImageRatio } from '@ecine/contracts';

/** Largeur sur hauteur de chaque format de recadrage. */
export const RATIO_VALUES: Record<ImageRatio, number> = {
  '2:3': 2 / 3,
  '4:5': 4 / 5,
  '16:9': 16 / 9,
  '1:1': 1,
  '9:16': 9 / 16,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value * 10_000) / 10_000;

/**
 * Recadrage déduit du point focal : le plus grand rectangle du format (divisé par `zoom`), centré sur
 * le sujet puis ramené dans l'image. Fractions de l'image (x, y, largeur, hauteur).
 */
export function cropAround(
  size: { width: number; height: number },
  ratio: ImageRatio,
  center: FocalPoint = { x: 0.5, y: 0.5 },
  zoom = 1,
): CropRect {
  const target = RATIO_VALUES[ratio];
  let w = size.width;
  let h = w / target;
  if (h > size.height) {
    h = size.height;
    w = h * target;
  }
  w /= zoom;
  h /= zoom;
  const x = clamp(center.x * size.width - w / 2, 0, size.width - w);
  const y = clamp(center.y * size.height - h / 2, 0, size.height - h);
  return {
    x: round(x / size.width),
    y: round(y / size.height),
    w: round(w / size.width),
    h: round(h / size.height),
  };
}

/** Déplace un recadrage (fractions), sans jamais sortir de l'image. */
export function moveCrop(rect: CropRect, dx: number, dy: number): CropRect {
  return {
    ...rect,
    x: round(clamp(rect.x + dx, 0, 1 - rect.w)),
    y: round(clamp(rect.y + dy, 0, 1 - rect.h)),
  };
}

/** Zoom du recadrage (1 = le plus grand possible) déduit de sa taille. */
export function cropZoom(
  size: { width: number; height: number },
  ratio: ImageRatio,
  rect: CropRect,
): number {
  const full = cropAround(size, ratio);
  return Math.round((full.w / rect.w) * 100) / 100;
}

/** Centre d'un recadrage (pour zoomer sans le décaler). */
export const cropCenter = (rect: CropRect): FocalPoint => ({
  x: rect.x + rect.w / 2,
  y: rect.y + rect.h / 2,
});

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
