import { decodeCursor } from '../common/cursor.js';
import { ProblemException } from '../common/problem.js';
import {
  auditDiff,
  ConfirmDeletionPipe,
  createdBefore,
  duplicates,
  excerpt,
  fillDaily,
  imageErrors,
  pageOf,
  publicPath,
  redirectInputProblem,
  scheduleDate,
  statsWindow,
  toCsv,
  updatedBefore,
} from './admin.helpers.js';
import { z } from 'zod';

describe('ConfirmDeletionPipe', () => {
  const pipe = new ConfirmDeletionPipe();
  it('accepte confirm=true', () => {
    expect(pipe.transform({ confirm: 'true' })).toEqual({ confirm: 'true' });
  });
  it.each([{}, { confirm: 'false' }, { confirm: '1' }, { confirm: 'true', extra: 'x' }])(
    'refuse %o en 400',
    (query) => {
      expect(() => pipe.transform(query)).toThrow(ProblemException);
      try {
        pipe.transform(query);
      } catch (err) {
        expect((err as ProblemException).problem.status).toBe(400);
      }
    },
  );
});

describe('pagination', () => {
  const rows = [
    { id: 'c', updatedAt: new Date('2026-10-02T10:00:00Z') },
    { id: 'b', updatedAt: new Date('2026-10-01T10:00:00Z') },
    { id: 'a', updatedAt: new Date('2026-09-30T10:00:00Z') },
  ];

  it('renvoie un curseur seulement s’il reste des lignes', () => {
    const page = pageOf(
      rows,
      2,
      (r) => r.updatedAt,
      (r) => r.id,
    );
    expect(page.items).toEqual(['c', 'b']);
    const cursor = decodeCursor(
      page.nextCursor ?? undefined,
      z.object({ t: z.string(), i: z.string() }),
    );
    expect(cursor).toEqual({ t: '2026-10-01T10:00:00.000Z', i: 'b' });
    expect(
      pageOf(
        rows,
        3,
        (r) => r.updatedAt,
        (r) => r.id,
      ).nextCursor,
    ).toBeNull();
  });

  it('construit les conditions « après le curseur »', () => {
    expect(updatedBefore(null)).toEqual({});
    expect(createdBefore(null)).toEqual({});
    const at = new Date('2026-10-01T10:00:00.000Z');
    expect(updatedBefore({ t: at.toISOString(), i: 'b' })).toEqual({
      OR: [{ updatedAt: { lt: at } }, { updatedAt: at, id: { lt: 'b' } }],
    });
    expect(createdBefore({ t: at.toISOString(), i: 'b' })).toEqual({
      OR: [{ createdAt: { lt: at } }, { createdAt: at, id: { lt: 'b' } }],
    });
  });
});

describe('auditDiff', () => {
  it('ne garde que les champs modifiés', () => {
    expect(
      auditDiff({ slug: 'a', title: 'T', year: 2020 }, { slug: 'b', title: 'T', year: 2020 }),
    ).toEqual({
      before: { slug: 'a' },
      after: { slug: 'b' },
    });
  });
  it('compare les listes par valeur et tronque les textes longs', () => {
    const long = 'x'.repeat(500);
    const diff = auditDiff(
      { categoryIds: ['a', 'b'], synopsis: 'court' },
      { categoryIds: ['a', 'b'], synopsis: long },
    );
    expect(Object.keys(diff.after)).toEqual(['synopsis']);
    expect((diff.after.synopsis as string).length).toBe(201);
  });
  it('traite un champ absent comme null', () => {
    expect(auditDiff({}, { phone: null })).toEqual({ before: {}, after: {} });
    expect(auditDiff({}, { phone: '+243' })).toEqual({
      before: { phone: null },
      after: { phone: '+243' },
    });
  });
});

describe('redirections', () => {
  it('construit les URLs publiques', () => {
    expect(publicPath.film('mwana')).toBe('/fr/films/mwana');
    expect(publicPath.person('ama-k')).toBe('/fr/personnes/ama-k');
    expect(publicPath.article('festival')).toBe('/fr/actualites/festival');
  });
  it('refuse une redirection vers elle-même', () => {
    expect(redirectInputProblem('/fr/a', '/fr/a')).not.toBeNull();
    expect(redirectInputProblem('/fr/a', '/fr/b')).toBeNull();
  });
});

describe('imageErrors', () => {
  const found = [
    { id: 'ok', kind: 'IMAGE', alt: 'Plateau de tournage', decorative: false },
    { id: 'deco', kind: 'IMAGE', alt: null, decorative: true },
    { id: 'noalt', kind: 'IMAGE', alt: ' ', decorative: false },
    { id: 'video', kind: 'VIDEO_SOURCE', alt: null, decorative: false },
  ];
  it('signale chaque problème avec son chemin', () => {
    const refs = ['ok', 'deco', 'noalt', 'video', 'missing'].map((id, i) => ({
      id,
      path: `imageIds.${i}`,
    }));
    expect(imageErrors(refs, found, true).map((e) => e.path)).toEqual([
      'imageIds.2',
      'imageIds.3',
      'imageIds.4',
    ]);
  });
  it('n’exige le texte alternatif que si demandé', () => {
    expect(imageErrors([{ id: 'noalt', path: 'posterId' }], found, false)).toEqual([]);
  });
});

describe('statistiques', () => {
  it('couvre exactement N jours civils UTC, aujourd’hui inclus', () => {
    const { since, dayKeys } = statsWindow(7, new Date('2026-10-02T23:30:00Z'));
    expect(since.toISOString()).toBe('2026-09-26T00:00:00.000Z');
    expect(dayKeys).toEqual([
      '2026-09-26',
      '2026-09-27',
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ]);
    expect(statsWindow(90).dayKeys).toHaveLength(90);
  });
  it('complète les jours vides par des zéros', () => {
    const rows = [{ date: '2026-10-01', visits: 4, playStarts: 2, playCompletes: 1 }];
    expect(fillDaily(['2026-09-30', '2026-10-01'], rows)).toEqual([
      { date: '2026-09-30', visits: 0, playStarts: 0, playCompletes: 0 },
      { date: '2026-10-01', visits: 4, playStarts: 2, playCompletes: 1 },
    ]);
  });
});

describe('divers', () => {
  it('détecte les doublons', () => {
    expect(duplicates(['a', 'b', 'a', 'c', 'b'])).toEqual(['a', 'b']);
    expect(duplicates(['a'])).toEqual([]);
  });
  it('tronque une légende sur sa première ligne', () => {
    expect(excerpt('Première ligne\nSuite')).toBe('Première ligne');
    expect(excerpt('x'.repeat(100), 10)).toBe(`${'x'.repeat(9)}…`);
  });
  it('refuse une planification dans le passé', () => {
    const now = new Date('2026-10-02T10:00:00Z');
    expect(scheduleDate('2026-10-03T10:00:00Z', now).toISOString()).toBe(
      '2026-10-03T10:00:00.000Z',
    );
    expect(() => scheduleDate('2026-10-01T10:00:00Z', now)).toThrow(ProblemException);
    expect(() => scheduleDate(now.toISOString(), now)).toThrow(ProblemException);
  });
  it('produit un CSV sûr', () => {
    expect(toCsv(['date', 'visites'], [['2026-10-01', 3]])).toBe(
      'date,visites\r\n2026-10-01,3\r\n',
    );
    expect(toCsv(['a'], [['=SUM(A1)'], ['x,"y"']])).toBe('a\r\n\'=SUM(A1)\r\n"x,""y"""\r\n');
  });
});
