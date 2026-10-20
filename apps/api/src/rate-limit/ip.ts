import { isIP } from 'node:net';

/**
 * Adresses vues par les limites de débit (ADR-0015) :
 * - une IPv4 « mappée » (`::ffff:a.b.c.d`, fréquente sous Node) redevient l'IPv4, sinon la même
 *   adresse aurait deux compteurs ;
 * - une IPv6 est ramenée à son /64 : sur les réseaux mobiles, un terminal reçoit en général son
 *   propre /64, qui se traite donc comme un appareil. Le /48 sert d'agrégat contre un attaquant qui
 *   change d'adresse dans son bloc.
 */
export interface LimitedIp {
  /** IPv4 telle quelle, ou préfixe IPv6 /64 (`2001:db8:1:2::/64`). */
  key: string;
  family: 4 | 6;
  /** Préfixe IPv6 /48, absent en IPv4. */
  block48?: string;
  /** Adresse complète normalisée (recherche de l'ASN et du pays). */
  address: string;
}

const MAPPED = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;

/** Les 8 groupes d'une IPv6 valide (`::` développé, IPv4 finale convertie). */
function ipv6Groups(ip: string): number[] {
  let text = ip.toLowerCase().split('%')[0]!;
  const dotted = /(\d{1,3}(?:\.\d{1,3}){3})$/.exec(text);
  if (dotted) {
    const [a, b, c, d] = dotted[1]!.split('.').map(Number) as [number, number, number, number];
    text = `${text.slice(0, dotted.index)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const [head, tail] = text.split('::') as [string, string | undefined];
  const left = head ? head.split(':') : [];
  const right = tail !== undefined && tail !== '' ? tail.split(':') : [];
  const missing = 8 - left.length - right.length;
  const groups =
    tail === undefined ? left : [...left, ...Array<string>(missing).fill('0'), ...right];
  return groups.map((g) => parseInt(g || '0', 16));
}

function prefix(groups: number[], count: number, bits: number): string {
  return `${groups
    .slice(0, count)
    .map((g) => g.toString(16))
    .join(':')}::/${bits}`;
}

export function limitedIp(raw: string | undefined | null): LimitedIp | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const mapped = MAPPED.exec(trimmed);
  const ip = mapped ? mapped[1]! : trimmed;
  const family = isIP(ip);
  if (family === 4) return { key: ip, family: 4, address: ip };
  if (family !== 6) return null;
  const groups = ipv6Groups(ip);
  return {
    key: prefix(groups, 4, 64),
    family: 6,
    block48: prefix(groups, 3, 48),
    address: ip.toLowerCase(),
  };
}
