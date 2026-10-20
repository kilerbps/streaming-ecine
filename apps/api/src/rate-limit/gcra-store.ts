import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service.js';
import { GCRA_LUA, gcraStep, type GcraParams } from './gcra.js';

export interface GcraRule {
  key: string;
  params: GcraParams;
}

export type GcraOutcome =
  | { allowed: true }
  | {
      allowed: false;
      retryAfterMs: number;
      /** Règle refusée (index dans la liste). */
      index: number;
    };

/**
 * Magasin des limites à seau : script Lua atomique dans Redis (préfixe `rl:`), sinon repli local
 * en mémoire par instance (mêmes règles, jamais « ouvert »). Une requête n'est comptée que si
 * toutes ses règles l'acceptent.
 */
@Injectable()
export class GcraStore {
  private readonly logger = new Logger(GcraStore.name);
  private readonly local = new Map<string, { tat: number; expiresAt: number }>();

  constructor(private readonly redis: RedisService) {}

  /** Vrai si Redis répond : les routes « fermées en cas de panne » en dépendent. */
  get shared(): boolean {
    return this.redis.ready;
  }

  async take(rules: GcraRule[], now = Date.now()): Promise<GcraOutcome> {
    if (rules.length === 0) return { allowed: true };
    if (this.redis.ready) {
      try {
        const result = (await this.redis.client.eval(
          GCRA_LUA,
          rules.length,
          ...rules.map((r) => `rl:${r.key}`),
          now,
          ...rules.flatMap((r) => [r.params.interval, r.params.tolerance]),
        )) as number[];
        if (Number(result[0]) === 1) return { allowed: true };
        return {
          allowed: false,
          retryAfterMs: Number(result[1]),
          index: Number(result[2]) - 1,
        };
      } catch (err) {
        this.logger.warn(`Limites en repli local : ${(err as Error).message}`);
      }
    }
    return this.takeLocal(rules, now);
  }

  private takeLocal(rules: GcraRule[], now: number): GcraOutcome {
    const next: number[] = [];
    for (const [index, rule] of rules.entries()) {
      const entry = this.local.get(rule.key);
      const tat = entry && entry.expiresAt > now ? entry.tat : null;
      const step = gcraStep(tat, now, rule.params);
      if (!step.allowed) return { allowed: false, retryAfterMs: step.retryAfterMs, index };
      next.push(step.tat);
    }
    for (const [index, rule] of rules.entries()) {
      this.local.set(rule.key, { tat: next[index]!, expiresAt: next[index]! });
    }
    if (this.local.size > 50_000) {
      for (const [key, entry] of this.local) if (entry.expiresAt <= now) this.local.delete(key);
    }
    return { allowed: true };
  }
}
