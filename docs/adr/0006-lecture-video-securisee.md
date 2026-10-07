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

## Évolution du 7 octobre 2026 : réseaux instables (lot 1 de `docs/12`)

Validée par le propriétaire (lecteur adapté aux connexions de la RDC).

- **Échelle** : ajout d'un palier **144p** (200 kbit/s), audio **64 kbit/s** jusqu'en 360p (96 kbit/s en 480p, 128 kbit/s au-delà), **segments de 4 s** au lieu de 6 (adaptation plus rapide). Les vidéos existantes doivent être retranscodées.
- **Démarrage** : débit estimé avant la première image (dernière mesure de l'appareil, sinon Network Information API, sinon type de réseau) ; plus basse qualité si l'économie de données est demandée par le visiteur ou par le téléphone.
- **Tampon** : 60 s d'avance (120 s au plus), 30 s en arrière, 30 Mo au plus sur les téléphones à 2 Go de mémoire ou moins ; 20 s d'avance en économie de données.
- **Réseau lent** : chargement des segments plus patient (premier octet 15 s, 10 nouveaux essais espacés jusqu'à 15 s) ; montée de qualité prudente, descente rapide.
- **Coupure** : reprise automatique (nouveau jeton ou nouvelle session, essais espacés de 3 à 30 s, ou dès le retour du réseau). Avant, le message promettait une reprise qui n'arrivait jamais.
- **Interface** : chargement visible après 300 ms de blocage, explication après 5 s (« connexion lente », ou bouton « Passer en qualité automatique » si une qualité a été imposée), bandeau « Pas de connexion », partie chargée sous la barre de progression, « Auto (360p) », consommation maximale par heure pour chaque qualité, choix mémorisé sur l'appareil, changement de qualité sans interruption (`nextLevel`).
- **Non fait** : mesure de la qualité d'expérience (temps de démarrage, blocages) : demande d'ajouter une valeur numérique aux événements d'audience, à proposer séparément.
