# ADR-0008 — Envoi des vidéos et images depuis l'administration

- Statut : **appliqué par défaut — à valider**
- Date : 2026-10-02

## Contexte

La règle R1 interdit au navigateur d'appeler l'API (seul le lecteur vidéo fait exception). Or l'administration tourne sur Vercel, qui limite le corps d'une requête de fonction à environ 4,5 Mo.

## Décision (par défaut)

- **Vidéo** : envoi **reprenable par morceaux de 3 Mio**, chaque morceau passant par une Server Action (`bodySizeLimit: 4mb`). Le début du fichier est vérifié par signature (MP4/MOV `ftyp`, Matroska/WebM). Le décalage est contrôlé (409 + reprise), la reprise fonctionne après rechargement, et la source est stockée hors de toute zone publique.
- **Images** : 8 Mio maximum côté API, mais **4 Mo maximum côté administration** (limite Vercel). Le format réel est vérifié avec sharp (SVG et GIF refusés), puis l'image est ré-encodée en WebP à 5 largeurs, sans métadonnées EXIF/GPS. Le texte alternatif est obligatoire, sauf image explicitement décorative.

## Alternative recommandée pour les longs-métrages

Un film de 2 Go représente environ 680 morceaux qui transitent par Vercel : c'est lent et cela consomme du transfert. Variante proposée : un **jeton d'envoi signé** à usage unique, délivré par Server Action, avec lequel le navigateur de l'administrateur envoie les morceaux directement à `api.e-cine.*`. CORS serait limité à cette seule route. C'est une exception à R1 du même type que celle du lecteur. **À valider avant la mise en production.**
