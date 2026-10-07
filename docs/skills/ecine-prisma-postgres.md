---
name: ecine-prisma-postgres
description: Modéliser, migrer et interroger la base E-Ciné avec Prisma 7 et PostgreSQL. À utiliser pour le schéma, les migrations, les index, la recherche (pg_trgm), les seeds et les sauvegardes.
---

# Compétence : Prisma 7 + PostgreSQL

## Rappels Prisma 7 (vérifiés)
- URL de connexion dans `prisma.config.ts` (plus dans `schema.prisma`) ; variables d'environnement **chargées explicitement** (ex. `dotenv/config`).
- Générateur `prisma-client` avec `output` dans le code source (ex. `src/generated/prisma`).
- **Adapter de pilote obligatoire** (`@prisma/adapter-pg`).
- Pas de `$use()` : utiliser les extensions client.
- Vérifier https://www.prisma.io/docs/orm/v7 avant toute modification ; ne pas migrer vers « Prisma Next/8 » sans validation.

## Règles
1. **Source de vérité unique** : pas de colonne dupliquée. Compteurs = `COUNT` + cache Redis ; si un compteur persistant est justifié par la performance → ADR + job de recalcul.
2. Suppression douce (`deletedAt`) pour l'éditorial ; suppression réelle des données personnelles sur demande.
3. Slugs uniques ; changement de slug ⇒ ligne `Redirect` automatique.
4. Contraintes d'unicité et clés étrangères **en base**, pas seulement en code.
5. Index sur toute clé de filtre/tri utilisée ; `EXPLAIN` sur les requêtes du feed et de la recherche.
6. `select`/`include` précis (pas de `findMany` sans limite) ; pas de N+1.
7. Transactions pour les écritures multi-tables.
8. Migrations **toujours relues** ; jamais `migrate reset` hors local ; migration destructive = validation du propriétaire ; sauvegarde avant migration en production.
9. Changements risqués : « expand → migrate → contract ».
10. Données de test par seed fictif ; **aucune donnée réelle** hors production.

## Recherche
Extensions `pg_trgm` + `unaccent` ; index GIN sur titres/noms ; colonne `tsvector` (configuration française) ; classement : correspondance exacte > préfixe > trigramme. Moteur dédié seulement si les mesures l'exigent.

## Sauvegardes
`pg_dump` quotidien chiffré, copie hors VPS, rétention 30 j, **restauration testée tous les mois** (script + preuve).

## Interdits
URL de base dans `schema.prisma` (v7) · `executeRaw` avec concaténation · donnée métier uniquement dans Redis · migration appliquée en production sans relecture.

## Checklist
- [ ] `prisma validate` et `prisma format`
- [ ] Index et contraintes revus
- [ ] Migration relue, sauvegarde faite
- [ ] Aucune duplication de donnée
- [ ] Seed fictif à jour
