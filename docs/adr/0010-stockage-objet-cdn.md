# ADR-0010 — Stockage objet et diffusion des vidéos par CDN

- Statut : **accepté par le propriétaire le 7 octobre 2026 : option A (Cloudflare R2 + CDN Cloudflare, MinIO en développement). Mise en œuvre : lots 2 et 3 de `docs/12`.**
- Date : 2026-10-07
- Complète l'ADR-0006 (« hébergement des segments à revoir ») et l'ADR-0008 (envoi par morceaux via Vercel).

## Contexte

- Aujourd'hui, images, sources et segments HLS sont sur le disque du VPS ; l'API sert elle-même chaque segment. Chaque spectateur consomme la bande passante du VPS : quelques dizaines de lectures simultanées en 720p suffisent à la saturer.
- L'envoi des vidéos passe par Vercel (limite de 4,5 Mo par requête), d'où des morceaux de 3 Mio envoyés un par un : lent pour un long-métrage.
- Le propriétaire demande (7 octobre 2026) un stockage externe de type S3 pour la production.

## Exigences

1. Les sources restent privées et ne sont jamais servies.
2. Les segments restent chiffrés (AES-128) ; **les clés ne quittent jamais l'API** (`no-store`, jeton, quotas : ADR-0006 inchangé).
3. Le jeton de lecture de 5 min reste obligatoire pour chaque segment.
4. Diffusion depuis un point de présence proche de Kinshasa, coût de sortie de données maîtrisé.
5. API compatible S3 pour éviter l'enfermement chez un fournisseur.
6. Le développement local fonctionne sans Internet (pilote disque ou MinIO).

## Options

| | A. Cloudflare R2 + CDN Cloudflare | B. Bunny.net Storage + CDN | C. AWS S3 + CloudFront | D. MinIO sur le VPS |
|---|---|---|---|---|
| Proximité de Kinshasa | Point de présence **à Kinshasa** (échange KINIX) | Lagos, Nairobi, Johannesburg (aucun à Kinshasa listé) | À vérifier | Le VPS lui-même |
| Coût de sortie | **Aucun frais de sortie** sur R2 | Au Go, faible (tarif à vérifier) | Élevé pour de la vidéo | Bande passante du VPS |
| Vidéo sur le CDN | Autorisée si hébergée sur R2 (conditions spécifiques au CDN) | Oui (usage prévu) | Oui | — |
| Jeton sur les segments | Worker Cloudflare qui vérifie notre jeton, ou validation HMAC du WAF (offre Pro) | Authentification par jeton native (playlists et segments) | URL ou cookies signés | Via l'API (comme aujourd'hui) |
| Compatibilité S3 | Oui | API propre (compatibilité S3 à vérifier) | Oui (référence) | Oui |
| Limite | URL présignées seulement sur le domaine S3 de R2 (pas de cache CDN) : la diffusion passe donc par un Worker sur un domaine `media.` | Pas de présence à Kinshasa | Coût | Ne résout pas la bande passante |

## Décision

**Option A** en production, **D (MinIO)** en développement et en intégration continue, derrière un **pilote S3 générique** : changer de fournisseur (B ou C) ne demande alors qu'une configuration.

## Conception proposée

1. **Interface `StorageDriver`** dans l'API : écrire, lire en flux, informations, supprimer (fichier ou préfixe), envoi multipart (créer, signer un morceau, lister les morceaux, finaliser, annuler). Pilotes `local` (comportement actuel) et `s3`.
2. **Organisation** : `sources/` privé (jamais servi), `hls/{vidéo}/…` privé (servi seulement avec un jeton), `images/` public et immuable via le CDN.
3. **Lecture** : l'API continue de produire les playlists réécrites (petits fichiers) et de servir les clés. Les URL de segments pointent vers `https://media.<domaine>/hls/…?t=JETON`. Un Worker Cloudflare vérifie le jeton (signature, expiration, vidéo de l'URL), lit le segment dans R2 et le met en cache. Le quota de 150 segments par minute passe à la périphérie (règle de limitation de débit) ; les quotas sur les clés et les playlists restent dans l'API. Un segment intercepté reste inutilisable sans la clé.
4. **Envoi** : multipart direct du navigateur vers le stockage (morceaux de 8 à 64 Mio, 4 en parallèle). L'API crée l'envoi, signe chaque morceau (URL valable quelques minutes), vérifie la taille et la signature du fichier avant de lancer le transcodage. CORS du bucket limité à l'origine de l'administration.
   - **Point à valider** : le navigateur envoie alors directement au stockage (requête réseau côté client). Il s'agit d'un envoi, pas d'un chargement de données (AGENTS §3), mais c'est une exception au « tout passe par le serveur » à confirmer.
5. **Worker de transcodage** : télécharge la source dans un dossier temporaire, transcode, envoie les segments en parallèle, nettoie. Espace disque temporaire nécessaire ≈ taille de la source + sorties.
6. **Secrets** : clés d'accès au stockage uniquement dans l'API et le worker ; secret de vérification des jetons dans le Worker Cloudflare. Rotation documentée dans `docs/exploitation.md`.
7. **Migration** : script de copie `storage/` → bucket, vérification par empreinte, bascule du pilote, conservation de la copie locale pendant une période définie.

## Dépendances à valider (AGENTS §2)

| Paquet | Rôle | Remarque |
|---|---|---|
| `@aws-sdk/client-s3` | Pilote S3 (API et worker) | SDK officiel AWS, compatible R2 et MinIO ; poids à mesurer avant installation |
| `@aws-sdk/s3-request-presigner` | URL signées pour l'envoi multipart | Officiel AWS |
| Alternative légère : `aws4fetch` | Signature des requêtes S3 avec `fetch` | Beaucoup plus petit, à évaluer (maintenance, couverture multipart) |

## Coûts

[À COMPLÉTER — à estimer avec le volume réel du catalogue et de l'audience]

Repère pour l'estimation : une heure de film transcodée dans toutes les qualités (144p à 1080p, plafonds) occupe au plus ≈ 4,6 Go, plus la source. Les tarifs de stockage et d'opérations sont à relever sur les pages officielles des fournisseurs au moment du choix.

## Conséquences

- La bande passante vidéo ne dépend plus du VPS ; le VPS ne sert plus que l'API, les playlists et les clés.
- Un fournisseur supplémentaire à exploiter (compte, facturation, secrets, supervision).
- Nouveau domaine `media.<domaine>` à ajouter à la CSP (`media-src`, `connect-src`, `img-src`).

## Sources

- [Cloudflare : centres de données et points d'échange en RDC](https://getdeploying.com/datacenters-in-democratic-republic-of-the-congo), [KINIX sur deux centres de données](https://tech.africa/?p=88304)
- [R2 : URL présignées (domaine S3 uniquement)](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- [Cloudflare : nouvelles conditions, vidéo autorisée sur le CDN si hébergée sur R2, Stream ou Images](https://blog.cloudflare.com/updated-tos/)
- [Bunny.net : authentification par jeton](https://docs.bunny.net/docs/token-authentication), [sécurité de Bunny Stream](https://bunny.net/docs/stream/security)
