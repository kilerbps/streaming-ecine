# ADR-0001 — Stack et versions

- Statut : **appliqué, à valider par le propriétaire**
- Date : 2026-10-02

## Contexte

Le dossier de conception (00-README §3) fixe la stack : Next.js 16.3, NestJS 12, Prisma 7, PostgreSQL, Redis, HLS. Les versions ont été revérifiées sur le registre npm le 2 octobre 2026 au moment de l'installation.

## Décision

| Couche | Version installée | Remarque |
|---|---|---|
| Node.js | 24 (LTS) | `.nvmrc`, `engines` |
| pnpm | 11.21 | `packageManager` ; Turborepo 2.11 |
| TypeScript | **6.0.3** | La 7.0 (`latest`) n'est pas encore acceptée par `@nestjs/swagger` (peer `^5.5 \|\| ^6.0`) ni `typescript-eslint` (`<6.1`) |
| Next.js | 16.3.8 + React 19.2.8 | Versions du gabarit officiel `create-next-app@16.3.8` |
| NestJS | 12.1.2 (ESM) | Gabarit officiel `@nestjs/cli@12.0.8` (Vitest, `nodenext`) |
| Prisma | **7.10.0** | Le tag `latest` pointe sur `8.0.0-rc.19` : **non adopté** (consigne 11-LIENS §1) |
| Zod | 4.6 | Messages par défaut en français (`z.locales.fr()`) |
| Redis (client) | ioredis **5.11** | La 6.0 (juillet 2026) est trop récente ; BullMQ 6 accepte ≥ 5 |
| Vitest | 4.1 | Version du gabarit NestJS 12 (Vitest 5 existe) |
| PostgreSQL | 18 (image `postgres:18-alpine`) | Extensions `pg_trgm`, `unaccent` |
| Redis (serveur) | 8 (image `redis:8-alpine`) | |

## Conséquences

- Montée vers TypeScript 7, Prisma 8 et ioredis 6 : à proposer quand l'écosystème suit (ADR dédiée).
- Dependabot ignore les majeures de Prisma (`.github/dependabot.yml`).
- Ports de développement **55432** (PostgreSQL) et **56379** (Redis) : un PostgreSQL est déjà installé sur le poste de développement sur le port 5432.
