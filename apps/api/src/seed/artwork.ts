import sharp from 'sharp';

/**
 * Illustrations de démonstration : aplats de couleur et formes géométriques simples (aucun dégradé,
 * conformément au design system), titre en texte. Rendues en PNG puis traitées comme un envoi réel.
 */

export interface Palette {
  /** Nom français de la couleur de fond (texte alternatif). */
  name: string;
  bg: string;
  ink: string;
  accent: string;
  inkName: string;
}

export const PALETTES = {
  nuit: {
    name: 'noir profond',
    bg: '#121110',
    ink: '#F2EDE6',
    accent: '#E4572E',
    inkName: 'ivoire',
  },
  brique: {
    name: 'orange brique',
    bg: '#E4572E',
    ink: '#121110',
    accent: '#F6F1EA',
    inkName: 'noires',
  },
  ocre: { name: 'ocre', bg: '#D9A21B', ink: '#121110', accent: '#B8431F', inkName: 'noires' },
  foret: {
    name: 'vert forêt',
    bg: '#1E6B45',
    ink: '#F6F1EA',
    accent: '#D9A21B',
    inkName: 'ivoire',
  },
  ivoire: { name: 'ivoire', bg: '#F6F1EA', ink: '#1A1714', accent: '#B8431F', inkName: 'noires' },
  ardoise: {
    name: 'anthracite',
    bg: '#25221F',
    ink: '#F2EDE6',
    accent: '#4CAF7A',
    inkName: 'ivoire',
  },
  fleuve: {
    name: 'bleu nuit',
    bg: '#2F4858',
    ink: '#F6F1EA',
    accent: '#E4572E',
    inkName: 'ivoire',
  },
} satisfies Record<string, Palette>;

export type Motif = 'soleil' | 'fleuve' | 'toits' | 'points' | 'arcs' | 'bobine';

/** Description française du motif (texte alternatif). */
export const MOTIF_LABELS: Record<Motif, string> = {
  soleil: 'un grand disque solaire entouré d’anneaux',
  fleuve: 'des bandes horizontales évoquant un fleuve',
  toits: 'une rangée de toits triangulaires',
  points: 'une grille régulière de points',
  arcs: 'des demi-cercles superposés',
  bobine: 'une bobine de film stylisée',
};

const FONT = "'DejaVu Sans', 'Segoe UI', Arial, Helvetica, sans-serif";

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Découpe un titre en lignes d'au plus `max` caractères (sans couper les mots). */
export function wrap(text: string, max: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/)) {
    if (current && `${current} ${word}`.length > max) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function motifShapes(motif: Motif, w: number, h: number, p: Palette): string {
  const cx = w / 2;
  switch (motif) {
    case 'soleil': {
      const r = w * 0.22;
      const cy = h * 0.36;
      return [
        `<circle cx="${cx}" cy="${cy}" r="${r * 1.9}" fill="none" stroke="${p.accent}" stroke-width="${w * 0.012}" opacity="0.5"/>`,
        `<circle cx="${cx}" cy="${cy}" r="${r * 1.45}" fill="none" stroke="${p.ink}" stroke-width="${w * 0.008}" opacity="0.4"/>`,
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${p.accent}"/>`,
      ].join('');
    }
    case 'fleuve':
      return [0, 1, 2, 3, 4]
        .map((i) => {
          const y = h * (0.18 + i * 0.075);
          const inset = (i % 2) * w * 0.12;
          return `<rect x="${inset}" y="${y}" width="${w - inset * 2}" height="${h * 0.03}" fill="${i % 2 ? p.ink : p.accent}" opacity="${i % 2 ? 0.35 : 0.9}"/>`;
        })
        .join('');
    case 'toits': {
      const n = 5;
      const size = w / n;
      const base = h * 0.52;
      return Array.from({ length: n }, (_, i) => {
        const x = i * size;
        const peak = base - size * (0.6 + (i % 2) * 0.35);
        return `<polygon points="${x},${base} ${x + size / 2},${peak} ${x + size},${base}" fill="${i % 2 ? p.accent : p.ink}" opacity="${i % 2 ? 1 : 0.3}"/>`;
      }).join('');
    }
    case 'points': {
      const cols = 6;
      const gap = w / (cols + 1);
      const dots: string[] = [];
      for (let row = 0; row < 5; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const filled = (row + col) % 3 === 0;
          dots.push(
            `<circle cx="${gap * (col + 1)}" cy="${h * 0.1 + gap * row}" r="${gap * 0.18}" fill="${filled ? p.accent : p.ink}" opacity="${filled ? 1 : 0.3}"/>`,
          );
        }
      }
      return dots.join('');
    }
    case 'arcs':
      return [0.42, 0.32, 0.22]
        .map((r, i) => {
          const radius = w * r;
          const y = h * 0.55;
          return `<path d="M ${cx - radius} ${y} A ${radius} ${radius} 0 0 1 ${cx + radius} ${y} Z" fill="${i === 1 ? p.ink : p.accent}" opacity="${i === 1 ? 0.35 : 1}"/>`;
        })
        .join('');
    case 'bobine': {
      const r = w * 0.26;
      const cy = h * 0.36;
      const holes = Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        return `<circle cx="${cx + Math.cos(a) * r * 0.55}" cy="${cy + Math.sin(a) * r * 0.55}" r="${r * 0.2}" fill="${p.bg}"/>`;
      }).join('');
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${p.accent}"/>${holes}<circle cx="${cx}" cy="${cy}" r="${r * 0.12}" fill="${p.ink}"/>`;
    }
  }
}

function textBlock(
  lines: string[],
  x: number,
  y: number,
  size: number,
  fill: string,
  weight = 700,
  anchor = 'start',
): string {
  return lines
    .map(
      (line, i) =>
        `<text x="${x}" y="${y + i * size * 1.15}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(line)}</text>`,
    )
    .join('');
}

/** Affiche de film 2:3 (1000×1500) : motif en haut, titre en bas, mention de catégorie. */
export function posterSvg(o: {
  title: string;
  kicker: string;
  palette: Palette;
  motif: Motif;
}): string {
  const w = 1000;
  const h = 1500;
  const lines = wrap(o.title, 14);
  const size = 104;
  const top = h - 160 - (lines.length - 1) * size * 1.15;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<rect width="${w}" height="${h}" fill="${o.palette.bg}"/>
${motifShapes(o.motif, w, h, o.palette)}
<rect x="80" y="${top - 210}" width="120" height="14" fill="${o.palette.accent}"/>
${textBlock([o.kicker.toUpperCase()], 80, top - 130, 40, o.palette.ink, 600)}
${textBlock(lines, 80, top, size, o.palette.ink)}
</svg>`;
}

/** Portrait illustré carré (800×800) : disque et initiales. */
export function portraitSvg(o: { initials: string; palette: Palette }): string {
  const s = 800;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
<rect width="${s}" height="${s}" fill="${o.palette.bg}"/>
<circle cx="${s / 2}" cy="${s / 2}" r="${s * 0.34}" fill="${o.palette.accent}"/>
<rect x="${s * 0.2}" y="${s * 0.84}" width="${s * 0.6}" height="12" fill="${o.palette.ink}" opacity="0.4"/>
${textBlock([o.initials], s / 2, s / 2 + 70, 200, o.palette.bg, 700, 'middle')}
</svg>`;
}

/** Couverture d'actualité 16:9 (1600×900) : motif à droite, titre à gauche. */
export function coverSvg(o: {
  title: string;
  label: string;
  palette: Palette;
  motif: Motif;
}): string {
  const w = 1600;
  const h = 900;
  const lines = wrap(o.title, 18);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<rect width="${w}" height="${h}" fill="${o.palette.bg}"/>
<g transform="translate(${w * 0.5} ${h * 0.05})">${motifShapes(o.motif, w * 0.5, h * 1.4, o.palette)}</g>
${textBlock([o.label.toUpperCase()], 90, 170, 36, o.palette.accent, 600)}
${textBlock(lines, 90, 280, 86, o.palette.ink)}
</svg>`;
}

/** Image carrée de publication (1200×1200) : motif plein cadre et courte légende. */
export function squareSvg(o: { caption: string; palette: Palette; motif: Motif }): string {
  const s = 1200;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
<rect width="${s}" height="${s}" fill="${o.palette.bg}"/>
${motifShapes(o.motif, s, s * 1.3, o.palette)}
${textBlock(wrap(o.caption, 22), 80, s - 190, 64, o.palette.ink)}
</svg>`;
}

/** SVG maison → PNG (le SVG n'est jamais accepté tel quel par processImage). */
export function renderSvg(svg: string): Promise<Buffer> {
  return sharp(Buffer.from(svg, 'utf8')).png().toBuffer();
}
