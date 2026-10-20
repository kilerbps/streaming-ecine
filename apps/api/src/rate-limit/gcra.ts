/**
 * Limite à seau (GCRA, « generic cell rate algorithm ») plutôt que des fenêtres fixes (ADR-0015) :
 * pas de réouverture simultanée de toutes les fenêtres, donc pas de pics. Une règle « `limit` par
 * `periodMs` » émet une requête tous les `periodMs / limit`, avec une rafale de `burst` requêtes
 * d'un coup (par défaut, la moitié du quota).
 *
 * L'état d'une clé est son « instant théorique d'arrivée » (TAT) en millisecondes.
 */
export interface Rule {
  key: string;
  limit: number;
  periodMs: number;
  /** Requêtes acceptées d'un coup ; par défaut, la moitié du quota (au moins 1). */
  burst?: number;
}

export interface GcraParams {
  interval: number;
  tolerance: number;
}

export function gcraParams(rule: Pick<Rule, 'limit' | 'periodMs' | 'burst'>): GcraParams {
  const interval = rule.periodMs / Math.max(1, rule.limit);
  const burst = Math.max(1, rule.burst ?? Math.ceil(rule.limit / 2));
  return { interval, tolerance: interval * (burst - 1) };
}

/** Décision pour une clé : acceptée (nouveau TAT) ou refusée (attente avant de réessayer). */
export function gcraStep(
  tat: number | null,
  now: number,
  params: GcraParams,
): { allowed: true; tat: number } | { allowed: false; retryAfterMs: number } {
  const current = Math.max(tat ?? now, now);
  if (current - now > params.tolerance) {
    return { allowed: false, retryAfterMs: Math.ceil(current - params.tolerance - now) };
  }
  return { allowed: true, tat: current + params.interval };
}

/**
 * Même calcul dans Redis, pour plusieurs clés à la fois et de façon atomique : la requête n'est
 * comptée que si toutes les règles l'acceptent (une règle refusée ne consomme rien ailleurs).
 * KEYS : les clés ; ARGV : maintenant, puis pour chaque clé : intervalle, tolérance.
 * Renvoie { 1 } si acceptée, sinon { 0, attente en ms, index (1…n) de la première règle refusée }.
 */
export const GCRA_LUA = `
local now = tonumber(ARGV[1])
local tats = {}
for i = 1, #KEYS do
  local interval = tonumber(ARGV[2 * i])
  local tolerance = tonumber(ARGV[2 * i + 1])
  local tat = tonumber(redis.call('GET', KEYS[i]) or now)
  if tat < now then tat = now end
  if tat - now > tolerance then
    return { 0, math.ceil(tat - tolerance - now), i }
  end
  tats[i] = tat + interval
end
for i = 1, #KEYS do
  redis.call('SET', KEYS[i], tats[i], 'PX', math.max(1, math.ceil(tats[i] - now)))
end
return { 1 }
`;
