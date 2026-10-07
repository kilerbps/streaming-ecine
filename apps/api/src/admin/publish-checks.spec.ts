import { PROBLEM_TYPES, ProblemException } from '../common/problem.js';
import {
  articlePublishIssues,
  assertPublishable,
  filmPublishIssues,
  type FilmPublishFacts,
  hasAccessibleAlt,
  imageFacts,
  pagePublishIssues,
  personPublishIssues,
  postPublishIssues,
  publishAtOnPublish,
  toPublishCheck,
} from './publish-checks.js';

const readyFilm: FilmPublishFacts = {
  title: 'Mwana',
  synopsis: 'Un court-métrage tourné à Kinshasa.',
  poster: { alt: 'Affiche : une enfant devant le fleuve', decorative: false },
  rightsOk: true,
  readyVideos: 1,
  trailerUrl: null,
  seoTitle: null,
  seoTitleTaken: false,
};

const fields = (issues: Array<{ field: string }>) => issues.map((i) => i.field);

describe('filmPublishIssues', () => {
  it('accepte un film complet', () => {
    expect(filmPublishIssues(readyFilm)).toEqual([]);
  });

  it('exige le titre et le résumé français (espaces seuls refusés)', () => {
    expect(fields(filmPublishIssues({ ...readyFilm, title: '  ', synopsis: undefined }))).toEqual([
      'title',
      'synopsis',
    ]);
  });

  it('exige une affiche', () => {
    const issues = filmPublishIssues({ ...readyFilm, poster: null });
    expect(issues).toEqual([{ field: 'posterId', message: 'Ajoutez une affiche.' }]);
  });

  it('exige un texte alternatif non vide sur l’affiche', () => {
    expect(
      fields(filmPublishIssues({ ...readyFilm, poster: { alt: null, decorative: false } })),
    ).toEqual(['posterId']);
    expect(
      fields(filmPublishIssues({ ...readyFilm, poster: { alt: '   ', decorative: false } })),
    ).toEqual(['posterId']);
  });

  it('refuse une affiche marquée décorative, même avec un texte', () => {
    expect(
      fields(filmPublishIssues({ ...readyFilm, poster: { alt: 'Affiche', decorative: true } })),
    ).toEqual(['posterId']);
  });

  it('exige la confirmation des droits', () => {
    expect(fields(filmPublishIssues({ ...readyFilm, rightsOk: false }))).toEqual(['rightsOk']);
  });

  it('exige une vidéo prête…', () => {
    expect(fields(filmPublishIssues({ ...readyFilm, readyVideos: 0 }))).toEqual(['videos']);
  });

  it('…sauf bande-annonce seule', () => {
    expect(
      filmPublishIssues({
        ...readyFilm,
        readyVideos: 0,
        trailerUrl: 'https://www.youtube.com/watch?v=x',
      }),
    ).toEqual([]);
  });

  it('refuse un titre SEO déjà utilisé par un autre film', () => {
    expect(
      fields(filmPublishIssues({ ...readyFilm, seoTitle: 'Mwana', seoTitleTaken: true })),
    ).toEqual(['seoTitle']);
  });

  it('ignore le doublon SEO si aucun titre SEO n’est saisi', () => {
    expect(filmPublishIssues({ ...readyFilm, seoTitle: '', seoTitleTaken: true })).toEqual([]);
  });

  it('liste tout ce qui manque d’un coup, en français', () => {
    const issues = filmPublishIssues({
      title: null,
      synopsis: null,
      poster: null,
      rightsOk: false,
      readyVideos: 0,
      trailerUrl: null,
      seoTitle: null,
      seoTitleTaken: false,
    });
    expect(fields(issues)).toEqual(['title', 'synopsis', 'posterId', 'rightsOk', 'videos']);
    expect(toPublishCheck(issues)).toEqual({ ok: false, missing: issues.map((i) => i.message) });
  });
});

describe('hasAccessibleAlt', () => {
  it('accepte un texte alternatif ou une image décorative', () => {
    expect(hasAccessibleAlt({ alt: 'Portrait', decorative: false })).toBe(true);
    expect(hasAccessibleAlt({ alt: null, decorative: true })).toBe(true);
    expect(hasAccessibleAlt({ alt: ' ', decorative: false })).toBe(false);
  });
});

describe('imageFacts', () => {
  it('ne retient le texte alternatif que pour une image', () => {
    expect(imageFacts(null)).toBeNull();
    expect(imageFacts({ kind: 'IMAGE', alt: 'Portrait', decorative: false })).toEqual({
      alt: 'Portrait',
      decorative: false,
    });
    expect(imageFacts({ kind: 'VIDEO_SOURCE', alt: 'x', decorative: true })).toEqual({
      alt: null,
      decorative: false,
    });
  });
});

describe('personPublishIssues', () => {
  it('exige le nom français', () => {
    expect(fields(personPublishIssues({ name: '', photo: null }))).toEqual(['name']);
  });
  it('n’exige pas de photo, mais un texte alternatif si elle existe', () => {
    expect(personPublishIssues({ name: 'Ama', photo: null })).toEqual([]);
    expect(
      fields(personPublishIssues({ name: 'Ama', photo: { alt: null, decorative: false } })),
    ).toEqual(['photoId']);
    expect(personPublishIssues({ name: 'Ama', photo: { alt: null, decorative: true } })).toEqual(
      [],
    );
  });
});

describe('articlePublishIssues', () => {
  const article = { title: 'Festival', excerpt: 'Chapeau', body: 'Texte', cover: null };
  it('accepte une actualité complète sans couverture', () => {
    expect(articlePublishIssues(article)).toEqual([]);
  });
  it('exige titre, chapeau et texte', () => {
    expect(
      fields(articlePublishIssues({ ...article, title: '', excerpt: null, body: ' ' })),
    ).toEqual(['title', 'excerpt', 'body']);
  });
  it('exige un texte alternatif sur la couverture', () => {
    expect(
      fields(articlePublishIssues({ ...article, cover: { alt: '', decorative: false } })),
    ).toEqual(['coverId']);
  });
});

describe('postPublishIssues', () => {
  it('exige une légende et au moins une image', () => {
    expect(fields(postPublishIssues({ caption: '', images: [] }))).toEqual(['caption', 'imageIds']);
  });
  it('signale chaque image sans texte alternatif ou introuvable, avec sa position', () => {
    const issues = postPublishIssues({
      caption: 'Tournage',
      images: [
        { alt: 'Plateau', decorative: false },
        { alt: null, decorative: false },
        null,
        { alt: null, decorative: true },
      ],
    });
    expect(fields(issues)).toEqual(['imageIds.1', 'imageIds.2']);
  });
});

describe('pagePublishIssues', () => {
  it('exige titre et texte', () => {
    expect(pagePublishIssues({ title: 'CGU', body: 'Texte' })).toEqual([]);
    expect(fields(pagePublishIssues({ title: null, body: '' }))).toEqual(['title', 'body']);
  });
});

describe('assertPublishable', () => {
  it('laisse passer sans manque', () => {
    expect(() => assertPublishable([])).not.toThrow();
  });
  it('refuse en 422 publish-blocked avec la liste des manques', () => {
    try {
      assertPublishable([{ field: 'title', message: 'Ajoutez le titre en français.' }]);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ProblemException);
      const { problem } = err as ProblemException;
      expect(problem.status).toBe(422);
      expect(problem.type).toBe(PROBLEM_TYPES.publishBlocked);
      expect(problem.errors).toEqual([{ path: 'title', message: 'Ajoutez le titre en français.' }]);
    }
  });
});

describe('publishAtOnPublish', () => {
  const now = new Date('2026-10-02T10:00:00Z');
  it('utilise maintenant si aucune date', () => {
    expect(publishAtOnPublish(null, now)).toBe(now);
  });
  it('utilise maintenant si la date était dans le futur (publication anticipée)', () => {
    expect(publishAtOnPublish(new Date('2026-12-01T00:00:00Z'), now)).toBe(now);
  });
  it('garde une date passée (republication)', () => {
    const past = new Date('2026-01-01T00:00:00Z');
    expect(publishAtOnPublish(past, now)).toBe(past);
  });
});
