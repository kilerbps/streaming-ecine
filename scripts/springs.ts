#!/usr/bin/env node
// Génère les ressorts de la charte en courbes CSS linear() (48 points) et les écrit dans tokens.css,
// entre les marqueurs « springs:start » et « springs:end ». Usage : pnpm tokens:springs
// Charte : docs/05-DESIGN-SYSTEM.md (Mouvement). Aucune bibliothèque d'animation n'est nécessaire.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';

interface Spring {
  name: string;
  stiffness: number;
  damping: number;
  mass: number;
  durationMs: number;
}

const SPRINGS: Spring[] = [
  // Sans dépassement : feuilles, indicateur d'onglet.
  { name: 'smooth', stiffness: 170, damping: 26, mass: 1, durationMs: 500 },
  // Dépassement d'environ 3 % : relâchement d'un appui, icône d'onglet, clap.
  { name: 'snappy', stiffness: 400, damping: 30, mass: 1, durationMs: 350 },
];
const POINTS = 48;

/** Position d'un ressort amorti lâché de 0 vers 1, sans vitesse initiale, à l'instant t (secondes). */
export function springPosition(spring: Spring, t: number): number {
  const omega = Math.sqrt(spring.stiffness / spring.mass);
  const zeta = spring.damping / (2 * Math.sqrt(spring.stiffness * spring.mass));
  if (zeta < 1) {
    const omegaD = omega * Math.sqrt(1 - zeta * zeta);
    const envelope = Math.exp(-zeta * omega * t);
    return 1 - envelope * (Math.cos(omegaD * t) + ((zeta * omega) / omegaD) * Math.sin(omegaD * t));
  }
  if (zeta === 1) return 1 - (1 + omega * t) * Math.exp(-omega * t);
  const r1 = -omega * (zeta - Math.sqrt(zeta * zeta - 1));
  const r2 = -omega * (zeta + Math.sqrt(zeta * zeta - 1));
  return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
}

/** Courbe linear() échantillonnée sur la durée du ressort ; le dernier point vaut 1. */
export function springEasing(spring: Spring): string {
  const values: string[] = [];
  for (let i = 0; i < POINTS; i += 1) {
    const t = (i / (POINTS - 1)) * (spring.durationMs / 1000);
    const x = i === POINTS - 1 ? 1 : springPosition(spring, t);
    values.push(String(Math.round(x * 10_000) / 10_000));
  }
  return `linear(${values.join(', ')})`;
}

async function main(): Promise<void> {
  const tokensPath = join(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    'packages/design-tokens/tokens.css',
  );
  const css = readFileSync(tokensPath, 'utf8');
  const start = css.indexOf('/* springs:start');
  const end = css.indexOf('/* springs:end */');
  if (start < 0 || end < 0) throw new Error('Marqueurs springs:start / springs:end introuvables');
  const headerEnd = css.indexOf('*/', start) + 2;
  const lines = SPRINGS.flatMap((s) => {
    const peak = Math.max(
      ...Array.from({ length: 400 }, (_, i) =>
        springPosition(s, (i / 399) * (s.durationMs / 1000)),
      ),
    );
    return [
      `  /* ${s.name} : raideur ${s.stiffness}, amortissement ${s.damping}, masse ${s.mass} ; dépassement ${Math.max(0, (peak - 1) * 100).toFixed(1)} % */`,
      `  --spring-${s.name}: ${springEasing(s)};`,
      `  --spring-${s.name}-dur: ${s.durationMs}ms;`,
    ];
  });
  const next = `${css.slice(0, headerEnd)}\n${lines.join('\n')}\n  ${css.slice(end)}`;
  // Mis en forme comme le reste du dépôt, pour que `pnpm format:check` et une régénération concordent.
  const options = (await resolveConfig(tokensPath)) ?? {};
  writeFileSync(tokensPath, await format(next, { ...options, filepath: tokensPath }));
  console.log(lines.filter((l) => l.includes('/*')).join('\n'));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
