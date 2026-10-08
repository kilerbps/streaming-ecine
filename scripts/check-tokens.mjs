#!/usr/bin/env node
// Échoue si une couleur, un rayon, une ombre ou une durée est écrit en dur dans les composants et les
// pages du site (charte « Nuit de Kin », règle d'or n° 2) : tout passe par packages/design-tokens/tokens.css.
// Vérifie aussi que lib/theme-colors.ts reflète exactement --bg de tokens.css.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const web = join(root, 'apps/web/src');
const SCAN = [join(web, 'components'), join(web, 'app')];
const EXTENSIONS = /\.(tsx|ts|css)$/;
// Exceptions justifiées : logo (couleurs de marque dans le SVG), images de partage (rendu hors CSS),
// icônes générées, feuille globale (elle relie les jetons à Tailwind et définit les animations).
const ALLOWED_FILES = new Set([
  'apps/web/src/components/ui/logo.tsx',
  'apps/web/src/components/ui/icons/solar.generated.tsx',
  'apps/web/src/app/globals.css',
]);
const ALLOWED_PATTERNS = [/opengraph-image\.tsx$/, /\/og\.tsx$/];

const RULES = [
  {
    name: 'couleur hexadécimale',
    re: /(?<![\w&/-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![\w-])/,
  },
  { name: 'couleur rgb()/hsl()', re: /\b(?:rgba?|hsla?|oklch|oklab)\(/ },
  {
    name: 'couleur de la palette Tailwind',
    re: /\b(?:bg|text|border|fill|stroke|ring|outline|decoration|accent|caret|divide|placeholder)-(?:white|black|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3})\b/,
  },
  { name: 'rayon en dur', re: /rounded(?:-[a-z]{1,2})?-\[(?!var\()|borderRadius:\s*['"`]?\d/ },
  { name: 'ombre en dur', re: /shadow-\[(?!var\()|boxShadow:\s*['"`]/ },
  { name: 'durée en dur', re: /\b\d+(?:\.\d+)?m?s_|duration-\d|duration-\[(?!var\()|delay-\d/ },
];

const hits = [];
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    if (!EXTENSIONS.test(entry)) continue;
    const rel = relative(root, full).split(sep).join('/');
    if (ALLOWED_FILES.has(rel) || ALLOWED_PATTERNS.some((re) => re.test(rel))) continue;
    readFileSync(full, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return; // commentaires
        for (const rule of RULES) {
          if (rule.re.test(line)) hits.push(`${rel}:${i + 1} : ${rule.name} — ${line.trim()}`);
        }
      });
  }
}
for (const dir of SCAN) walk(dir);

// lib/theme-colors.ts = --bg des deux thèmes.
const tokens = readFileSync(join(root, 'packages/design-tokens/tokens.css'), 'utf8');
const bgOf = (marker) => {
  for (const [, selector, body] of tokens.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (selector.includes(marker))
      return body.match(/--bg:\s*(#[0-9a-fA-F]{6})/)?.[1]?.toLowerCase();
  }
  return undefined;
};
const themeColors = readFileSync(join(web, 'lib/theme-colors.ts'), 'utf8');
for (const [key, marker] of [
  ['dark', "[data-theme='dark']"],
  ['light', "[data-theme='light']"],
]) {
  const declared = themeColors.match(new RegExp(`${key}: '(#[0-9a-fA-F]{6})'`))?.[1]?.toLowerCase();
  const expected = bgOf(marker);
  if (!declared || declared !== expected) {
    hits.push(
      `apps/web/src/lib/theme-colors.ts : ${key} = ${declared} au lieu de --bg ${expected}`,
    );
  }
}

if (hits.length > 0) {
  console.error('Valeurs en dur (utiliser les jetons de packages/design-tokens/tokens.css) :');
  for (const hit of hits) console.error(`  ${hit}`);
  process.exit(1);
}
console.log('Jetons respectés : aucune couleur, rayon, ombre ni durée en dur.');
