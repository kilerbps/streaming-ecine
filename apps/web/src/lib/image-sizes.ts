/**
 * Densité d'image plafonnée (réseaux mobiles lents, RDC). Le navigateur choisit dans `srcset` une
 * largeur égale à « taille affichée × densité de l'écran » : 3× sur beaucoup de téléphones, soit
 * 2,25 fois plus de pixels qu'en 2×, sans différence visible pour une photo. On ajoute devant la
 * taille par défaut (mobile) une variante réduite pour les écrans très denses ; les tailles
 * conditionnées (tablette, PC) ne changent pas.
 *
 * - Par défaut : écrans ≥ 2,5× servis comme en 2× environ (facteur 0,72).
 * - Économie de données ou mode allégé : environ 1×.
 */
const DENSE = '(min-resolution: 2.5dppx)';
const RETINA = '(min-resolution: 1.5dppx)';

/** Découpe une liste `sizes` sur les virgules de premier niveau (pas celles d'un `calc()`). */
function splitTopLevel(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of value) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

export function capImageDensity(sizes: string, { saveData = false } = {}): string {
  const parts = splitTopLevel(sizes);
  const fallback = parts.pop();
  // Forme inattendue (dernière entrée conditionnée) : on ne touche à rien.
  if (!fallback || fallback.startsWith('(')) return sizes;
  const scaled = (factor: number) => `calc(${fallback} * ${factor})`;
  const capped = saveData
    ? [`${DENSE} ${scaled(0.4)}`, `${RETINA} ${scaled(0.6)}`]
    : [`${DENSE} ${scaled(0.72)}`];
  return [...parts, ...capped, fallback].join(', ');
}
