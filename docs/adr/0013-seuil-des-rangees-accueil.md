# ADR-0013 — Seuil d'affichage des rangées de l'accueil

- Statut : **décidé par le propriétaire le 15 octobre 2026.**
- Date : 2026-10-15
- Amende `docs/design/04-ecrans-publics.md` (Accueil, « Ordre des rangées ») pour les seuils des rangées de titres. Ne touche pas l'ADR-0012.

## Contexte

La spécification de l'accueil n'affiche une rangée de titres (Nouveautés, Courts-métrages, rangées par catégorie) qu'à partir de 6 titres, pour éviter les rangées maigres.

Avec le catalogue de pré-lancement (11 titres), aucune rangée n'atteignait ce seuil : l'accueil ne montrait que l'affiche à la une.

## Décision

Le seuil des rangées de titres passe à **4 titres** : 4 affiches remplissent la largeur d'un téléphone, le bord de la quatrième dépassant.

| Rangée | Seuil |
| --- | --- |
| Nouveautés sur E-Ciné | 4 titres publiés depuis moins de 30 jours |
| Courts-métrages : 15 minutes ou moins | 4 courts-métrages |
| Rangées par catégorie | 4 titres lisibles dans la catégorie |
| Top 10 en RDC cette semaine | Inchangé : 10 titres |
| Bientôt sur E-Ciné | Inchangé : 1 titre annoncé |
| Talents à l'honneur | Inchangé : 6 à 12 talents programmés |
| Rangées éditoriales | Inchangé : programmées en administration |

Les seuils sont regroupés dans `HOME_RULES` (`apps/api/src/content/home.service.ts`) ; l'écran `/admin/accueil` affiche les mêmes valeurs.

## Conséquences

- Avec le catalogue actuel, la rangée Documentaire apparaît. Nouveautés apparaîtra dès 4 titres publiés en 30 jours.
- Sur PC, une rangée de 4 affiches occupe un peu plus de la moitié de la largeur.
- Le seuil pourra remonter à 6 avant l'ouverture si le catalogue le permet : il suffit de changer `HOME_RULES` et les textes de `/admin/accueil`.
