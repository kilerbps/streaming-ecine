#!/usr/bin/env node
// Vérifie les contrastes WCAG des paires de tokens, en sombre et en clair.
// Source : packages/design-tokens/tokens.css + contrast-pairs.json. Échoue (code 1) si une paire est sous le seuil.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(root, 'packages/design-tokens/tokens.css'), 'utf8');
const { pairs } = JSON.parse(
  readFileSync(join(root, 'packages/design-tokens/contrast-pairs.json'), 'utf8'),
);

/** Extrait les variables d'un bloc dont le sélecteur contient `marker`. */
function readTheme(marker) {
  const blockRe = /([^{}]+)\{([^{}]*)\}/g;
  const vars = {};
  for (const [, selector, body] of css.matchAll(blockRe)) {
    if (!selector.includes(marker)) continue;
    for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) {
      vars[name] = value;
    }
  }
  return vars;
}

function luminance(hex) {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const themes = {
  dark: readTheme("[data-theme='dark']"),
  light: readTheme("[data-theme='light']"),
};

let failures = 0;
for (const [theme, vars] of Object.entries(themes)) {
  console.log(`\nThème ${theme}`);
  for (const { fg, bg, min } of pairs) {
    if (!vars[fg] || !vars[bg]) {
      console.log(`  ✗ ${fg} / ${bg} : token manquant`);
      failures++;
      continue;
    }
    const r = ratio(vars[fg], vars[bg]);
    const ok = r >= min;
    if (!ok) failures++;
    console.log(`  ${ok ? '✓' : '✗'} ${fg} sur ${bg} : ${r.toFixed(2)}:1 (min ${min}:1)`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} paire(s) en échec.`);
  process.exit(1);
}
console.log('\nTous les contrastes sont conformes.');
