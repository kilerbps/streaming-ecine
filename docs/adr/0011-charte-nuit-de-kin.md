# ADR-0011 — Charte « Nuit de Kin » (design system v2)

- Statut : **décisions D-01 à D-14 validées par le propriétaire le 8 octobre 2026. Mise en œuvre : lot 1 (fondations et page `/design`) ; validation visuelle de `/design` par le propriétaire en attente (porte G1).**
- Date : 2026-10-08
- Amende l'ADR-0003 (palette dérivée du logo). Ne touche pas l'ADR-0004 (CSP) ni l'ADR-0006 (lecture sécurisée).

## Contexte

- La v1 (structure Carbon, angles droits, IBM Plex en trois familles, aucun dégradé, aucune ombre, motifs textiles provisoires) donne une allure d'outil d'entreprise, loin d'une application de cinéma tenue en main.
- Le propriétaire a fourni le dossier `docs-refonte-design/` (importé dans `docs/design/`) : PRD de refonte, analyse de plateformes, charte « Nuit de Kin », expérience native, écrans, administration, guide des agents.
- Le site n'est pas encore en ligne : il n'y a ni trafic à mesurer ni public à ménager.

## Décision

1. **Charte** : `docs/05-DESIGN-SYSTEM.md` v2 remplace la v1. Valeurs dans `packages/design-tokens/tokens.css` (source unique).
2. **Palette (amende l'ADR-0003)** :
   - neutres bleu nuit (`--bg #0A0F16` en Nuit, `#F5F7FA` en Jour) au lieu de « Encre » et « Papier » ;
   - le bleu `#1E76BC` et le rouge `#D7262B` du logo deviennent des **aplats** d'action (`--accent`) et de moment (`--signal`), toujours interdits comme couleur de texte ; le texte coloré passe par `--accent-text` et `--signal-text` ;
   - `--highlight` est remplacé par `--signal` / `--signal-text` ;
   - couleurs du lecteur tranchées : piste blanc à 24 %, partie chargée blanc à 48 %, partie lue `--signal`.
3. **Dégradés (D-01)** : trois seulement, définis une fois dans `tokens.css` (`--scrim-bottom`, `--scrim-top`, `.ambient`). `check:gradient` passe en liste blanche ; le dégradé du badge reste exclusif au fichier du logo.
4. **Formes et élévation (D-02, D-03, D-04)** : rayons concentriques de 4 à 24 px ; ombre réservée aux couches flottantes ; matériau translucide sur la navigation seulement, avec repli plein.
5. **Typographie (D-05)** : police du système + Archivo 700/800 (≤ 45 Ko) ; IBM Plex retirée ; plus de chasse fixe ; casse normale (D-14).
6. **Icônes (D-06)** : Solar Icon Set (480 Design, CC BY 4.0), généré au build sans appel réseau ; attribution obligatoire.
7. **Mouvement (D-07)** : ressorts CSS `linear()` générés (dépassement ≤ 3 %), uniquement sous la main.
8. **Comportements (D-08 à D-13)** : sons d'interface coupés par défaut, thème Automatique proposé, accueil en rangées et onglet Découvrir, 4 onglets + Recherche, aperçus muets sous conditions, motifs remplacés par des illustrations construites avec le logo. Mis en œuvre aux lots 2 à 4.
9. **Pré-lancement** : pas de mesure de base sur 14 jours, pas d'indicateur `refonte_v2`, pas de coexistence v1/v2 (`data-ui`), pas de déploiement progressif. La v2 remplace la v1 ; chaque porte se valide sur captures et mesures en laboratoire (profil Android de référence, Lighthouse), puis sur le terrain après la mise en ligne.

## Conséquences

- Nouveaux contrôles dans la CI : `check:tokens` (aucune valeur en dur), `check:icons` (Solar seul, icônes à jour) ; `check:contrast` porte sur les 32 paires v2.
- Nouvelle dépendance de développement `@iconify-json/solar` (aucun code livré au navigateur hors des tracés générés).
- `THIRD_PARTY_NOTICES.md`, `docs/licences.md`, À propos et mentions légales portent l'attribution Solar.
- Les composants gardent leur API : les écrans changent peu au lot 1 et seront restructurés aux lots 2 à 4.
- Risque : sans mesure de terrain, un recul d'usage ne se verrait qu'après le lancement. Les événements du lot 0 (`docs/design/base-2026-10.md`) servent de base dès la mise en ligne.

## Reste à fournir par le propriétaire

- Le SVG officiel du logo (les déclinaisons seront générées par script).
- La validation visuelle de la page `/design` (porte G1).
