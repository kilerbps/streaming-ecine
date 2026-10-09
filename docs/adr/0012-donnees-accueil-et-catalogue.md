# ADR-0012 — Données de l'accueil et du catalogue (refonte, lot 3)

- Statut : **accepté par le propriétaire le 9 octobre 2026** ; migration `20261009090000_refonte_accueil_catalogue` appliquée en développement.
- Date : 2026-10-09
- Contexte de la refonte : `docs/AGENTS-REFONTE.md` (lot 3), `docs/design/04-ecrans-publics.md`, `docs/design/05-admin.md` (Éditeurs, Images, Programmation).

## Contexte

Les écrans du lot 3 ont besoin de données qui n'existent pas encore :
- l'accueil en rangées : affiche à la une programmée, rangées éditoriales, Top 10, talents à l'honneur ;
- l'aperçu rapide et la fiche v2 : langues, lieu de tournage, titre dessiné, phrase d'accroche ;
- les rappels « Me le rappeler » des films à venir ;
- les goûts et « Pas pour moi » ;
- le recadrage des images : cinq formats tirés d'un point focal, avec couleur dominante et aperçu flou.

## Décision

Une migration **uniquement additive** : aucune colonne supprimée ou renommée, aucune donnée réécrite. SQL : `apps/api/prisma/migrations/20261009090000_refonte_accueil_catalogue/migration.sql`.

| Changement | Détail | Règle |
| --- | --- | --- |
| `films` + 7 colonnes | `audioLanguages`, `subtitleLanguages` (codes ISO 639), `filmingLocation`, `titleImageId` (média), `creditsStartSec`, `releaseAt`, `availableUntil` | Publication refusée sans langue audio ni classification d'âge (contrôle de l'API, pas de la base) |
| `film_translations.tagline` | Phrase d'accroche traduite, 80 caractères au plus (Zod) | Une seule source : l'affiche à la une lit celle du film |
| `media` + 5 colonnes | `dominantColor`, `blurDataUrl` (16 px, moins de 500 octets), `focalX`, `focalY`, `crops` (JSON par ratio 2:3, 4:5, 16:9, 1:1, 9:16) | Calculés à l'envoi ; l'original n'est jamais réécrit |
| `featured_slots` | 5 emplacements programmés : film, ordre, début, fin, aperçu vidéo oui ou non | Emplacement vide → dernier film publié |
| `home_rows`, `home_row_translations`, `home_row_items` | Rangées éditoriales nommées, programmées, ordonnées | Les rangées automatiques ne sont pas en base : elles sont calculées |
| `home_talents` | Talents à l'honneur, ordonnés | 6 à 12 (contrôle de l'API) |
| `reminders` | « Me le rappeler » d'un **membre** pour un film | Connexion demandée (raison `reminder`, lot 0) |
| `user_tastes` | Trois genres choisis par un membre | — |
| `film_dismissals` | « Pas pour moi » d'un membre, pendant 90 jours (`expiresAt`) | — |
| `top_ten_entries` | Instantané quotidien du Top 10 (jour, rang, film, visiteurs) | Calculé chaque jour par le worker ; jamais modifiable à la main |

Visiteurs sans compte : l'historique (`ecine_hist`, 20 derniers films), les goûts et « Pas pour moi » vivent dans des cookies de l'appareil, lus par le serveur ; aucune table n'est créée pour eux.

## Conséquences

- Contrats Zod, API, administration (éditeur du film, `/admin/accueil`, recadrage) et écrans publics du lot 3 s'appuient sur ces tables.
- Réversible : supprimer les colonnes et les tables ajoutées.
- La base de développement est migrée par `prisma migrate deploy` ; la production, au déploiement.

## Points à trancher plus tard (pas bloquants pour la migration)

1. **Source du Top 10** : les événements de mesure (`play_start`) n'existent qu'avec le consentement à la mesure d'audience, donc le Top 10 ne compterait qu'une partie des visiteurs. Autre piste : compter les jetons de lecture émis par l'API, sans conserver d'identifiant.
2. **Catégorie de consentement de `ecine_hist`** (personnalisation) : la bannière actuelle n'a que « nécessaires », « mesure d'audience » et « publicité ». Choix juridique à faire valider.
3. **Notifications push des rappels** : clés VAPID et service d'envoi à prévoir (dépendance serveur) ; en attendant, pastille de Nouveautés et e-mail.
