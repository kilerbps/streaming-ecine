import { describe, expect, it } from 'vitest';
import {
  contactInputSchema,
  filmInputSchema,
  hasRole,
  loginInputSchema,
  registerInputSchema,
  slugSchema,
} from './index.js';

describe('registerInputSchema', () => {
  const valid = {
    email: '  Spectateur@Exemple.cd ',
    password: 'une-phrase-de-passe-longue',
    displayName: 'Ama',
    acceptTerms: true,
  };

  it('normalise l’e-mail', () => {
    expect(registerInputSchema.parse(valid).email).toBe('spectateur@exemple.cd');
  });

  it('refuse un mot de passe de moins de 12 caractères', () => {
    expect(registerInputSchema.safeParse({ ...valid, password: 'court' }).success).toBe(false);
  });

  it('refuse les champs inconnus', () => {
    expect(registerInputSchema.safeParse({ ...valid, role: 'ADMIN' }).success).toBe(false);
  });

  it('exige l’acceptation des conditions', () => {
    expect(registerInputSchema.safeParse({ ...valid, acceptTerms: false }).success).toBe(false);
  });
});

describe('loginInputSchema', () => {
  it('accepte un code TOTP à 6 chiffres et refuse le reste', () => {
    const base = { email: 'a@b.cd', password: 'x' };
    expect(loginInputSchema.safeParse({ ...base, totp: '123456' }).success).toBe(true);
    expect(loginInputSchema.safeParse({ ...base, totp: '12a456' }).success).toBe(false);
  });
});

describe('slugSchema', () => {
  it.each(['mon-film', 'film-2026', 'a'])('accepte %s', (slug) => {
    expect(slugSchema.safeParse(slug).success).toBe(true);
  });
  it.each(['Mon-Film', 'film_2026', 'été', '-film', 'film--x', ''])('refuse %s', (slug) => {
    expect(slugSchema.safeParse(slug).success).toBe(false);
  });
});

describe('contactInputSchema', () => {
  const valid = {
    name: 'Kabongo',
    email: 'k@example.cd',
    subject: 'Projection',
    message: 'Bonjour, je souhaite organiser une projection à Kinshasa.',
    renderedAt: Date.now(),
  };
  it('accepte un message valide', () => {
    expect(contactInputSchema.safeParse(valid).success).toBe(true);
  });
  it('refuse un pot de miel rempli', () => {
    expect(contactInputSchema.safeParse({ ...valid, website: 'http://spam' }).success).toBe(false);
  });
  it('refuse un message trop court', () => {
    expect(contactInputSchema.safeParse({ ...valid, message: 'Bonjour' }).success).toBe(false);
  });
});

describe('filmInputSchema', () => {
  it('exige une note de droits', () => {
    const result = filmInputSchema.safeParse({
      slug: 'film',
      kind: 'SHORT',
      title: 'Titre',
      synopsis: 'Résumé',
      rightsNote: '',
      rightsOk: false,
    });
    expect(result.success).toBe(false);
  });
});

describe('hasRole', () => {
  it('respecte la hiérarchie des rôles', () => {
    expect(hasRole('ADMIN', 'EDITOR')).toBe(true);
    expect(hasRole('EDITOR', 'ADMIN')).toBe(false);
    expect(hasRole('MODERATOR', 'EDITOR')).toBe(false);
    expect(hasRole('MEMBER', 'MEMBER')).toBe(true);
  });
});
