import 'dotenv/config';
import { existsSync, readdirSync } from 'node:fs';
import { readFile, rename } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Logger } from '@nestjs/common';
import sharp from 'sharp';
import { IMAGE_WIDTHS } from '@ecine/contracts';
import { WEBP_OPTIONS } from '../media/image-processing.js';

/**
 * Rattrapage : produit les largeurs ajoutées à IMAGE_WIDTHS (160 et 480 px, octobre 2026) pour les
 * images déjà envoyées, à partir de la plus grande variante présente (l'original n'est pas gardé).
 * N'écrit que les fichiers absents, jamais par-dessus une variante existante : sans risque à
 * relancer, y compris en production. Ne touche pas à la base.
 *
 *   node dist/maintenance/backfill-image-variants.js
 */
const logger = new Logger('BackfillImageVariants');

async function main(): Promise<void> {
  const root = join(resolve(process.env.STORAGE_DIR ?? './storage'), 'images');
  if (!existsSync(root)) {
    logger.log(`Aucun dossier d'images (${root}).`);
    return;
  }
  const largestFirst = [...IMAGE_WIDTHS].reverse();
  let images = 0;
  let written = 0;
  for (const id of readdirSync(root)) {
    const dir = join(root, id);
    const source = largestFirst.map((w) => join(dir, `w${w}.webp`)).find((f) => existsSync(f));
    if (!source) continue;
    const missing = IMAGE_WIDTHS.filter((w) => !existsSync(join(dir, `w${w}.webp`)));
    if (missing.length === 0) continue;
    // Lu en mémoire : sharp garderait sinon un descripteur ouvert (verrou sous Windows).
    const input = await readFile(source);
    for (const width of missing) {
      const target = join(dir, `w${width}.webp`);
      // Écriture puis renommage : jamais de fichier à moitié écrit servi par Caddy.
      await sharp(input)
        .resize({ width, withoutEnlargement: true })
        .webp(WEBP_OPTIONS)
        .toFile(`${target}.tmp`);
      await rename(`${target}.tmp`, target);
      written += 1;
    }
    images += 1;
  }
  logger.log(`${written} variante(s) ajoutée(s) pour ${images} image(s).`);
}

main().catch((err: unknown) => {
  logger.error((err as Error).message);
  process.exit(1);
});
