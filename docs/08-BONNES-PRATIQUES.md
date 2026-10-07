# 08 — Bonnes pratiques

Règle générale : **la simplicité gagne**. Le code est lu bien plus qu'il n'est écrit. En cas de doute, l'IA pose la question (`09-AGENTS.md`).

## 1. TypeScript et code

- `strict: true`, `noUncheckedIndexedAccess`, **pas de `any`** (utiliser `unknown` + validation Zod). `// @ts-ignore` interdit sans commentaire justifié.
- Fonctions courtes, noms explicites (anglais pour le code, **français pour l'interface et les messages utilisateur**), pas d'abréviations obscures.
- Pas de code mort, pas de `console.log` commité, pas de TODO sans ticket.
- Imports absolus par alias (`@/`), dépendances circulaires interdites.
- ESLint + Prettier + `tsc --noEmit` en CI ; hooks `pre-commit` (lint-staged).
- ESM partout (NestJS 12 est ESM) : extensions et `type: "module"` cohérents.

## 2. Frontend (Next.js)

| Règle | Détail |
|---|---|
| Server Components par défaut | `'use client'` seulement pour l'interactivité (lecteur, formulaires, gestes) ; frontière la plus basse possible |
| Pas de fetch côté client | Données reçues en props ; mutations via Server Actions ; **pas de `useEffect` pour charger des données** |
| `server-only` | Tout module qui touche l'API ou un secret l'importe |
| Un composant = une responsabilité | Fichiers ≤ ~200 lignes ; composants purs quand possible |
| État | État local d'abord ; pas de store global pour des données serveur ; préférences (thème, son) dans un petit contexte + cookie |
| Formulaires | React Hook Form + Zod ; messages d'erreur humains ; boutons désactivés pendant l'envoi ; `aria-live` pour les erreurs |
| Mises à jour optimistes | Like, favori, progression : affichage immédiat, rollback explicite en cas d'échec avec toast |
| Images | `next/image`, `alt`, `sizes`, dimensions connues ; `priority` uniquement pour l'image LCP |
| Polices | `next/font`, sous-ensembles latin, `display: swap` |
| Métadonnées | `generateMetadata` sur toute page publique ; JSON-LD via composant dédié |
| Erreurs | `error.tsx`, `not-found.tsx`, `global-error.tsx` ; messages utiles, pas de traces |
| Chargement | Éviter l'attente ; skeleton seulement si nécessaire (`05` §7) |
| Dépendances | Chaque ajout justifié (poids, maintenance). Bundle analysé à chaque PR significative |
| Accessibilité | Éléments sémantiques (`button`, `nav`, `main`), pas de `div` cliquables, focus géré dans les modales |
| CSS | Tokens uniquement (pas de couleur en dur), pas de `!important`, **pas de dégradé** |
| Sons | Via un service unique `sound.ts` ; jamais d'appel `Audio()` éparpillé |

## 3. Backend (NestJS)

- Architecture en modules ; **contrôleur fin → service → repository (Prisma)**. Aucune logique métier dans les contrôleurs.
- DTO/contrats Zod à l'entrée **et** à la sortie ; jamais d'entité Prisma renvoyée brute.
- Autorisation dans les services (propriété), pas seulement dans les guards.
- Transactions Prisma pour les opérations multi-tables ; idempotence pour les créations sensibles.
- Pas de requêtes N+1 : `include`/`select` précis, index vérifiés (`EXPLAIN`).
- Jobs longs en file (BullMQ) avec reprises, délais, journalisation, nettoyage.
- Configuration validée au démarrage (le serveur refuse de démarrer si une variable manque).
- Tests : unitaires (services), intégration (Supertest + base de test), contrats (OpenAPI).

## 4. Base de données

- Migrations Prisma **toujours revues** ; jamais de `migrate reset` hors local ; migrations destructives = validation du propriétaire.
- Données de test via seed ; **aucune donnée réelle** dans les environnements de développement.
- Sauvegarde avant migration en production ; migration « expand → migrate → contract » pour les changements risqués.
- Index sur toutes les clés de recherche et de tri utilisées ; contraintes d'unicité en base (pas seulement en code).
- Une donnée = une source : pas de colonne dupliquée sans règle de recalcul documentée.

## 5. Redis et cache

- Toute clé a un **préfixe** et un **TTL**. Jamais de donnée sans TTL, sauf files gérées par BullMQ.
- Le cache est **optionnel** : l'application doit fonctionner (plus lentement) si Redis est vide ou indisponible (sauf rate limit, qui échoue en mode prudent).
- Invalidation explicite à chaque écriture ; pas de cache sur des réponses personnalisées sans clé utilisateur.

## 6. Tests (pyramide)

| Niveau | Outil | Cible |
|---|---|---|
| Unitaire | Vitest | Logique pure, validations, utilitaires |
| Intégration API | Vitest + Supertest | Routes, autorisations, base de test |
| Composants | Testing Library | Interactions, accessibilité |
| E2E | Playwright | Parcours du PRD §8 (mobile + desktop, sombre + clair) |
| Performance | Lighthouse CI | Budgets de `07` |
| Accessibilité | axe (Playwright) | Écrans clés |
| Sécurité | ZAP, audit de dépendances | `06` §7 |
| Liens | lychee | Pas de lien mort |

Un bug corrigé = **un test qui échouait avant**. Pas de test qui dépend de l'ordre ou du temps réel.

## 7. Git et revue

- Branches courtes `feat/…`, `fix/…`, `chore/…` ; `main` protégée ; fusion par PR avec CI verte.
- **Commits conventionnels** : `feat(films): ajoute la page détail`.
- PR petites (< 400 lignes utiles), description : quoi, pourquoi, comment tester, captures (mobile/PC, sombre/clair).
- Checklist de PR : tests · types · lint · accessibilité · contraste · SEO (si public) · sécurité (entrées, droits) · pas de dégradé · un seul CTA · docs mises à jour.
- Pas de secrets dans le dépôt ; `.env.example` à jour.

## 8. Documentation

- Chaque module a un `README.md` court. Chaque décision structurante a un ADR.
- `CHANGELOG` automatique (release-please ou équivalent).
- La **documentation d'utilisation** (livrable) : guide admin en français avec captures, procédures (publier un film, ajouter un acteur, publier une actualité, gérer les utilisateurs, lire les statistiques, sauvegardes/restauration).

## 9. Performance

- Mesurer avant d'optimiser ; budgets en CI.
- Découper le JS (imports dynamiques pour le lecteur et l'admin), éviter les bibliothèques lourdes (dates, icônes : n'importer que ce qui sert).
- Mettre en cache ce qui est public, **pas** ce qui est privé.
- Préconnexion et préchargement limités à ce qui est critique (image LCP, police principale).
- Vidéo : qualité de départ basse, segments de 4–6 s, pas de préchargement agressif sur mobile (économie de données ; option « Économiser les données »).

## 10. Respect de la vie privée dès la conception

Collecter le minimum · pas de traceur avant consentement · IP hachées · journaux sans PII · suppression/export du compte fonctionnels · sous-traitants listés · durées de conservation appliquées par des tâches planifiées.

## 11. UX éthique

Une action principale par écran · pas de décompte artificiel · pas de culpabilisation · pas de lecture automatique infinie sans pause (rappel doux après N contenus) · désinscription et suppression aussi simples que l'inscription · textes clairs en français, ton chaleureux et sobre.

## 12. Fraîcheur des connaissances

Les frameworks bougent vite (Next.js 16.x, NestJS 12, Prisma 7). **Avant d'écrire du code utilisant une API, l'IA consulte la documentation officielle de la version installée** (liens dans `11`) et signale tout écart avec ces documents au lieu de s'y fier de mémoire.
