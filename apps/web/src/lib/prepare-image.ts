/**
 * Préparation d'une image avant l'envoi, dans le navigateur (administration) : réduite à la plus
 * grande largeur utile (1 920 px, la plus grande variante produite par l'API) et réencodée en
 * WebP de bonne qualité. Une photo de téléphone de 5 Mo devient environ 500 Ko : l'envoi passe sous
 * la limite de 4 Mo et prend quelques secondes au lieu de minutes sur un réseau mobile lent. Les
 * métadonnées (EXIF, GPS) disparaissent au passage ; l'orientation est appliquée.
 *
 * Le serveur réencode de toute façon (variantes WebP) : aucune perte visible. En cas d'échec (format
 * illisible par le navigateur), le fichier d'origine est rendu tel quel.
 */
export const UPLOAD_MAX_WIDTH = 1920;
/** En dessous, l'image est déjà légère : envoyée telle quelle si sa largeur convient. */
const LIGHT_BYTES = 700_000;
const QUALITY = 0.9;

/** Types que le navigateur sait souvent décoder et que l'on convertit (photos d'iPhone). */
export const CONVERTIBLE_TYPES = ['image/heic', 'image/heif'] as const;

function encode(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

function renamed(name: string, type: string): string {
  const ext = type === 'image/webp' ? 'webp' : 'jpg';
  return `${name.replace(/\.[^.]+$/, '') || 'image'}.${ext}`;
}

export async function prepareImageForUpload(file: File): Promise<File> {
  if (typeof createImageBitmap !== 'function') return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }
  const convertible = (CONVERTIBLE_TYPES as readonly string[]).includes(file.type);
  if (!convertible && file.size <= LIGHT_BYTES && bitmap.width <= UPLOAD_MAX_WIDTH) {
    bitmap.close();
    return file;
  }
  const scale = Math.min(1, UPLOAD_MAX_WIDTH / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // WebP garde la transparence (titres dessinés). Safari ne l'encode pas (il rend du PNG) : JPEG
  // pour une image opaque, sinon le fichier d'origine.
  let blob = await encode(canvas, 'image/webp');
  if (blob?.type !== 'image/webp') {
    blob = file.type === 'image/png' ? null : await encode(canvas, 'image/jpeg');
  }
  if (!blob || (!convertible && blob.size >= file.size)) return file;
  return new File([blob], renamed(file.name, blob.type), { type: blob.type });
}
