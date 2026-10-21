# ADR-0016 — Hébergement sur le VPS ecine.art, derrière Cloudflare

- Statut : **décidé par le propriétaire le 21 octobre 2026** (voir « Décisions du propriétaire »).
- Date : 2026-10-21
- Modifie la répartition prévue par `docs/02-ARCHITECTURE.md` (site sur Vercel). Complète l'ADR-0010 (R2 et CDN Cloudflare pour la vidéo, plus tard) et l'ADR-0015 (limites par identité). Procédure : `docs/deploiement-vps.md`.

## Contexte

Le propriétaire met à disposition un VPS (195.200.15.48) et le domaine `ecine.art`, et demande un déploiement qui répartit bien la charge, avec reverse proxy et cache, pour faire tester le site.

## Décisions

1. **Site, API, worker, PostgreSQL et Redis sur le VPS**, en conteneurs Docker, derrière Caddy. Le site n'est plus sur Vercel pour l'instant : rendu serveur au plus près de l'API, un seul endroit à exploiter, aucune limite ni coût Vercel. Le relais signé (ADR-0015) permet de revenir à Vercel sans changement de code.
2. **Deux instances d'API** réparties par Caddy (`least_conn`, santé `/health`) ; **une instance du site** (cache de données de Next.js local à l'instance) ; worker à priorité basse et processeur plafonné.
3. **Cloudflare (offre gratuite) devant `ecine.art` et `api.ecine.art`** : DNS, protection, cache des fichiers statiques au point de présence de Kinshasa. Caddy ne prend l'IP réelle (`CF-Connecting-IP`) que depuis les plages de Cloudflare, et refuse les accès directs à ces deux adresses.
4. **`media.ecine.art` hors proxy Cloudflare** : les conditions de Cloudflare n'autorisent la vidéo sur son CDN que si elle est hébergée chez Cloudflare. Images et aperçus y sont servis par Caddy avec un cache navigateur d'un an ; les segments passent par l'API (jeton).
5. **Images étiquetées par commit**, déploiement par script (`infra/deploy.sh`) : les nouvelles instances doivent être saines avant l'arrêt des anciennes, retour arrière par `--rollback`. Mise en service du 21 octobre 2026 : images construites sur le VPS ; construction en CI (GitHub Actions → GitHub Container Registry privé) à brancher ensuite, pour éviter la charge de construction sur le serveur.
6. **Phase de test non indexée** (`SITE_INDEXABLE=false`) et limites en observation (`RATE_LIMIT_MODE=observe`).

## Conséquences

- Un seul serveur : il n'y a pas de redondance. Les sauvegardes chiffrées hors du VPS et la restauration testée chaque mois deviennent indispensables.
- La bande passante vidéo sort du VPS jusqu'à la migration vers R2 et Cloudflare (ADR-0010).
- Les serveurs de noms d'`ecine.art` passent chez Cloudflare (action du propriétaire).

## Décisions du propriétaire (21 octobre 2026)

| Point | Décision |
| --- | --- |
| Site | **Sur le VPS**. |
| Cloudflare | **Devant le site et l'API** ; serveurs de noms d'`ecine.art` transférés chez Cloudflare. |
| Sauvegardes hors du VPS | **Cloudflare R2**. |
| Contenu de la phase de test | **Vrais films**, envoyés depuis l'administration. Chacun exige l'autorisation écrite des ayants droit : la publication reste bloquée sans « preuve d'autorisation » cochée (règle déjà appliquée par l'administration). |
