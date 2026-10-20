/**
 * Grands hébergeurs et centres de données (ADR-0015) : aucun spectateur légitime ne regarde depuis
 * un serveur, sauf par un VPN. Une IP de ces réseaux a un plafond strict et doit passer Turnstile.
 *
 * Numéros vérifiés le 20 octobre 2026 dans la base DB-IP « IP to ASN Lite » (organisation entre
 * parenthèses). Cloudflare (13335) est exclu : ses utilisateurs WARP sont des particuliers.
 */
export const HOSTING_ASNS: ReadonlyMap<number, string> = new Map([
  [16509, 'Amazon.com'],
  [14618, 'Amazon.com'],
  [8987, 'Amazon Data Services Ireland'],
  [15169, 'Google LLC'],
  [396982, 'Google LLC'],
  [19527, 'Google LLC'],
  [8075, 'Microsoft Corporation'],
  [16276, 'OVH SAS'],
  [24940, 'Hetzner Online'],
  [213230, 'Hetzner Online'],
  [14061, 'DigitalOcean'],
  [63949, 'Akamai Technologies (Linode)'],
  [20473, 'The Constant Company (Vultr)'],
  [51167, 'Contabo GmbH'],
  [40021, 'Contabo Inc.'],
  [31898, 'Oracle Corporation'],
  [45102, 'Alibaba (US) Technology'],
  [132203, 'Shenzhen Tencent Computer Systems'],
  [12876, 'Scaleway SAS'],
  [60781, 'LeaseWeb Netherlands'],
  [9009, 'M247 Europe'],
  [8560, 'IONOS SE'],
  [36352, 'HostPapa'],
  [54290, 'HostPapa'],
  [202425, 'IP Volume'],
  [212238, 'Datacamp Limited'],
  [200019, 'ALEXHOST'],
  [35916, 'Multacom Corporation'],
  [46606, 'Unified Layer'],
  [62240, 'Clouvider Limited'],
]);
