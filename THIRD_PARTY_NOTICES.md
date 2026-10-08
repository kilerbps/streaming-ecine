# Ressources tierces livrées avec E-Ciné

Ce fichier liste les ressources tierces (icônes, polices) intégrées au site et leur licence. Les bibliothèques npm gardent leur licence dans leur propre paquet. Le détail de toutes les ressources, tierces ou non, est dans `docs/licences.md`.

## Solar Icon Set

- Auteur : 480 Design — <https://github.com/480-Design/Solar-Icon-Set> ; fichier Figma : <https://www.figma.com/community/file/1166831539721848736>
- Licence : Creative Commons Attribution 4.0 International (CC BY 4.0) — <https://creativecommons.org/licenses/by/4.0/>
- Obtenu par : `@iconify-json/solar` 1.2.13 (dépendance de développement)
- Modifications : tracés convertis en composants React (`apps/web/src/components/ui/icons/solar.generated.tsx`, généré par `scripts/build-icons.ts`), couleur remplacée par `currentColor`. Sélection d'icônes : `packages/design-tokens/icons.json`.
- Attribution affichée sur les pages À propos et Mentions légales.

## Archivo

- Auteur : Omnibus-Type — <https://github.com/Omnibus-Type/Archivo>
- Licence : SIL Open Font License 1.1 — <https://openfontlicense.org>
- Obtenue par : `next/font/google` (fichiers auto-hébergés au build, graisses 700 et 800, sous-ensemble latin).
