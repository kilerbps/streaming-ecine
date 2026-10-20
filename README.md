# E-Ciné

Plateforme congolaise de streaming et de culture cinéma, privée et indépendante, gratuite et ouverte à tous : films, courts-métrages, fiches des talents, actualités, dans un feed de découverte qui surprend sans piéger. Slogan : « Le cinéma congolais, en streaming. »

> Dossier de conception complet : [`docs/`](docs/00-README.md) — règles pour l'IA : [`AGENTS.md`](AGENTS.md) — décisions : [`docs/adr/`](docs/adr/).

## Architecture

```
Navigateur / PWA ──► Next.js 16.3 (Vercel, apps/web) ──► API NestJS 12 (VPS, apps/api) ──► PostgreSQL 18
                                                                 │                    └──► Redis 8 (cache, limites, files)
                                                                 └──► Worker FFmpeg (HLS chiffré AES-128)
Lecteur vidéo ──► playlists, clé, segments avec jeton ≤ 5 min (exception unique à « le front ne fetch pas »)
```

| Dossier                  | Rôle                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| `apps/web`               | Site public, espace membre, administration `/admin` (Next.js, Server Components + Server Actions) |
| `apps/api`               | API REST `/v1` (NestJS ESM, Prisma 7, BullMQ), worker de transcodage, seed                        |
| `packages/contracts`     | Schémas Zod partagés (entrées/sorties de l'API) — une seule définition des types                  |
| `packages/design-tokens` | Tokens CSS sombre/clair (source unique), paires de contraste                                      |
| `packages/config`        | TypeScript et ESLint partagés                                                                     |
| `infra`                  | Docker Compose (dev, prod), Caddy (HTTPS), sauvegardes                                            |
| `scripts`                | `check:gradient`, `check:contrast`                                                                |

## Démarrer en local

Prérequis : Node.js 24, pnpm 11 (`corepack enable`), Docker Desktop.

```bash
pnpm install
pnpm infra:up                       # PostgreSQL (port 55432) et Redis (56379), liés à 127.0.0.1
cp apps/api/.env.example apps/api/.env       # puis générer chaque secret (voir commentaires)
cp apps/web/.env.example apps/web/.env.local # SERVICE_API_KEY et REVALIDATE_SECRET identiques à l'API
pnpm --filter @ecine/api db:migrate
pnpm --filter @ecine/contracts build && pnpm --filter @ecine/api build
pnpm db:seed                        # données de démonstration FICTIVES (exige SEED_ADMIN_EMAIL/PASSWORD)
pnpm dev                            # site : http://localhost:3000 — API : http://localhost:4000 (doc : /docs)
```

Transcoder une vidéo de démonstration (FFmpeg dans le conteneur du worker) :

```bash
docker build -f apps/api/Dockerfile --target worker -t ecine-worker:dev .
docker run -d --init --name ecine-worker-dev --network ecine-dev_default --env-file apps/api/.env \
  -e NODE_ENV=development -e STORAGE_DIR=/data/storage \
  -e DATABASE_URL=postgresql://ecine:ecine_dev_local@postgres:5432/ecine \
  -e REDIS_URL=redis://:ecine_dev_local@redis:6379 \
  -v "$(pwd)/storage:/data/storage" ecine-worker:dev
docker exec ecine-worker-dev node dist/seed/demo-video.js <slug-du-film> [--seconds 40]
docker exec ecine-worker-dev node dist/seed/demo-video.js --all   # une vidéo pour chaque film publié
```

> **Windows (Git Bash)** : préfixer `docker run` et `docker exec` par `MSYS_NO_PATHCONV=1` et donner un chemin Windows au volume (`-v "C:\…\streaming-ecine\storage:/data/storage"`). Sinon Git Bash convertit le chemin, le volume est mal monté et le worker écrit ses vidéos hors de `storage/`. Vérifier avec `docker inspect ecine-worker-dev`.
>
> Après un changement de l'échelle de transcodage (`apps/api/src/worker/ffmpeg.ts`), reconstruire l'image puis relancer `--all` : la page d'un film lit sa vidéo prête la plus récente.
>
> Aperçus promotionnels (ADR-0015) : le worker taille l'extrait quand « Début de l'aperçu » change en administration ou qu'une nouvelle vidéo est prête. Après un changement du filigrane (`pnpm brand:build`) ou de `apps/api/src/worker/preview.ts`, reconstruire l'image du worker.

Classes d'IP des limites de débit (ADR-0015) : bases DB-IP Lite (CC BY 4.0, mention de DB-IP.com obligatoire), à télécharger une fois puis chaque mois, et à recharger en redémarrant l'API :

```bash
pnpm --filter @ecine/api geo:update
```

## Commandes

| Commande                                     | Effet                                                                 |
| -------------------------------------------- | --------------------------------------------------------------------- |
| `pnpm dev`                                   | Site + API + contrats en mode surveillance                            |
| `pnpm lint` · `pnpm typecheck` · `pnpm test` | Qualité (ESLint, TypeScript strict, Vitest)                           |
| `pnpm build`                                 | Builds de production                                                  |
| `pnpm test:e2e`                              | Parcours du PRD §8 + audit axe (Playwright ; Edge local sous Windows) |
| `pnpm check:gradient`                        | Échoue si un dégradé apparaît dans le code                            |
| `pnpm check:contrast`                        | Vérifie les contrastes WCAG des tokens (sombre et clair)              |
| `pnpm check:links`                           | Liens cassés (lychee)                                                 |
| `pnpm db:migrate` · `pnpm db:seed`           | Migrations Prisma (local) · données fictives                          |

## Règles non négociables

Voir [`AGENTS.md`](AGENTS.md) : le front ne charge jamais de données côté client ; une donnée = une source (PostgreSQL) ; aucun dégradé ; un seul bouton principal par écran ; aucun jeton hors cookie HttpOnly ; aucun fichier vidéo en accès direct ; demander avant toute décision qui engage le produit.

## Documentation

- [Guide d'administration](docs/guide-administration.md) — pour les éditeurs.
- [Exploitation](docs/exploitation.md) — déploiement, sauvegardes, incidents.
- [Décisions d'architecture](docs/adr/) — dont les points **à valider** par le propriétaire.
- [Licences](docs/licences.md).
