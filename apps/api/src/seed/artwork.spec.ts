import sharp from 'sharp';
import {
  coverSvg,
  PALETTES,
  portraitSvg,
  posterSvg,
  renderSvg,
  squareSvg,
  wrap,
} from './artwork.js';
import { DEMO_FILMS, DEMO_PAGES, LEGAL_PLACEHOLDER, pageBody } from './demo-data.js';

describe('illustrations de démonstration', () => {
  it('coupe les titres sans casser les mots', () => {
    expect(wrap('La Rumba de Mama Kiese', 14)).toEqual(['La Rumba de', 'Mama Kiese']);
    expect(wrap('Court', 14)).toEqual(['Court']);
  });

  it('rend chaque format en PNG aux bonnes dimensions, en aplats uniquement', async () => {
    const cases = [
      {
        svg: posterSvg({
          title: 'Les Mains du tisserand',
          kicker: 'Documentaire',
          palette: PALETTES.ocre,
          motif: 'points',
        }),
        w: 1000,
        h: 1500,
      },
      { svg: portraitSvg({ initials: 'GM', palette: PALETTES.brique }), w: 800, h: 800 },
      {
        svg: coverSvg({
          title: 'Coulisses & lumière',
          label: 'Actualité',
          palette: PALETTES.nuit,
          motif: 'bobine',
        }),
        w: 1600,
        h: 900,
      },
      {
        svg: squareSvg({ caption: 'Atelier <son>', palette: PALETTES.ardoise, motif: 'arcs' }),
        w: 1200,
        h: 1200,
      },
    ];
    for (const c of cases) {
      expect(c.svg).not.toMatch(/<linear|<radial|<pattern|<filter/i);
      const meta = await sharp(await renderSvg(c.svg)).metadata();
      expect(meta.format).toBe('png');
      expect(meta.width).toBe(c.w);
      expect(meta.height).toBe(c.h);
    }
    // Quatre grands rendus SVG → PNG (polices comprises) : plus de 5 s sur une machine chargée (CI).
  }, 20_000);

  it('pages légales : structure seulement, avec le marqueur de validation juridique', () => {
    for (const page of DEMO_PAGES) expect(pageBody(page)).toMatch(/\[À COMPLÉTER/);
    expect(pageBody(DEMO_PAGES.find((p) => p.slug === 'confidentialite')!)).toContain(
      `## Vos droits\n\n${LEGAL_PLACEHOLDER}`,
    );
  });

  it('films de démonstration : slugs uniques, droits de démonstration', () => {
    expect(new Set(DEMO_FILMS.map((f) => f.slug)).size).toBe(DEMO_FILMS.length);
    expect(DEMO_FILMS.every((f) => f.daysAgo >= 0 && f.daysAgo <= 60)).toBe(true);
  });
});
