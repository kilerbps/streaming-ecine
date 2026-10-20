#!/usr/bin/env node
// Génère toutes les déclinaisons du logo à partir de packages/design-tokens/logo/{logo,symbol}.svg
// (charte « Nuit de Kin », Lecture du logo) : icônes de l'app installable (symbole blanc sur le bleu
// du logo, version « maskable » avec 80 % de zone utile), favicon SVG, icône Apple, écrans de
// démarrage iPhone (logo complet sur le fond Nuit), la liste de ces écrans pour les métadonnées et
// le filigrane des aperçus promotionnels (apps/api/assets/watermark.png).
// Quand le SVG officiel arrive : remplacer les deux fichiers source, puis `pnpm brand:build`.
// Rendu par sharp, déjà installé pour l'API (aucune nouvelle dépendance).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const web = join(root, 'apps/web');
const sharp = createRequire(join(root, 'apps/api/package.json'))('sharp') as (input: Buffer) => {
  png: (options: object) => { toFile: (path: string) => Promise<unknown> };
};

/** Couleurs de la charte : bleu du logo, fond Nuit, blanc. */
const BLUE = '#1e76bc';
const NIGHT = '#0a0f16';
const WHITE = '#ffffff';

/** Écrans de démarrage iPhone (portrait) : taille en points CSS et densité. */
const IPHONES = [
  { w: 440, h: 956, dpr: 3 }, // 16 Pro Max
  { w: 402, h: 874, dpr: 3 }, // 16 Pro
  { w: 430, h: 932, dpr: 3 }, // 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus
  { w: 393, h: 852, dpr: 3 }, // 14 Pro, 15, 15 Pro, 16
  { w: 428, h: 926, dpr: 3 }, // 12 et 13 Pro Max, 14 Plus
  { w: 390, h: 844, dpr: 3 }, // 12, 13, 14
  { w: 375, h: 812, dpr: 3 }, // X, XS, 11 Pro, 12 et 13 mini
  { w: 414, h: 896, dpr: 3 }, // XS Max, 11 Pro Max
  { w: 414, h: 896, dpr: 2 }, // XR, 11
  { w: 375, h: 667, dpr: 2 }, // SE (2e et 3e générations), 8
];

interface Source {
  viewBox: [number, number, number, number];
  inner: string;
}

function readSource(name: string): Source {
  const svg = readFileSync(join(root, 'packages/design-tokens/logo', name), 'utf8');
  const box = svg
    .match(/viewBox="([^"]+)"/)?.[1]
    ?.split(/\s+/)
    .map(Number);
  if (!box || box.length !== 4) throw new Error(`viewBox introuvable dans ${name}`);
  const inner = svg
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  return { viewBox: box as Source['viewBox'], inner };
}

/** Recolore le symbole (bleu du logo → couleur demandée), sans toucher au badge. */
function recolor(source: Source, color: string): Source {
  return { ...source, inner: source.inner.replaceAll(`fill="${BLUE}"`, `fill="${color}"`) };
}

/** Image carrée ou rectangulaire : fond plein, logo centré sur `ratio` de la largeur. */
function compose(
  width: number,
  height: number,
  background: string,
  logo: Source,
  ratio: number,
  radius = 0,
): string {
  const [, , vbW, vbH] = logo.viewBox;
  const w = width * ratio;
  const h = (w * vbH) / vbW;
  const x = (width - w) / 2;
  const y = (height - h) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" rx="${radius}" fill="${background}"/><svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${logo.viewBox.join(' ')}">${logo.inner}</svg></svg>`;
}

async function png(svg: string, path: string): Promise<void> {
  mkdirSync(dirname(path), { recursive: true });
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toFile(path);
  console.log(`  ${path.slice(root.length + 1)}`);
}

async function main(): Promise<void> {
  const symbolWhite = recolor(readSource('symbol.svg'), WHITE);
  const logo = readSource('logo.svg');

  // Icônes de l'app : symbole blanc sur le bleu du logo (charte, Icône d'app installable).
  await png(compose(192, 192, BLUE, symbolWhite, 0.64), join(web, 'public/icons/icon-192.png'));
  await png(compose(512, 512, BLUE, symbolWhite, 0.64), join(web, 'public/icons/icon-512.png'));
  // « maskable » : le symbole tient dans le cercle de 80 % que les lanceurs Android gardent.
  await png(compose(512, 512, BLUE, symbolWhite, 0.52), join(web, 'public/icons/maskable-512.png'));
  await png(compose(180, 180, BLUE, symbolWhite, 0.64), join(web, 'src/app/apple-icon.png'));

  // Favicon vectoriel (onglets, favoris) : carré à coins arrondis.
  writeFileSync(
    join(web, 'src/app/icon.svg'),
    `${compose(512, 512, BLUE, symbolWhite, 0.7, 112).replace(/ width="512" height="512" viewBox/, ' viewBox')}\n`,
  );
  console.log('  apps/web/src/app/icon.svg');

  // Filigrane des aperçus promotionnels (ADR-0015) : symbole blanc sur fond transparent, que le
  // worker réduit à ~10 % de la largeur de l'extrait avec une opacité de 60 %.
  const [, , symbolW, symbolH] = symbolWhite.viewBox;
  await png(
    compose(480, Math.round((480 * symbolH) / symbolW), 'none', symbolWhite, 1),
    join(root, 'apps/api/assets/watermark.png'),
  );

  // Écrans de démarrage iPhone : logo complet centré sur le fond Nuit.
  const images: Array<{ url: string; media: string }> = [];
  for (const phone of IPHONES) {
    const width = phone.w * phone.dpr;
    const height = phone.h * phone.dpr;
    const name = `iphone-${width}x${height}.png`;
    await png(compose(width, height, NIGHT, logo, 0.4), join(web, 'public/splash', name));
    images.push({
      url: `/splash/${name}`,
      media: `(device-width: ${phone.w}px) and (device-height: ${phone.h}px) and (-webkit-device-pixel-ratio: ${phone.dpr}) and (orientation: portrait)`,
    });
  }
  writeFileSync(
    join(web, 'src/app/startup-images.generated.ts'),
    `// Fichier généré par scripts/build-brand.ts — ne pas modifier à la main (pnpm brand:build).\n/** Écrans de démarrage iPhone (apple-touch-startup-image), un par taille d'écran. */\nexport const STARTUP_IMAGES = ${JSON.stringify(images, null, 2)};\n`,
  );
  console.log('  apps/web/src/app/startup-images.generated.ts');
}

await main();
