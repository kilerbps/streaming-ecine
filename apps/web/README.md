# @ecine/web — Site Next.js 16.3

Site public, espace membre et administration (`/admin`). Rendu serveur, Server Actions, CSP à nonce (ADR-0004).

## Règles de flux de données

- **Le front ne charge jamais de données côté client.** Les Server Components lisent via `src/server/data.ts` → `src/server/api-client.ts` (`server-only`). Les mutations passent par `src/server/actions/*` (Server Actions validées par Zod). Seul le lecteur vidéo appelle directement l'API média, avec un jeton.
- Une donnée = une source : pas de store global ; l'état client ne porte que l'interface.
- Préférences (thème, sons, économie de données) : cookies lisibles côté serveur, pas de flash.

## Organisation

| Dossier                    | Rôle                                                              |
| -------------------------- | ----------------------------------------------------------------- |
| `src/proxy.ts`             | Langue, CSP à nonce, renouvellement des jetons, garde de `/admin` |
| `src/app/[locale]/`        | Pages publiques et espace membre                                  |
| `src/app/admin/`           | Administration (racine de mise en page distincte)                 |
| `src/components/ui/`       | Primitives (Button, Sheet, champs, Loader, icônes, motifs, logo)  |
| `src/components/features/` | Feed, lecteur, interactions, recherche, compte, formulaires       |
| `src/lib/`                 | Sons, haptique, formats, routes, Markdown sûr, chargeur d'images  |
| `src/messages/fr.json`     | Tous les textes d'interface                                       |

## Commandes

```bash
pnpm dev          # http://localhost:3000 (API requise sur :4000)
pnpm test         # tests unitaires (Vitest)
pnpm test:e2e     # parcours du PRD + axe (Playwright, Edge local sous Windows)
pnpm build        # build de production
```

Variables : voir `.env.example` (`SERVICE_API_KEY` et `REVALIDATE_SECRET` identiques à l'API).
