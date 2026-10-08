#!/usr/bin/env node
// Génère le thème « Automatique » (D-09) dans tokens.css : les déclarations du bloc
// [data-theme='light'] recopiées sous @media (prefers-color-scheme: light) pour [data-theme='auto'],
// entre les marqueurs « theme-auto:start » et « theme-auto:end ». Le thème Jour reste la seule
// source des valeurs. Usage : pnpm tokens:theme ; `--check` échoue si le bloc n'est pas à jour.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';

const TOKENS = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'packages/design-tokens/tokens.css',
);
const START = '/* theme-auto:start';
const END = '/* theme-auto:end */';

export function lightDeclarations(css: string): string {
  const open = css.indexOf("[data-theme='light'] {");
  if (open < 0) throw new Error("Bloc [data-theme='light'] introuvable");
  const close = css.indexOf('}', open);
  return css.slice(css.indexOf('{', open) + 1, close).trim();
}

export async function build(css: string): Promise<string> {
  const start = css.indexOf(START);
  const end = css.indexOf(END);
  if (start < 0 || end < 0)
    throw new Error('Marqueurs theme-auto:start / theme-auto:end introuvables');
  const headerEnd = css.indexOf('*/', start) + 2;
  const block = `@media (prefers-color-scheme: light) {\n  [data-theme='auto'] {\n${lightDeclarations(css)}\n  }\n}`;
  const next = `${css.slice(0, headerEnd)}\n${block}\n${css.slice(end)}`;
  const options = (await resolveConfig(TOKENS)) ?? {};
  return format(next, { ...options, filepath: TOKENS });
}

async function main(): Promise<void> {
  const css = readFileSync(TOKENS, 'utf8');
  const next = await build(css);
  if (process.argv.includes('--check')) {
    if (next !== css) {
      console.error('Thème Automatique périmé : lancez pnpm tokens:theme');
      process.exit(1);
    }
    console.log('Thème Automatique à jour.');
    return;
  }
  writeFileSync(TOKENS, next);
  console.log('Thème Automatique généré dans tokens.css.');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
