---
name: ecine-secure-streaming
description: Concevoir et implémenter la lecture vidéo sécurisée d'E-Ciné (HLS, chiffrement AES-128, jetons signés, quotas, lecteur hls.js). À utiliser pour upload, transcodage, playback, clés, lecteur et anti-téléchargement.
---

# Compétence : streaming sécurisé

## Objectif et limite
Bloquer le téléchargement simple (clic droit, lien MP4, outils grand public). **Aucune protection web sans DRM n'empêche l'enregistrement d'écran** : l'annoncer honnêtement au propriétaire. DRM (Widevine/FairPlay) = option future via un fournisseur.

## Pipeline
1. Upload reprenable (morceaux), vérification **signature du fichier** + taille, stockage de la source **privé**.
2. Worker FFmpeg : échelle de qualités selon la source (144p → 1080p), segments de 4 s (ADR-0006), **AES-128**, miniature + affiche.
3. Sortie `media/{filmId}/{renditionId}/` + `master.m3u8`. Qualité de départ **basse** (réseaux variables).
4. Lecture : `POST /playback/{videoId}/session` → jeton signé (≤ 5 min, lié à la session et à la vidéo) → manifest. `POST …/refresh` renouvelle. Clé via `GET /playback/keys/{keyId}` : jeton obligatoire, `Cache-Control: no-store`, rate limit strict.
5. Service des segments : Caddy/Nginx (ou CDN) validant le jeton ; pas de listage ; noms non devinables ; HTTPS seulement.

## Défenses (toutes)
Pas de MP4 public · AES-128 + **jeton** (le chiffrement seul n'empêche pas le partage d'URL) · quotas par IP/session · détection d'aspiration → 429 + journal · anti-hotlink (`Origin`/`Referer`, renfort) · `controlsList="nodownload"` et menu contextuel désactivé (**confort, pas sécurité**) · filigrane par session (V2) · procédure de retrait (invalidation des jetons + rotation de clé).

## Lecteur (hls.js)
Qualité auto + manuelle, sous-titres, vitesse, plein écran, clavier (espace, flèches, `f`, `m`), reprise (progression envoyée au plus 1×/10 s), mode « Économiser les données », son seulement après geste, état sauvegardé. Gestion d'erreurs lisible (réseau, jeton expiré → renouvellement silencieux, film indisponible).

## Interdits
Exposer `sourceMedia` · clé AES statique publique · jeton dans l'URL de page · jetons > 5 min · mettre des segments protégés dans le cache du service worker · `contentUrl` du flux dans le JSON-LD.

## Tests obligatoires
- Accès direct au manifest/segment/clé sans jeton → 401/403.
- Jeton expiré → refus ; rejeu depuis une autre session → refus.
- Aspiration séquentielle → 429.
- Lecture OK sur mobile 4G simulée ; changement de qualité sans coupure.

## Liens
RFC 8216 · hls.js · FFmpeg · articles de principes (voir `docs/11-LIENS-DOCS.md` §4).
