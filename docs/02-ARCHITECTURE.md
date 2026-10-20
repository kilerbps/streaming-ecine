# 02 — Architecture technique

## 1. Vue d'ensemble

```
Navigateur / PWA (Kinshasa, mobile)
   │
   ├─ HTML/RSC ───────────► Vercel (Next.js 16.3, app.e-cine.*)
   │                           │  Server Components + Server Actions
   │                           │  (cookies HttpOnly transmis au backend)
   │                           ▼
   │                        API NestJS 12 (api.e-cine.*) ──► PostgreSQL (source de vérité)
   │                           │                         └─► Redis (cache, rate limit, files)
   │                           ▼
   │                        Worker BullMQ ── FFmpeg ──► HLS (segments chiffrés)
   │
   └─ Segments HLS + clés ──► Media (VPS ou CDN/stockage objet) via URLs signées
```

Tout est derrière **HTTPS** (HSTS). Le backend est **hors du frontend** : une API indépendante, consommable plus tard par une application native.

## 2. Domaines et cookies

- `e-cine.*` / `www` → Vercel (frontend public)
- `api.e-cine.*` → VPS (API)
- `media.e-cine.*` → VPS ou CDN (segments HLS)
- `admin.e-cine.*` (recommandé) → même projet Next.js, hôte distinct, règles de sécurité renforcées (ou `/admin` en V1 si simplicité requise)

Cookies de session sur `Domain=.e-cine.*`, `Secure`, `HttpOnly`, `SameSite=Lax`. Front et API sont ainsi **même site** : pas de CORS permissif, pas de jeton dans `localStorage`.

> **Latence** : un utilisateur à Kinshasa parle à Vercel (statique/edge), puis Vercel parle au VPS. Place la région des fonctions Vercel **proche du VPS** (ex. VPS en Europe de l'Ouest + région fonctions Paris/Francfort). Pour la vidéo, un CDN avec présence africaine est recommandé (Q3 du README).

## 3. Monorepo

```
e-cine/
├─ apps/
│  ├─ web/            # Next.js (Vercel)
│  └─ api/            # NestJS (VPS)
├─ packages/
│  ├─ contracts/      # Schémas Zod + types partagés (entrées/sorties de l'API)
│  ├─ design-tokens/  # Tokens CSS (dark/clair)
│  └─ config/         # tsconfig, eslint, prettier partagés
├─ infra/             # docker-compose, Caddy, scripts de sauvegarde
├─ docs/              # ce dossier
└─ AGENTS.md
```

Gestionnaire : **pnpm** + Turborepo. Node.js : version LTS active (vérifier avant d'initialiser). TypeScript `strict`.

## 4. Règles de flux de données (obligatoires)

| Règle | Détail |
|---|---|
| R1 — Le front ne fetch pas | Les composants clients n'appellent pas l'API. Les Server Components lisent via `src/server/api-client.ts` (`import 'server-only'`) et passent les données en **props** |
| R2 — Mutations | Server Actions (validées avec Zod) → API NestJS. Mise à jour optimiste côté client, vérité confirmée par le serveur |
| R3 — Feed infini | Une Server Action retourne la page suivante (curseur opaque). Pas de `fetch` client |
| R4 — Une donnée = une source | PostgreSQL. Redis = copie jetable avec TTL. Aucune donnée métier stockée uniquement dans Redis ou le navigateur |
| R5 — Contrats uniques | Les schémas de `packages/contracts` définissent entrées/sorties ; ni le front ni l'API ne redéfinissent un type à la main |
| R6 — Pas d'état dupliqué | Pas de store global qui copie les données serveur. État client = interface uniquement (menu ouvert, volume, onglet) |
| R7 — Rien de secret côté client | Aucune clé, aucune URL interne, pas de `NEXT_PUBLIC_` pour un secret |

**Exception** : le lecteur vidéo charge manifest, clés et segments directement depuis `media.*` avec un jeton.

## 5. Frontend (Next.js 16.3)

- App Router, React 19, TypeScript. **Cache Components / Instant Navigations** activés pour une navigation immédiate (voir article officiel dans `11`).
- Rendu : pages publiques (films, personnes, actualités) **rendues côté serveur et mises en cache** avec revalidation par étiquettes déclenchée quand l'admin publie. Pages personnalisées (ma liste, reprise) dynamiques.
- Interception des requêtes : **`proxy.ts`** (nouveau nom du `middleware.ts` depuis Next.js 16 — vérifier la doc de la version installée) pour : redirection HTTPS/domaine canonique, détection de la langue, protection des routes admin (vérification légère du cookie), en-têtes de sécurité/CSP avec nonce. Les vraies décisions d'autorisation restent **dans l'API**.
- i18n : `next-intl`, `/fr` par défaut, `hreflang`.
- Styles : Tailwind CSS v4 + variables CSS (tokens) ; primitives accessibles (Radix UI). Pas de bibliothèque d'icônes en emoji.
- PWA : manifeste, service worker (Serwist), page hors-ligne, cache des assets et de l'interface, **jamais** des segments vidéo protégés ni des réponses privées.
- Médias : `next/image` (AVIF/WebP, `sizes` corrects, `priority` uniquement sur l'image LCP).
- Formulaires : React Hook Form + Zod + Server Actions ; honeypot + Turnstile.

## 6. Backend (NestJS 12, ESM)

Modules : `auth`, `users`, `films`, `people`, `articles`, `posts` (feed), `media` (upload + HLS), `playback` (jetons), `search`, `interactions` (likes, favoris, progression), `contact`, `consent`, `analytics`, `ads` (V2), `admin`, `health`.

- Validation : schémas Zod/Standard Schema via pipes ; `whitelist` et rejet des champs inconnus.
- Sécurité : Helmet, `@nestjs/throttler` (stockage Redis), guards (authentification, rôles), interceptors (journal d'audit), filtre d'exceptions au format **RFC 9457** (`application/problem+json`).
- Documentation : OpenAPI (`@nestjs/swagger`), désactivée en production publique ou protégée.
- Tâches asynchrones : **BullMQ** (Redis) — transcodage, e-mails, génération d'images, recalcul de caches.
- Logs : `pino`, identifiant de corrélation, **aucune donnée personnelle dans les logs**.

## 7. Données

- **PostgreSQL** : migrations Prisma versionnées, index explicites, extensions `pg_trgm` et `unaccent`.
- **Prisma 7** : `prisma.config.ts` porte l'URL de connexion ; adapter `@prisma/adapter-pg` ; variables d'environnement chargées explicitement ; générateur `prisma-client` avec `output` dans le code source.
- **Redis** (un seul usage par préfixe de clé) :

| Préfixe | Usage | TTL | Perte tolérée ? |
|---|---|---|---|
| `cache:` | Réponses dérivées (listes, compteurs) | 30 s – 10 min | Oui |
| `rl:` | Limites de débit à seau (GCRA), appareils vérifiés par IP (HyperLogLog), sessions présentes (ADR-0015) | jusqu'à 2 h | Oui (repli local en mémoire) |
| `sess:` | Liste de révocation / sessions actives | durée du token | Reconstructible |
| `bull:` | Files de jobs | — | Non critique : les jobs sont repris depuis la base |
| `play:` | Compteurs de jetons de lecture | 5 min | Oui |

Invalidation : à chaque écriture admin, l'API supprime les clés concernées et appelle la revalidation par étiquette côté Next.js (webhook signé).

## 8. Pipeline vidéo (HLS sécurisé)

1. **Upload** admin vers l'API (envoi par morceaux reprenable, type MIME + signature vérifiés, taille max).
2. Le fichier source est stocké **hors de tout dossier public** (jamais servi).
3. **Worker FFmpeg** : échelle de qualités (144p, 240p, 360p, 480p, 720p, 1080p selon la source), segments de 4 s (ADR-0006), **chiffrement AES-128**, miniature et affiche générées.
4. Sortie : `media/{filmId}/{renditionId}/…` + `master.m3u8`.
5. **Lecture** : `POST /v1/playback/{videoId}/session` → l'API vérifie l'accès, génère un **jeton signé** (≤ 5 min, lié à la session) et une URL de manifest. Le lecteur (hls.js) renouvelle le jeton. L'endpoint de **clé** exige le jeton et applique un rate limit.
6. **Service des segments** : Caddy/Nginx avec validation du jeton (ou CDN avec auth par jeton). Pas de listage de répertoire ; en-têtes `Cache-Control` adaptés ; HTTPS uniquement.
7. Qualité de départ **basse** (adaptée au débit local) puis montée automatique.

Détails sécurité : `06-SECURITY.md` §6.

## 9. Déploiement

**Frontend (Vercel)** : un projet, répertoire racine `apps/web`, variables d'environnement par environnement (Preview/Production), domaine canonique, redirection HTTP→HTTPS automatique.

**VPS** (Docker Compose, derrière **Caddy** qui gère le HTTPS automatique) :

```
caddy   → 80/443 publics (HSTS, redirections, limites)
api     → réseau interne uniquement
worker  → réseau interne, FFmpeg
postgres→ réseau interne, JAMAIS exposé
redis   → réseau interne, mot de passe, JAMAIS exposé
```

- Pare-feu (ufw) : 22 (clé SSH seulement), 80, 443.
- Mises à jour de sécurité automatiques, fail2ban, utilisateur non root, conteneurs en lecture seule quand possible.
- **Sauvegardes** : `pg_dump` quotidien chiffré + copie hors VPS (stockage objet), rétention 30 jours, **test de restauration mensuel**. Médias : copie des HLS finaux et des sources.
- **CI/CD** (GitHub Actions) : lint → types → tests → build → analyse de dépendances → ZAP baseline sur staging → déploiement. Déploiement VPS par SSH avec clé dédiée limitée.
- Environnements : `dev` (local), `staging` (Vercel Preview + VPS staging), `production`.

## 10. Observabilité

Sentry (front + API), logs pino centralisés, `/health` (base + Redis), supervision externe (Uptime Kuma ou équivalent), alertes (disque, CPU, certificat, échec de sauvegarde, file de transcodage bloquée).

## 11. Décisions d'architecture (ADR) à tenir à jour

Chaque décision structurante est écrite dans `docs/adr/NNNN-titre.md` : contexte → décision → conséquences. L'IA **propose** un ADR et attend ta validation (voir `09-AGENTS.md`).
