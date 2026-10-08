#!/usr/bin/env node
// Échoue si un dégradé apparaît dans le code source (CSS, SVG, TS/TSX). Charte « Nuit de Kin » (D-01) :
// trois dégradés seulement, définis une fois dans tokens.css — voile bas, voile haut et halo d'ambiance.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_DIRS = ['apps', 'packages'];
const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  'dist',
  'coverage',
  '.turbo',
  'generated',
  'storage',
  // Rapports générés par Playwright (code tiers minifié), jamais livrés.
  'playwright-report',
  'test-results',
]);
const EXTENSIONS = /\.(css|scss|svg|ts|tsx|js|jsx|mjs|html|json)$/;
const PATTERN = /gradient/i;
// Exceptions ligne par ligne (fichier, motif) : les trois dégradés autorisés et le nom de cette commande.
const ALLOWED_LINES = [
  {
    file: 'packages/design-tokens/tokens.css',
    re: /^\s*--scrim-(?:bottom|top):\s*linear-gradient\(/,
  },
  { file: 'packages/design-tokens/tokens.css', re: /^\s*background: radial-gradient\($/ },
  { file: null, re: /check:gradient/ },
];
const allowed = (rel, line) =>
  ALLOWED_LINES.some((a) => (a.file === null || a.file === rel) && a.re.test(line));

const hits = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
    } else if (EXTENSIONS.test(entry)) {
      const rel = relative(root, full).split(sep).join('/');
      readFileSync(full, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (PATTERN.test(line) && !allowed(rel, line))
            hits.push(`${rel}:${i + 1}: ${line.trim()}`);
        });
    }
  }
}

for (const dir of SCAN_DIRS) walk(join(root, dir));

if (hits.length > 0) {
  console.error('Dégradé(s) détecté(s) — interdit par le design system :');
  for (const hit of hits) console.error(`  ${hit}`);
  process.exit(1);
}
console.log('Aucun dégradé trouvé.');
