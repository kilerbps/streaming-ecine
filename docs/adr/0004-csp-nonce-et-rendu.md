# ADR-0004 — CSP à nonce et mode de rendu (contradiction du dossier)

- Statut : **appliqué par défaut — décision du propriétaire requise**
- Date : 2026-10-02

## Contexte

Le dossier contient deux exigences incompatibles avec Next.js 16.3 :

- `06-SECURITY` §4 : CSP stricte **avec nonce** générée dans `proxy.ts`.
- `02-ARCHITECTURE` §5 et PRD §7 : **Cache Components / Instant Navigations** pour une navigation instantanée.

Or la documentation Next.js 16.3 (guide « Content Security Policy ») précise qu'une CSP à nonce **impose le rendu dynamique** de toutes les pages et qu'elle est **incompatible avec le rendu partiel (PPR)**, sur lequel reposent les coquilles statiques des Cache Components.

## Options

| | A — Sécurité d'abord (appliquée) | B — Navigation instantanée d'abord |
|---|---|---|
| CSP | Nonce strict, `strict-dynamic` | `script-src 'self' 'unsafe-inline'` (ou hachages SRI expérimentaux) |
| Rendu | Dynamique, données mises en cache (`fetch` + étiquettes revalidées par l'API, Redis côté API) | Coquilles statiques au CDN + `use cache` |
| Risque | Temps de réponse un peu plus long (aller-retour Vercel ↔ VPS) | XSS moins bien contenue |

## Décision

Option **A** : `apps/web/src/proxy.ts` pose une CSP à nonce. Les lectures publiques passent par `publicGet` (cache de données Next.js, étiquettes `films`, `film:{slug}`, `feed`… revalidées par un webhook signé de l'API). Le thème est lu côté serveur (cookie), donc sans flash.

En développement uniquement, `style-src` autorise `'unsafe-inline'` (le rechargement à chaud de Next.js injecte des styles sans nonce) et `script-src` ajoute `'unsafe-eval'`.

## Conséquences

- Les budgets de performance (LCP < 2,5 s) doivent être mesurés en conditions réelles (4G Kinshasa) dès la phase 2. Si la mesure est insuffisante, passer à l'option B via une nouvelle ADR. Le code est prêt : un seul client d'API (`src/server/api-client.ts`) à adapter.
- Région des fonctions Vercel à placer au plus près du VPS (02 §2).
