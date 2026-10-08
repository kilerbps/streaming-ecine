# ADR-0003 — Palette dérivée du logo

- Statut : **amendé par l'ADR-0011 (charte « Nuit de Kin », 8 octobre 2026)** : neutres bleu nuit, couleurs du logo en aplats d'action et de moment, couleurs du lecteur tranchées. Le badge en aplat et l'attente du SVG officiel restent valables.
- Date : 2026-10-02

## Contexte

Q1 du README : le logo décide des couleurs. Le logo fourni (`docs/logo-ecine.png`) utilise un bleu `#1E76BC` (caméra « EC ») et un badge rouge « E-ciné » **en dégradé** (`#AF1E23` → `#F91F26`), alors que la charte interdit tout dégradé.

## Décision

1. Neutres conservés (« Encre » sombre, « Papier » clair) ; accents remplacés par ceux du logo, ajustés pour le contraste :

| Token | Sombre | Clair | Contraste mesuré |
|---|---|---|---|
| `--accent` (CTA, liens) | `#5AA3E6` | `#17629E` | 7,0:1 / 5,7:1 sur le fond |
| `--highlight` (étiquettes) | `#FF5A5F` | `#C41E24` | 6,2:1 / 5,3:1 |
| `--border-strong` (champs, nouveau) | `#857A70` | `#857B70` | 4,5:1 / 3,7:1 (≥ 3:1 exigé pour les composants) |

   Le token `--border` d'origine (1,6:1) reste réservé aux séparateurs décoratifs.
2. Couleurs exactes de marque (`--brand-blue #1E76BC`, `--brand-red #D7262B`) réservées au logo.
3. Logo **redessiné en SVG** (`apps/web/src/components/ui/logo.tsx`) avec le badge rouge **en aplat**.
4. Tokens du lecteur `--player-bg` / `--player-fg` (noir/blanc, identiques dans les deux thèmes).

Vérification automatique : `pnpm check:contrast` (40 paires, sombre et clair) — toutes conformes.

## À valider / fournir

- Le SVG **officiel** du logo pour remplacer le tracé reconstitué.
- L'aplat rouge du badge (choix de la teinte `#D7262B`).
- Les 3 motifs géométriques (`losanges`, `chevrons`, `damier`) : **provisoires**, à faire valider par le propriétaire (05 §9).
