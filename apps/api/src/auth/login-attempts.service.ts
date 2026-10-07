import { Inject, Injectable } from '@nestjs/common';
import { ENV, type Env } from '../config/env.js';
import { hmacHex } from '../common/crypto.js';
import { ProblemException } from '../common/problem.js';
import { RedisService } from '../redis/redis.service.js';

const FREE_ATTEMPTS = 5;
const MAX_LOCK_SEC = 30 * 60;

/**
 * Verrouillage progressif par compte (clé = empreinte de l'e-mail). Il s'applique aussi aux e-mails
 * inconnus : la réponse ne révèle donc jamais si un compte existe.
 */
@Injectable()
export class LoginAttemptsService {
  private readonly local = new Map<string, { count: number; until: number }>();

  constructor(
    private readonly redis: RedisService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async assertAllowed(email: string): Promise<void> {
    const key = this.key(email);
    const count = await this.read(key);
    if (count >= FREE_ATTEMPTS) {
      throw ProblemException.tooManyRequests(
        'Trop de tentatives. Patientez quelques minutes avant de réessayer.',
      );
    }
  }

  async recordFailure(email: string): Promise<void> {
    const key = this.key(email);
    const count = (await this.read(key)) + 1;
    // 15 min de mémoire, puis blocage doublé à chaque échec au-delà du seuil (1, 2, 4… min, max 30).
    const ttl =
      count >= FREE_ATTEMPTS ? Math.min(60 * 2 ** (count - FREE_ATTEMPTS), MAX_LOCK_SEC) : 15 * 60;
    if (this.redis.ready) {
      try {
        await this.redis.client.set(key, String(count), 'EX', ttl);
        return;
      } catch {
        // repli local
      }
    }
    this.local.set(key, { count, until: Date.now() + ttl * 1000 });
  }

  async reset(email: string): Promise<void> {
    const key = this.key(email);
    this.local.delete(key);
    await this.redis.client.del(key).catch(() => undefined);
  }

  private key(email: string): string {
    return `rl:login-fail:${hmacHex(this.env.IP_HASH_SALT, email).slice(0, 32)}`;
  }

  private async read(key: string): Promise<number> {
    if (this.redis.ready) {
      try {
        return Number((await this.redis.client.get(key)) ?? 0);
      } catch {
        // repli local
      }
    }
    const entry = this.local.get(key);
    if (!entry || entry.until < Date.now()) return 0;
    return entry.count;
  }
}
