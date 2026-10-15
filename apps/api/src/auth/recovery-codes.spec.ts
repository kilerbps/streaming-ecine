import { describe, expect, it, vi } from 'vitest';
import { RECOVERY_CODE_RE, SECOND_FACTOR_RE } from '@ecine/contracts';
import type { AuditService } from '../audit/audit.service.js';
import type { Env } from '../config/env.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';
import {
  generateRecoveryCodes,
  isRecoveryCode,
  normalizeRecoveryCode,
  recoveryHash,
} from './recovery-codes.js';

describe('codes de secours', () => {
  it('produit 10 codes distincts au format abcd-efgh, acceptés à la connexion', () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) {
      expect(code).toMatch(RECOVERY_CODE_RE);
      expect(code).toMatch(SECOND_FACTOR_RE);
      expect(isRecoveryCode(code)).toBe(true);
    }
  });

  it('accepte le code sans tiret ni majuscules, jamais un code à 6 chiffres', () => {
    expect(normalizeRecoveryCode(' ABCD-efgh ')).toBe('abcdefgh');
    expect(isRecoveryCode('ABCDEFGH')).toBe(true);
    expect(isRecoveryCode('123456')).toBe(false);
  });

  it('donne une empreinte propre au compte et indépendante de la saisie', () => {
    const a = recoveryHash('secret', 'u1', 'abcd-efgh');
    expect(recoveryHash('secret', 'u1', 'ABCDEFGH')).toBe(a);
    expect(recoveryHash('secret', 'u2', 'abcd-efgh')).not.toBe(a);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('second facteur par code de secours', () => {
  // Seuls Prisma, l'audit et l'environnement servent sur ce chemin.
  const none = undefined as never;
  const make = (rows: number) => {
    const executeRaw = vi.fn<() => Promise<number>>().mockResolvedValue(rows);
    const log = vi.fn<() => Promise<void>>().mockResolvedValue();
    const service = new AuthService(
      { $executeRaw: executeRaw } as unknown as PrismaService,
      none,
      none,
      none,
      none,
      none,
      none,
      { log } as unknown as AuditService,
      { MEDIA_KEY_SECRET: 'secret' } as Env,
    );
    return { service, executeRaw, log };
  };
  const user = { id: 'u1', twoFactorSecretEnc: null };

  it('accepte un code encore valable, le retire et journalise son usage', async () => {
    const { service, executeRaw, log } = make(1);
    await expect(service.verifySecondFactor(user, 'ABCD-EFGH')).resolves.toBe(true);
    expect(executeRaw).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ action: 'auth.2fa_recovery_used' }),
    );
  });

  it('refuse un code déjà utilisé ou inconnu (aucune ligne retirée), sans journal', async () => {
    const { service, log } = make(0);
    await expect(service.verifySecondFactor(user, 'abcd-efgh')).resolves.toBe(false);
    expect(log).not.toHaveBeenCalled();
  });

  it('ne prend jamais un code à 6 chiffres pour un code de secours', async () => {
    const { service, executeRaw } = make(1);
    await expect(service.verifySecondFactor(user, '123456')).resolves.toBe(false);
    expect(executeRaw).not.toHaveBeenCalled();
  });
});
