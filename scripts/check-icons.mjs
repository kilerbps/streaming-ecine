#!/usr/bin/env node
// Échoue si une autre bibliothèque d'icônes est utilisée, si un <svg> est écrit en dur hors des fichiers
// autorisés (logo, illustrations, icônes générées), ou si les icônes générées ne sont pas à jour
// (charte « Nuit de Kin », Iconographie : un seul jeu, Solar, fabriqué sans appel réseau).
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const web = join(root, 'apps/web/src');
const FORBIDDEN_IMPORTS =
  /from ['"](?:lucide-react|react-icons[^'"]*|@heroicons\/[^'"]+|@phosphor-icons\/[^'"]+|@tabler\/icons[^'"]*|@iconify\/react|@fortawesome\/[^'"]+|react-feather)['"]/;
// Seuls fichiers autorisés à dessiner un <svg> : le composant Icon (enveloppe), les icônes générées,
// le logo et les illustrations construites avec le logo (D-13).
const SVG_ALLOWED = new Set([
  'apps/web/src/components/ui/icon.tsx',
  'apps/web/src/components/ui/icons/solar.generated.tsx',
  'apps/web/src/components/ui/logo.tsx',
  'apps/web/src/components/ui/illustration.tsx',
]);

const hits = [];
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    if (!/\.(tsx|ts)$/.test(entry)) continue;
    const rel = relative(root, full).split(sep).join('/');
    const source = readFileSync(full, 'utf8');
    if (FORBIDDEN_IMPORTS.test(source)) hits.push(`${rel} : bibliothèque d'icônes non autorisée`);
    if (
      /<svg[\s>]/.test(source) &&
      !SVG_ALLOWED.has(rel) &&
      !/opengraph-image|\/og\.tsx$/.test(rel)
    ) {
      hits.push(`${rel} : <svg> écrit en dur (utiliser <Icon> ou une illustration du logo)`);
    }
  }
}
walk(web);

try {
  execFileSync(process.execPath, [join(root, 'scripts/build-icons.ts'), '--check'], {
    stdio: 'pipe',
  });
} catch {
  hits.push(
    'apps/web/src/components/ui/icons/solar.generated.tsx : périmé (lancer pnpm icons:build)',
  );
}

if (hits.length > 0) {
  console.error('Icônes non conformes :');
  for (const hit of hits) console.error(`  ${hit}`);
  process.exit(1);
}
console.log('Icônes conformes : jeu Solar généré à jour, aucune autre source.');
