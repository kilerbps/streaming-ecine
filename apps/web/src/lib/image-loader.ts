'use client';

import { IMAGE_WIDTHS } from '@ecine/contracts';

/**
 * Chargeur next/image : l'API a déjà produit des WebP compressés aux largeurs IMAGE_WIDTHS.
 * On choisit la plus petite largeur suffisante (aucune réoptimisation par Vercel).
 */
export default function ecineImageLoader({
  src,
  width,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  if (src.startsWith('/') || src.startsWith('data:')) return src;
  const best = IMAGE_WIDTHS.find((w) => w >= width) ?? IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1];
  return `${src}/w${best}.webp`;
}
