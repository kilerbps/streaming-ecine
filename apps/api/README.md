# @ecine/api — API NestJS 12

API REST indépendante du site (`/v1`), consommable plus tard par une application native. Erreurs au format RFC 9457, documentation OpenAPI sur `/docs` hors production.

## Organisation

| Dossier                        | Rôle                                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------- |
| `config/`                      | Variables d'environnement validées au démarrage (`env.ts`)                                    |
| `common/`                      | Erreurs RFC 9457, validation Zod (`ZodPipe`, `@Returns`), crypto, IP réelle, limites de débit |
| `auth/`, `users/`              | Inscription, sessions à refresh tournant, 2FA, compte (export, suppression)                   |
| `content/`, `feed/`, `search/` | Lectures publiques (cache Redis versionné)                                                    |
| `interactions/`, `forms/`      | J'aime, liste, progression, signalements ; contact, consentement, audience                    |
| `playback/`                    | Sessions de lecture, playlists réécrites, clés, segments                                      |
| `media/`, `queue/`, `worker/`  | Images (sharp), envoi vidéo reprenable, file BullMQ, transcodage FFmpeg                       |
| `admin/`                       | Administration complète, contrôles de publication, planification, audit, statistiques         |
| `revalidate/`                  | Invalidation du cache + revalidation signée des pages Next.js                                 |
| `seed/`                        | Données de démonstration fictives, vidéo de test                                              |

Règles : contrôleur fin → service (métier + contrôle de propriété) → Prisma. Toute route est protégée par défaut (`@Public()` pour l'ouvrir), `@Roles('EDITOR')` relit le rôle en base. Toute sortie passe par un schéma `@ecine/contracts`.

## Commandes

```bash
pnpm dev                 # API en mode surveillance (port 4000)
pnpm dev:worker          # worker de transcodage (FFmpeg requis)
pnpm test                # tests unitaires
pnpm test:e2e            # tests d'intégration de sécurité (base ecine_test, pnpm infra:up)
pnpm db:migrate          # migration locale (jamais en production : db:deploy)
pnpm db:seed             # données fictives (exige SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)
```

Variables : voir `.env.example`. Image Docker : `Dockerfile` (cibles `api`, `worker`, `migrate`).
