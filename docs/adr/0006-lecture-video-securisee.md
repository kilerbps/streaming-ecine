# ADR-0006 — Lecture vidéo sécurisée

- Statut : **appliqué et testé ; choix d'hébergement des segments à revoir après mesure (phase 2)**
- Date : 2026-10-02

## Décision

- **Transcodage** (worker BullMQ + FFmpeg, image Docker `worker`) : échelle 240p à 1080p limitée à la hauteur de la source, segments de 6 s, **AES-128**. La clé est générée par vidéo et stockée chiffrée (AES-256-GCM, `MEDIA_KEY_SECRET`). Le fichier de clé en clair est supprimé après le transcodage. Les noms de segments ont un préfixe aléatoire.
- **Jeton de lecture** HS256 de 5 min, lié à la vidéo et à une session de lecture, obtenu par Server Action (jamais dans l'URL de la page). L'API **réécrit les playlists** pour porter le jeton sur chaque URL (variantes, segments, clé). hls.js remplace le jeton à chaque requête après renouvellement (une minute avant expiration). Le HLS natif (anciens Safari iOS) recharge la source à la position courante.
- **Renouvellement** : à partir de l'ancien jeton (expiré depuis moins de 10 min), si la vidéo est toujours publiée. Retrait d'un film = dépublication ou suppression de la vidéo : tous les jetons deviennent inutiles et la clé est révoquée.
- **Quotas** : 40 sessions par IP et par 10 min, 150 segments par session et par minute (aspiration → 429 et journal), 60 demandes de clé par session et par 5 min.
- **Segments servis par l'API** derrière Caddy, sans listage ni accès direct. Les images restent servies directement par Caddy.
- **Interface** : `controlsList="nodownload"`, menu contextuel désactivé, Picture-in-Picture désactivé. C'est du confort, **pas une sécurité**.

## Limite assumée (à rappeler au propriétaire)

Aucune protection web sans DRM n'empêche l'enregistrement d'écran. Un DRM (Widevine/FairPlay) reste possible plus tard via un fournisseur, et un filigrane par session est prévu en V2.

## Vérifié (02/10/2026)

- Transcodage réel d'une mire de 40 s : 4 qualités produites en 10 s ; les segments sur disque sont chiffrés (pas d'octet de synchronisation MPEG-TS).
- Sans jeton : manifeste, segment et clé refusés (403). Jeton d'une autre vidéo ou altéré : 403.
- Aucun chemin interne dans les playlists. Clé servie en `Cache-Control: no-store`.
- Aspiration : 150 segments acceptés, puis 429.
- Lecture dans Edge : démarrage en 240p, montée en 720p, source `blob:` (aucune URL de fichier).

## À décider

- Hébergement des segments : mesurer la bande passante du VPS (Q3), puis envisager un CDN avec authentification par jeton (ADR à venir).
- `Media.bytes` est un entier 32 bits : la taille exacte des sources de plus de 2 Gio n'y est pas conservée (elle l'est dans `Upload.bytes`). Une migration vers `BigInt` est proposée, en attente de validation.
- Un IV unique par vidéo, comme demandé dans la spécification. Laisser FFmpeg dériver un IV par segment est possible si souhaité.
