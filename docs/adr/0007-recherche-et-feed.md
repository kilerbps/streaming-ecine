# ADR-0007 — Recherche et ordonnancement du feed

- Statut : **appliqué**
- Date : 2026-10-02

## Recherche (FR-060 à FR-062)

- PostgreSQL seul : `unaccent` (fonction immuable `f_unaccent`), `pg_trgm` et une colonne `tsvector` française **générée** par la base (titre A, résumé B ; pour les actualités, titre A, chapeau B, texte C) avec index GIN.
- Tolérance aux fautes avec `word_similarity > 0,3`, mot par mot : « Lukussa » trouve « Bienvenu Lukusa », « Tshimnga » trouve « Daniel Tshimanga ». Classement : correspondance exacte, puis préfixe, puis similarité, puis rang plein texte.
- Pas encore d'index trigramme sur expression : inutile au volume actuel. À ajouter si `EXPLAIN` le justifie (Prisma ne sait pas décrire ces index ; il faudra une migration SQL commentée).
- La colonne générée est déclarée `Unsupported("tsvector")` avec `@default(dbgenerated())` pour que Prisma ne tente jamais de la supprimer. La CI vérifie l'absence de dérive (`prisma migrate diff --exit-code`).

## Feed (FR-040 à FR-045)

L'algorithme est une fonction pure testée (`apps/api/src/feed/feed.algorithm.ts`) :

- **Flux principal** : environ 70 % des contenus les plus récents (40 au maximum), par date de publication décroissante.
- **Créneau « surprise »** : une position sur 6, tirée des archives dans un ordre propre à une **graine de visite**. La graine vient d'un cookie de 6 h : l'ordre reste stable au rechargement et change d'une visite à l'autre.
- Quand le flux principal est épuisé, la suite vient des archives. **Aucun contenu n'apparaît deux fois** (testé).
- Les publications épinglées s'affichent en tête de la première page seulement.
- **Garde-fou éthique** : après 3 chargements automatiques, une pause douce (« On continue ? ») demande un geste explicite.
- Pas de compteur d'abonnés, pas de fil de commentaires. Le compteur de « J'aime » est discret.
