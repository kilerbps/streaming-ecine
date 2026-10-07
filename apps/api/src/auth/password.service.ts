import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';
import { ProblemException } from '../common/problem.js';

/** Paramètres Argon2id recommandés par l'OWASP (m = 19 Mio, t = 2, p = 1). */
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

/** Mots de passe longs mais trop courants (la longueur minimale de 12 écarte déjà la plupart des listes). */
const COMMON_PASSWORDS = new Set([
  '123456789012',
  '1234567890123',
  'azertyuiopqs',
  'qwertyuiopas',
  'motdepasse123',
  'motdepasse1234',
  'password1234',
  'passwordpassword',
  'iloveyou1234',
  'aaaaaaaaaaaa',
  'ecineecineecine',
  'kinshasa2026',
  'congokinshasa',
]);

@Injectable()
export class PasswordService {
  /** Empreinte factice : égalise le temps de réponse quand l'e-mail n'existe pas. */
  private dummyHash: Promise<string> | null = null;

  hash(password: string): Promise<string> {
    return argon2.hash(password, ARGON2_OPTIONS);
  }

  async verify(hash: string | null | undefined, password: string): Promise<boolean> {
    if (!hash) {
      this.dummyHash ??= argon2.hash('mot-de-passe-factice-ecine', ARGON2_OPTIONS);
      await argon2.verify(await this.dummyHash, password).catch(() => false);
      return false;
    }
    return argon2.verify(hash, password).catch(() => false);
  }

  /** Refuse les mots de passe courants ou construits sur l'e-mail. */
  assertAcceptable(password: string, email: string): void {
    const lower = password.toLowerCase();
    const local = email.split('@')[0]?.toLowerCase() ?? '';
    const repeated = /^(.)\1+$/.test(password);
    if (COMMON_PASSWORDS.has(lower) || repeated || (local.length >= 4 && lower.includes(local))) {
      throw ProblemException.badRequest('Ce mot de passe est trop facile à deviner.', [
        {
          path: 'password',
          message: 'Choisissez une phrase plus personnelle, sans votre adresse e-mail.',
        },
      ]);
    }
  }
}
