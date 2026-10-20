# AGENTS.md — Règles pour l'IA qui construit E-Ciné

> À copier **à la racine du dépôt** sous le nom `AGENTS.md` (et `CLAUDE.md` si besoin).
> Lis ce fichier en entier au début de chaque session.

## 0. Contexte en 5 lignes

E-Ciné : plateforme congolaise de streaming (films, courts-métrages, publications photo + texte, actualités), privée et indépendante, gratuite et ouverte à tous (aucun lien avec l'INA). Frontend **Next.js 16.3** sur Vercel ; API **NestJS 12** sur VPS ; **Prisma 7** + PostgreSQL ; Redis. Mobile d'abord, sombre + clair, style Carbon artistique, sans dégradé, sans « look IA ». Propriétaire du produit : l'utilisateur humain. **Tu ne décides pas seul des choix qui engagent le produit.**

## 1. Ordre de lecture

**Refonte « Nuit de Kin » en cours (depuis le 8 octobre 2026)** : commence par `docs/AGENTS-REFONTE.md`, puis `docs/design/00-prd-refonte.md` et l'onglet de ton lot. Ces documents priment sur `docs/05` et l'ADR-0003 en cas de contradiction.

1. `docs/01-PRD.md` (quoi) → 2. `docs/10-ROADMAP-TACHES.md` (phase en cours) → 3. `docs/02`, `03`, `04` (comment) → 4. `docs/05` (design) → 5. `docs/06` et `07` (sécurité, SEO, légal) → 6. `docs/08` (pratiques) → 7. `docs/skills/*` (selon la tâche) → 8. `docs/11` (liens officiels).

## 2. Règle d'or : demande avant d'agir

**Tu poses des questions au lieu d'agir seul** quand :

| Situation                                              | Action                                                                |
| ------------------------------------------------------ | --------------------------------------------------------------------- |
| Exigence ambiguë ou contradictoire                     | Pose la question, propose 2–3 options et **une recommandation**       |
| Décision d'architecture, de sécurité ou de données     | Rédige un **ADR** en brouillon et attends la validation               |
| Ajout/mise à jour **majeure** d'une dépendance         | Propose (nom, raison, poids, maintenance, alternatives) et attends    |
| Migration de base non triviale ou destructive          | Montre le SQL/la migration et attends                                 |
| Suppression de fichiers, de données, de branches       | Liste ce qui sera supprimé et attends la confirmation                 |
| Texte juridique, contenu éditorial, noms, slogans      | Prépare une structure avec `[À COMPLÉTER]` ; **ne jamais inventer**   |
| Choix visuels hors des tokens (couleur, police, motif) | Montre des captures/essais et attends                                 |
| Action qui coûte de l'argent ou touche la production   | Ne la fais pas ; donne la procédure                                   |
| Tu n'es pas sûr de la version/API d'une librairie      | Consulte la doc officielle (`docs/11`) ; si doute persistant, demande |

**Format d'une question** (max 3 par message, concises) :

```
Question : …
Contexte : … (1–2 lignes)
Options : A) … B) … (C) …
Ma recommandation : A, parce que …
Si tu ne réponds pas : je prends A et je le note dans docs/adr/.
```

Ne pose pas de question dont la réponse est dans `docs/`. Ne bloque pas non plus sur des détails mineurs : applique le défaut documenté et **note l'hypothèse**.

## 3. Interdits absolus

- Récupérer des données depuis un composant client (`fetch`/SWR/React Query/`useEffect` pour charger des données).
- Dupliquer une donnée métier ou créer une seconde source de vérité.
- Utiliser un **dégradé** (CSS, SVG, image, skeleton shimmer).
- Mettre **deux boutons principaux** dans la même vue (hors bannière cookies : voir `07` §C4).
- Exposer un fichier vidéo en accès direct, un secret, une clé, un jeton dans le navigateur ou dans le dépôt. **Seule exception** (ADR-0015, décision du propriétaire du 20 octobre 2026) : les aperçus promotionnels de 20 s au plus, en 240p, sans son et filigranés, au passage choisi en administration.
- Stocker un jeton d'authentification dans `localStorage`/`sessionStorage`.
- Désactiver une règle de sécurité, un test ou un linter pour « faire passer ».
- Installer un paquet inconnu sans validation ; exécuter des scripts d'installation douteux.
- Lancer un scan actif (ZAP) ou une charge contre la production.
- Inventer une API, une option ou une version : **vérifie dans la documentation**.
- Utiliser des emojis comme icônes, du lorem ipsum, des images génériques de stock non validées.
- Modifier ce dossier `docs/` sans l'annoncer.

## 4. Façon de travailler

1. **Plan court** avant de coder (≤ 10 lignes) : objectif, fichiers touchés, risques, questions.
2. **Petites étapes** : une tâche de la roadmap à la fois, commits conventionnels.
3. **Tests d'abord quand c'est utile** (autorisations, validations, logique du feed).
4. **Vérifie toi-même** : lance lint, types, tests, build ; ouvre l'écran en mobile **et** PC, sombre **et** clair ; vérifie contraste, clavier, 404, liens.
5. **Rends compte honnêtement** : ce qui marche, ce qui n'est pas testé, ce qui reste. Pas de « terminé » sans preuve.
6. **Mets à jour** README du module, ADR, `.env.example`, CHANGELOG.

## 5. Définition de « terminé »

Critères d'acceptation du PRD validés · tests verts · types/lint verts · build verts · responsive (mobile/tablette/PC) · sombre/clair · contraste · accessibilité (clavier, `alt`, `aria`) · SEO (si public) · sécurité (entrées validées, droits testés) · performance (budgets) · aucun lien cassé · documentation à jour · **validation du propriétaire**.

## 6. Particularités techniques à retenir (vérifiées le 02/10/2026)

- **Next.js 16** : le `middleware.ts` s'appelle désormais `proxy.ts` (vérifie la doc de la version installée). `params` et `searchParams` sont **asynchrones**. Utilise Cache Components / Instant Navigations pour la fluidité.
- **NestJS 12** : ESM natif ; Standard Schema dans les décorateurs `@Body/@Query/@Param` ; chaîne d'outils moderne (Vitest, etc.).
- **Prisma 7** : `prisma.config.ts` ; pas d'URL dans `schema.prisma` ; générateur `prisma-client` ; adapter obligatoire ; `.env` non chargé automatiquement ; pas de `$use()`.
- **Sécurité des dépendances** : Next.js publie des correctifs réguliers ; ne reste pas sur une version vulnérable.
- **Navigateurs** : l'audio ne démarre qu'après un geste de l'utilisateur.

## 7. Commandes standard (à créer en phase 1)

```
pnpm dev            # web + api
pnpm lint           # eslint
pnpm typecheck      # tsc --noEmit
pnpm test           # vitest
pnpm test:e2e       # playwright
pnpm build
pnpm db:migrate     # prisma migrate dev (local seulement)
pnpm check:links    # lychee
pnpm check:contrast # script de contraste des tokens
pnpm check:gradient # échoue si « gradient » trouvé
```

## 8. Compétences disponibles (`docs/skills/`)

`ecine-ask-first` · `ecine-nextjs-frontend` · `ecine-nestjs-backend` · `ecine-prisma-postgres` · `ecine-redis-cache` · `ecine-secure-streaming` · `ecine-design-system` · `ecine-ux-psychology` · `ecine-seo-i18n` · `ecine-security-owasp` · `ecine-legal-privacy-drc` · `ecine-pwa-mobile-feel` · `ecine-ads-ready` · `ecine-admin-backoffice` · `ecine-qa-quality`.
Charge la compétence correspondant à la tâche **avant** de la commencer.
