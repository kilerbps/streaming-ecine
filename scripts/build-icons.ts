#!/usr/bin/env node
// Génère les icônes Solar utilisées par le site, sans appel réseau (charte, Iconographie) :
// packages/design-tokens/icons.json (sens → nom Solar → styles) + @iconify-json/solar (dépendance de
// développement) → apps/web/src/components/ui/icons/solar.generated.tsx, en currentColor.
// Usage : pnpm icons:build ; `--check` échoue si le fichier généré n'est pas à jour (pnpm check:icons).
import { readFileSync, writeFileSync } from 'node:fs';
import { format, resolveConfig } from 'prettier';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

type SolarStyle = 'linear' | 'bold' | 'bold-duotone';
interface IconSpec {
  solar: string;
  styles: SolarStyle[];
  active: SolarStyle;
}
interface IconifySet {
  icons: Record<string, { body: string }>;
  aliases?: Record<string, { parent: string }>;
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = join(root, 'apps/web/src/components/ui/icons/solar.generated.tsx');

/** Attributs SVG → noms de propriétés JSX (seuls ceux présents dans Solar). */
const ATTRIBUTES: Record<string, string> = {
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-width': 'strokeWidth',
  'stroke-dasharray': 'strokeDasharray',
  'fill-rule': 'fillRule',
  'clip-rule': 'clipRule',
  'clip-path': 'clipPath',
};

/** Nombre d'un tracé SVG (« 1.5.5 » = 1.5 puis .5). */
const NUMBER = /-?(?:\d+\.?\d*|\.\d+)/g;

/**
 * Coordonnées des tracés arrondies au centième : écart de 0,005 px au plus à 24 px, invisible, pour
 * un quart de poids en moins dans le JavaScript livré (mesure du lot 1 : 24,6 → 18,3 Ko compressés).
 */
export function roundPaths(body: string): string {
  return body.replace(/ d="([^"]*)"/g, (_match, path: string) => {
    if (/\d[eE]/.test(path)) throw new Error('Notation exponentielle non prise en charge');
    // Drapeaux d'arc compactés (« 011.5 ») : illisibles nombre par nombre, on refuse plutôt que d'abîmer.
    for (const [, args = ''] of path.matchAll(/[aA]([^a-zA-Z]*)/g)) {
      if ((args.match(NUMBER) ?? []).length % 7 !== 0) throw new Error(`Arc compacté : ${path}`);
    }
    let previousEnd = -1;
    let previousHasDot = false;
    const rounded = path.replace(NUMBER, (n: string, offset: number) => {
      // Forme courte : 0.36 → .36, -0.15 → -.15 (String(-0) donne déjà « 0 »).
      const value = String(Number(Number(n).toFixed(2))).replace(/^(-?)0\./, '$1.');
      // Deux nombres collés dans l'original (« 4.086.002 ») : un séparateur devient nécessaire si le
      // nouveau commence par un chiffre (« 4.09 » + « 0 ») ou par un point après un entier (« 2 » + « .5 »).
      const glued = previousEnd === offset;
      const needsSpace = glued && (/^\d/.test(value) || (value.startsWith('.') && !previousHasDot));
      previousEnd = offset + n.length;
      previousHasDot = value.includes('.');
      return needsSpace ? ` ${value}` : value;
    });
    return ` d="${rounded}"`;
  });
}

export function toJsx(body: string): string {
  if (/<(script|foreignObject)|\son\w+=/i.test(body)) throw new Error('Contenu SVG inattendu');
  return roundPaths(body).replace(/ ([a-z-]+)="/g, (match, name: string) =>
    ATTRIBUTES[name] ? ` ${ATTRIBUTES[name]}="` : match,
  );
}

export async function generate(): Promise<string> {
  const require = createRequire(join(root, 'package.json'));
  const solar = require('@iconify-json/solar/icons.json') as IconifySet;
  const spec = JSON.parse(
    readFileSync(join(root, 'packages/design-tokens/icons.json'), 'utf8'),
  ) as {
    icons: Record<string, IconSpec>;
    attribution: string;
  };
  const bodyOf = (name: string): string => {
    const icon = solar.icons[name] ?? solar.icons[solar.aliases?.[name]?.parent ?? ''];
    if (!icon) throw new Error(`Icône Solar introuvable : ${name}`);
    return icon.body;
  };

  const entries = Object.entries(spec.icons).map(([name, icon]) => {
    // Fragment : certaines icônes ont plusieurs éléments à la racine.
    const styles = icon.styles
      .map((style) => `    '${style}': <>${toJsx(bodyOf(`${icon.solar}-${style}`))}</>,`)
      .join('\n');
    return `  ${name}: {\n${styles}\n  },`;
  });
  const active = Object.entries(spec.icons)
    .map(([name, icon]) => `  ${name}: '${icon.active}',`)
    .join('\n');

  const source = `// Fichier généré par scripts/build-icons.ts — ne pas modifier à la main (pnpm icons:build).
// ${spec.attribution}
import type { ReactElement } from 'react';

export type SolarStyle = 'linear' | 'bold' | 'bold-duotone';

export const SOLAR_ICONS = {
${entries.join('\n')}
} satisfies Record<string, Partial<Record<SolarStyle, ReactElement>>>;

export type IconName = keyof typeof SOLAR_ICONS;

/** Style d'une icône active (onglet courant, J'aime, Ma liste) : prop \`filled\` du composant Icon. */
export const ACTIVE_STYLE: Record<IconName, SolarStyle> = {
${active}
};
`;
  // Formaté comme le reste du dépôt : `--check` compare donc exactement le fichier enregistré.
  const options = (await resolveConfig(OUTPUT)) ?? {};
  return format(source, { ...options, filepath: OUTPUT });
}

async function main(): Promise<void> {
  const output = await generate();
  if (process.argv.includes('--check')) {
    let current = '';
    try {
      current = readFileSync(OUTPUT, 'utf8');
    } catch {
      // Fichier absent : traité comme périmé.
    }
    if (current !== output) {
      console.error('Icônes périmées : lancez pnpm icons:build');
      process.exit(1);
    }
    console.log('Icônes Solar à jour.');
    return;
  }
  writeFileSync(OUTPUT, output);
  console.log(`Icônes générées : ${OUTPUT}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
