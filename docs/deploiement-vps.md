# Plan de déploiement — VPS 195.200.15.48, domaine ecine.art

> Rédigé le 21 octobre 2026, décisions du propriétaire le même jour (§ 7). Plan à suivre étape par étape. Règle d'exploitation : l'IA prépare (fichiers, scripts, vérifications), un humain lance ce qui touche le serveur et les comptes (`docs/exploitation.md`).
> Décisions d'architecture correspondantes : ADR-0016 (décidée le 21 octobre 2026). Procédures pas à pas des comptes externes (Cloudflare, DNS, Turnstile, Resend, R2) : § 8.

## 0. En bref

- **Tout E-Ciné sur le VPS** : site Next.js, API NestJS (deux instances), worker de transcodage, PostgreSQL et Redis, derrière **Caddy** (HTTPS, compression, répartition entre les instances, fichiers statiques).
- **Cloudflare devant le site et l'API** (offre gratuite) : DNS, protection contre les attaques, cache des fichiers statiques au point de présence de Kinshasa. **Pas devant les vidéos** : les conditions de Cloudflare n'autorisent la vidéo sur son CDN que si elle est hébergée chez Cloudflare (R2, ADR-0010, plus tard).
- **Quatre adresses** : `ecine.art` (site), `www.ecine.art` (redirection), `api.ecine.art` (API), `media.ecine.art` (images, aperçus, vidéos).
- **Phase de test** : site public mais non indexé par les moteurs, limites de débit en observation (`RATE_LIMIT_MODE=observe`), vrais films (§ 7), aucune donnée de démonstration.
- Durée : environ une journée de préparation de mon côté, une à deux heures d'actions de ton côté, plus la propagation DNS (jusqu'à 24 h, souvent moins d'une heure).

## 1. État constaté le 21 octobre 2026

| Élément | Constat |
| --- | --- |
| VPS 195.200.15.48 | Hostinger, KVM : **Ubuntu 26.04.1 LTS**, noyau 7.0, **2 vCPU** (AMD EPYC 9354P), **7,7 Go** de mémoire, **pas de swap**, disque NVMe de **100 Go** (95 Go libres). IPv4 195.200.15.48, IPv6 `2a02:4780:28:b23a::1`. Fuseau UTC, heure synchronisée. Empreinte de la clé d'hôte : `SHA256:vtxeisOPMoimmdtmFGkDUqKgN7ooSLG7BuXJNVBkJIc` (ED25519). |
| Accès SSH depuis ce PC | Ouvert le 21 octobre par le propriétaire : clé dédiée `~/.ssh/ecine_vps`, alias `ecine-vps` (`root`). |
| État du serveur | Vierge : seul SSH écoute ; pas de Docker ; pare-feu `ufw` inactif ; pas de fail2ban ; `unattended-upgrades` installé ; SSH accepte `root` et les mots de passe ; seul utilisateur : `root` (deux clés autorisées). |
| Domaine ecine.art | Serveurs de noms de parking (`cosmos` et `nova.dns-parking.com`) : aucun enregistrement A pour l'instant. |
| Dépôt | Déjà prêts : `infra/docker-compose.prod.yml` (Caddy, API, worker, migrations, PostgreSQL, Redis), `infra/Caddyfile`, `apps/api/Dockerfile` (cibles api, worker, migrate), sauvegardes `infra/backup/`. Manquent : image du site, deux instances d'API, limites de ressources, cache et IP réelle derrière Cloudflare, construction des images en CI, script de déploiement. |

## 2. Architecture cible

```
                         Visiteurs (RDC : mobile, CGNAT)
                                     │
          ┌──────────────────────────┴───────────────────────────┐
          │ Cloudflare (proxy, cache, DDoS)                      │ DNS seul (pas de proxy)
          │ ecine.art · www · api.ecine.art                      │ media.ecine.art
          ▼                                                      ▼
┌───────────────────────────── VPS 195.200.15.48 ──────────────────────────────┐
│  Caddy :443 (TLS, HTTP/3, compression, IP réelle, répartition, statiques)     │
│    ecine.art ──────────► web (Next.js, 1 instance)                            │
│    api.ecine.art ──────► api ×2 (NestJS, moins de connexions, santé /health)  │
│    media.ecine.art ────► /images, /previews : fichiers servis par Caddy       │
│                          /hls : api ×2 (jeton vérifié)                        │
│    :8080 (interne) ────► api ×2  ◄── appels du site (rendu serveur)           │
│                                                                               │
│  worker (FFmpeg, priorité basse, processeur plafonné)                         │
│  PostgreSQL 18 · Redis 8 : réseau interne, aucun port public                  │
│  Volume storage : images, sources, HLS, aperçus, bases DB-IP                  │
└───────────────────────────────────────────────────────────────────────────────┘
```

Pourquoi ces choix :

- **Le site sur le VPS** plutôt que sur Vercel : le rendu serveur appelle l'API en réseau interne (quelques millisecondes au lieu d'un aller-retour Europe ↔ VPS), un seul endroit à surveiller, pas de coût ni de limite Vercel. Le site redevient déplaçable sur Vercel plus tard sans changement de code (même relais signé).
- **Deux instances d'API** : Node.js n'utilise qu'un cœur par processus. Le hachage Argon2 des connexions et le service des segments vidéo profitent de plusieurs cœurs. Caddy répartit vers l'instance la moins chargée et écarte une instance malade.
- **Une seule instance du site** : le cache de données de Next.js (revalidé par étiquettes depuis l'API) vit dans l'instance. À deux instances, une revalidation n'atteindrait qu'une seule des deux. Un cache partagé dans Redis sera possible plus tard si le rendu serveur devient le goulot.
- **Les vidéos hors Cloudflare** : servir des segments vidéo depuis le VPS à travers le proxy Cloudflare enfreindrait leurs conditions. Elles passeront par R2 et Cloudflare avec l'ADR-0010.

## 3. Étapes

Légende : **toi** = action du propriétaire (compte, mot de passe, paiement) ; **moi** = préparation dans le dépôt ou commande lancée avec ton accord.

### Étape 0 — Ouvrir l'accès SSH (toi, 2 minutes)

Dans **ton** terminal (PowerShell), le mot de passe du VPS se tape dans ce terminal, jamais dans la conversation :

```powershell
type $env:USERPROFILE\.ssh\ecine_vps.pub | ssh root@195.200.15.48 "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

Vérifier que l'empreinte affichée à la première connexion est `SHA256:vtxeisOPMoimmdtmFGkDUqKgN7ooSLG7BuXJNVBkJIc`. Ensuite `ssh ecine-vps` fonctionne sans mot de passe.

### Étape 1 — Audit du serveur (moi, lecture seule) — fait le 21 octobre 2026

Résultats au § 1 ; le § 5 (répartition des ressources) est calé sur ces chiffres.

### Étape 2 — Système durci (moi avec ton accord, 1 heure) — fait le 21 octobre 2026

Exigences de `docs/06-SECURITY.md` § 8 :

1. Mises à jour, `unattended-upgrades` (correctifs de sécurité automatiques), fuseau `Africa/Kinshasa`.
2. Utilisateur `deploy` (sudo, clé SSH) ; SSH : clé seulement, `PermitRootLogin no`, `PasswordAuthentication no`. **Garder une session ouverte pendant le changement** pour ne pas se fermer la porte.
3. Pare-feu `ufw` : 22/tcp, 80/tcp, 443/tcp et 443/udp (HTTP/3) ; tout le reste fermé en entrée. `fail2ban` sur SSH.
4. Swap de 4 Go (évite l'arrêt brutal d'un processus pendant un transcodage) ; `vm.swappiness=10`.
5. Docker Engine et le plugin Compose depuis le dépôt officiel de Docker, en vérifiant qu'il couvre Ubuntu 26.04 le jour de l'installation (sinon le paquet `docker.io` d'Ubuntu) ; journaux des conteneurs limités (déjà dans la composition : 10 Mo × 5).
6. Dossiers : `/etc/ecine/` (secrets, droits 600, propriétaire root), `/srv/ecine/` (composition et Caddyfile).

### Étape 3 — DNS et Cloudflare (toi, 30 minutes + propagation)

Pas à pas : § 8.

1. Créer un compte Cloudflare (gratuit), ajouter `ecine.art`, puis remplacer chez le registraire les serveurs de noms de parking par ceux que Cloudflare indique.
2. Enregistrements (gris d'abord, puis orange sauf `media` : § 8.2 et 8.4) :

   | Nom | Type | Valeur | Proxy Cloudflare |
   | --- | --- | --- | --- |
   | `ecine.art` | A | 195.200.15.48 | Oui (orange) |
   | `www` | CNAME | `ecine.art` | Oui |
   | `api` | A | 195.200.15.48 | Oui |
   | `media` | A | 195.200.15.48 | **Non** (gris) : vidéos |
   | `ecine.art`, `api`, `media` | AAAA | `2a02:4780:28:b23a::1` | comme la ligne A correspondante |
   | SPF, DKIM, DMARC | TXT | fournis par Resend | Non |

3. Réglages : SSL/TLS « Full (strict) », HTTP/3 et Brotli activés ; « Always Use HTTPS » **désactivé** (Caddy redirige déjà vers HTTPS et doit recevoir en HTTP les vérifications de Let's Encrypt : Cloudflare ne garantit pas d'exempter `/.well-known/acme-challenge/`) ; « Bot Fight Mode » **désactivé** au début (il bloque des réseaux mobiles partagés, comme nos limites le faisaient : à juger sur les journaux).
4. Certificats : Caddy obtient et renouvelle seul des certificats Let's Encrypt pour les quatre adresses (pas de certificat d'origine Cloudflare à poser). D'où l'ordre du § 8 : enregistrements **gris** d'abord, le temps d'obtenir les certificats, puis orange.
5. Règles de cache : contournement pour `api.ecine.art/*` ; le reste suit les en-têtes du site (§ 6).

### Étape 4 — Préparation du dépôt (moi, une journée, en commits relus)

1. **Image du site** : `output: 'standalone'` dans `next.config.ts`, `apps/web/Dockerfile` et son `Dockerfile.dockerignore` (Node 24 Alpine, utilisateur non root, lecture seule). Les variables `NEXT_PUBLIC_*` (clé Turnstile, transitions) sont figées à la construction : une image par environnement.
2. **Composition de production** :
   - service `web` et volume de cache de Next.js ;
   - `api` en deux instances ;
   - limites de processeur et de mémoire par service (§ 5) ;
   - priorité basse pour le worker ;
   - réglages de PostgreSQL (§ 5) ;
   - Redis plafonné (256 Mo de données, 384 Mo pour le conteneur), toujours en `noeviction` pour les files ;
   - IPv6 sur le réseau d'entrée : sans lui, Docker relaie les visiteurs IPv6 et Caddy ne voit que la passerelle (IP réelle perdue, accès Cloudflare refusé).
3. **Caddyfile v2** (`infra/caddy/`, dossier monté en entier pour que `caddy reload` voie chaque mise à jour) :
   - site, `www` (redirection 301), API, médias ;
   - écoute interne `:8080` pour le rendu serveur ;
   - IP réelle prise dans `CF-Connecting-IP`, seulement depuis les plages de Cloudflare, puis transmise dans `X-Forwarded-For` (le site et l'API la lisent là) ;
   - accès au site et à l'API refusé hors Cloudflare (`CADDY_ORIGIN=cloudflare`, une fois le proxy actif) ;
   - répartition `least_conn` entre les instances lues dans le DNS de Docker ; une instance qui échoue est écartée 30 s (d'après la documentation de Caddy, les contrôles actifs `health_uri` ne s'appliquent pas aux instances dynamiques) ;
   - compression zstd et gzip, HTTP/3, limites de taille et de délai.
4. **Phase de test non indexée** : variable `SITE_INDEXABLE=false`, qui donne un `robots.txt` « tout interdit » et un en-tête `X-Robots-Tag: noindex`. Au lancement, on passe à `true`.
5. **Construction des images** : pour la première mise en service, sur le VPS par `deploy.sh` (étiquette = commit envoyé). Plus tard, en CI (GitHub Actions → GitHub Container Registry privé) : le VPS ne ferait que télécharger, sans pic de charge pendant la construction.
6. **Scripts** :
   - `infra/upload.sh` (sur ce PC) : envoie le commit courant dans `/srv/ecine/src`, fichiers versionnés seulement ;
   - `infra/deploy.sh` (sur le VPS) : construit les images, lance les migrations, remplace les instances une à une (les nouvelles doivent être saines avant l'arrêt des anciennes, sinon elles sont retirées et les anciennes restent), recharge Caddy à chaud, vérifie la santé ; `--rollback` revient aux images de la révision précédente ;
   - `infra/secrets.sh` (sur le VPS) : secrets tirés sur le serveur, saisie masquée des clés externes, contrôle des clés manquantes, premier SUPER_ADMIN, clés de sauvegarde.
7. **Modèles** `infra/env/*.example`, sans aucune valeur secrète.

### Étape 5 — Secrets (toi, sur le VPS, 20 minutes)

Générés **sur le serveur** par `sudo /srv/ecine/src/infra/secrets.sh init` (fait le 21 octobre 2026), jamais copiés dans la conversation ni dans le dépôt. Les clés externes se saisissent masquées avec `secrets.sh set` (§ 8) ; `secrets.sh check` liste ce qui manque sans rien afficher :

| Fichier | Contenu |
| --- | --- |
| `/etc/ecine/api.env` | modèle `infra/env/api.env.example` : `NODE_ENV=production`, `APP_URL=https://ecine.art`, `API_PUBLIC_URL=https://api.ecine.art`, `MEDIA_PUBLIC_URL=https://media.ecine.art`, `REVALIDATE_URL=http://web:3000/api/revalidate`, `COOKIE_SECURE=true`, `ADMIN_MFA_REQUIRED=true`, `SWAGGER_ENABLED=false`, `MAIL_DRIVER=resend`, `RATE_LIMIT_MODE=observe`, secrets générés |
| `/etc/ecine/web.env` | `SITE_URL=https://ecine.art`, `CANONICAL_HOST=ecine.art`, `API_INTERNAL_URL=http://caddy:8080`, `API_PUBLIC_URL`, `MEDIA_PUBLIC_URL`, `SERVICE_API_KEY` et `REVALIDATE_SECRET` **identiques à l'API**, `DEVICE_COOKIE_SECRET`, `SITE_INDEXABLE=false` |
| `/etc/ecine/compose.env` | domaines, `ACME_EMAIL`, `CADDY_ORIGIN`, clé de site Turnstile (publique), révision déployée |
| `/etc/ecine/backup.env` | clé publique age, accès au compartiment R2 |
| `/etc/ecine/secrets/` | mots de passe PostgreSQL et Redis, mot de passe initial du SUPER_ADMIN |

Comptes externes à créer par toi :
- **Turnstile** : clés de site et secrète pour `ecine.art`.
- **Resend** : domaine `ecine.art` vérifié et clé d'API.
- **Web Push** : paire VAPID, tirée sur le VPS (`secrets.sh vapid`).

### Étape 6 — Premier déploiement (moi avec ton accord, 1 heure)

1. `infra/upload.sh`, puis `ssh -t ecine-vps sudo /srv/ecine/src/infra/deploy.sh` (construction, migrations, démarrage, contrôles).
2. Compte SUPER_ADMIN : `sudo infra/secrets.sh admin` (script `create-admin`, le seed de démonstration restant interdit en production). Mot de passe tiré et rangé dans `/etc/ecine/secrets/admin-initial-password`, à changer à la première connexion, puis double authentification. Aucune donnée de démonstration : les vrais films sont envoyés depuis l'administration, avec leur preuve d'autorisation.
3. Bases DB-IP : `geo:update`, puis redémarrage de l'API.
4. `up -d`, puis contrôle de santé de chaque service.

### Étape 7 — Vérifications (moi, 2 heures)

- HTTPS partout : `http://` redirige vers `https://`, `www` redirige vers `ecine.art`, HSTS présent, note SSL Labs.
- `https://api.ecine.art/health` répond « ok » (base et Redis) ; une adresse hors Cloudflare est refusée.
- Parcours e2e (`apps/web/e2e`) lancés contre `https://ecine.art`, sur mobile et sur PC.
- Lecture vidéo, aperçus, image de partage, rappels, revalidation après une modification dans l'administration.
- IP réelle et classe de réseau correctes dans les journaux `rateLimit`.
- En-têtes de cache (§ 6) vérifiés avec `curl -I` et le statut de cache Cloudflare.
- Lighthouse mobile en 4G simulée sur l'accueil et une fiche ; premier test de charge léger (k6, ADR-0015 § 7).

### Étape 8 — Exploitation

- **Sauvegardes** :
  - `infra/backup/backup.sh` chaque nuit à 2 h 15 (`/etc/cron.d/ecine`) : base, configuration `/etc/ecine` (dont la clé maîtresse des vidéos) et médias, chiffrés avec `age` ;
  - copie hors du VPS vers Cloudflare R2 (§ 8) ; la clé **privée** age ne reste pas sur le VPS ;
  - restauration testée chaque mois (`docs/exploitation.md` § 2).
- **Supervision externe** : surveiller `/health` et l'échéance des certificats (Uptime Kuma sur une autre machine, ou un service gratuit), avec une alerte par e-mail.
- **Tâches planifiées** :
  - `geo:update` le 3 de chaque mois ;
  - nettoyage des images Docker inutilisées ;
  - rotation des journaux, déjà assurée par Docker.
- **Mises à jour** : chaque version passe par `infra/deploy.sh` ; retour arrière = redéployer l'étiquette précédente (les migrations restent additives).

## 4. Répartition des rôles par adresse

| Adresse | Sert | Passe par Cloudflare | Cache |
| --- | --- | --- | --- |
| `ecine.art` | Site (pages, actions serveur, `/_next/static`, icônes) | Oui | Fichiers `/_next/static` au point de présence de Kinshasa (un an) ; pages jamais mises en cache (personnelles) |
| `www.ecine.art` | Redirection 301 vers `ecine.art` | Oui | — |
| `api.ecine.art` | API publique (appels directs du navigateur : lecture, clés) | Oui | Contournement (règle Cloudflare) |
| `media.ecine.art` | Images, aperçus, segments HLS | Non | Cache du navigateur : images et aperçus immuables un an ; segments privés ; clés jamais |

## 5. Répartition des ressources

Mesurées le 21 octobre : **2 vCPU, 7,7 Go, 100 Go**. Règle : le site et l'API restent prioritaires ; le transcodage prend ce qui reste.

| Service | Instances | Processeur (plafond) | Mémoire (plafond) | Remarque |
| --- | --- | --- | --- | --- |
| Caddy | 1 | 0,5 | 256 Mo | TLS, fichiers statiques |
| web (Next.js) | 1 | 1 | 1 Go | `--max-old-space-size=768` |
| api | 2 | 0,75 chacune | 512 Mo chacune | pool `pg` de 10 connexions chacune (défaut) |
| worker | 1 | 1 | 2 Go | priorité basse (`cpu_shares` réduit) : il ralentit, le site non |
| PostgreSQL | 1 | 1 | 2 Go | `shared_buffers=512MB`, `effective_cache_size=3GB`, `work_mem=8MB`, `max_connections=40` |
| Redis | 1 | 0,25 | 384 Mo | `maxmemory 256mb`, `noeviction`, AOF |

- **Deux instances d'API malgré 2 vCPU** : elles n'ajoutent pas de puissance, mais permettent les mises à jour sans coupure (l'une redémarre pendant que l'autre sert) et une instance qui tombe n'arrête pas le site.
- **Les plafonds de processeur se chevauchent** volontairement : sous charge, la priorité décide. La mémoire totale plafonnée (environ 6,7 Go) tient dans 7,7 Go, avec un **swap de 4 Go** en filet de sécurité.
- **Transcodage** : plafonné à un cœur, il prend plusieurs heures pour un long-métrage, et le site reste fluide pendant ce temps. Pour aller plus vite, il faut un VPS plus grand (4 vCPU / 16 Go, environ deux fois plus rapide), à décider selon le nombre de films.

**Disque** : une source et ses versions HLS occupent environ 2 à 3 fois la taille du film. Avec 95 Go libres et les sauvegardes locales, il faut compter **10 à 15 longs-métrages au plus** pendant la phase de test. Au-delà : stockage objet R2 (ADR-0010) ou disque plus grand.

**Bande passante** : chaque spectateur en 720p consomme environ 2,7 Mbit/s depuis le VPS. Il faut vérifier dans l'espace client Hostinger le débit du port et le volume mensuel inclus. Au-delà, la vidéo passe par R2 et Cloudflare (ADR-0010).

## 6. Cache, couche par couche

| Couche | Quoi | Durée | Invalidation |
| --- | --- | --- | --- |
| Navigateur et Cloudflare | `/_next/static/*` (noms versionnés) | 1 an, `immutable` | Nouveau nom à chaque version |
| Navigateur | `/images/*`, `/previews/*` sur `media` | 1 an, `immutable` | Nouveau nom à chaque changement |
| Navigateur | Segments HLS | 5 min, `private` | Jeton de 5 min |
| Aucun | Listes HLS, clés AES | `no-store` | — |
| Next.js (dans `web`) | Lectures publiques de l'API (accueil, fiches, catalogue) | 60 s à 10 min | Étiquettes revalidées par l'API (webhook interne signé) |
| Redis (API) | Réponses dérivées (`cache:`), limites (`rl:`) | 30 s à 2 h | Version d'espace de noms (`cache:ver:*`) |
| PostgreSQL | Cache de pages de la base | `shared_buffers`, cache système | — |

## 7. Décisions du propriétaire (21 octobre 2026)

1. Site **sur le VPS**.
2. **Cloudflare** devant le site et l'API (serveurs de noms à transférer).
3. Sauvegardes hors du VPS vers **Cloudflare R2** (compartiment privé dédié, clé d'accès limitée à ce compartiment).
4. Phase de test avec de **vrais films**, envoyés depuis l'administration : autorisation écrite des ayants droit pour chacun (publication bloquée sans preuve d'autorisation). Prévoir l'espace disque (sources conservées + HLS ≈ 2 à 3 fois la taille de la source) et la bande passante de sortie (§ 5).

## 8. Procédures pas à pas (comptes externes)

Libellés relevés dans les documentations officielles le 21 octobre 2026 (Cloudflare, Resend, Hostinger, rclone) ; l'interface peut changer légèrement. Règle constante : **aucune clé secrète dans une conversation, un e-mail ou un ticket**. Les secrets se saisissent sur le VPS, masqués, par `ssh -t ecine-vps sudo /srv/ecine/src/infra/secrets.sh set …` dans ton propre terminal (PowerShell).

### 8.1 Cloudflare et serveurs de noms (15 minutes + propagation)

1. Sur `dash.cloudflare.com`, créer le compte (activer la double authentification du compte).
2. **Domains** → **Onboard a domain** → `ecine.art` → **Continue** → offre gratuite (Free) → **Continue**. Supprimer les enregistrements importés automatiquement (ceux du parking Hostinger).
3. Noter les **deux serveurs de noms** affichés par Cloudflare.
4. Chez Hostinger (hPanel) : si DNSSEC est actif sur `ecine.art`, le désactiver **avant** tout. Puis **DNS** (barre latérale) → `ecine.art` → onglet **DNS / Nameservers** → **Change Nameservers** → **Change nameservers** → coller les deux serveurs de Cloudflare → **Save**.
5. Attendre l'e-mail de Cloudflare annonçant que le domaine est actif (souvent moins d'une heure, jusqu'à 24 h).

### 8.2 Enregistrements DNS (Cloudflare → DNS → Records)

Phase 1 : **tous en gris** (DNS only), TTL Auto, le temps que Caddy obtienne les certificats Let's Encrypt.

| Type | Nom | Contenu | Phase 1 | Phase 2 (§ 8.4) |
| --- | --- | --- | --- | --- |
| A | `@` | `195.200.15.48` | gris | **orange** |
| AAAA | `@` | `2a02:4780:28:b23a::1` | gris | **orange** |
| CNAME | `www` | `ecine.art` | gris | **orange** |
| A | `api` | `195.200.15.48` | gris | **orange** |
| AAAA | `api` | `2a02:4780:28:b23a::1` | gris | **orange** |
| A | `media` | `195.200.15.48` | gris | gris (toujours : vidéo) |
| AAAA | `media` | `2a02:4780:28:b23a::1` | gris | gris (toujours) |

Pour les noms orange, Cloudflare sert lui-même l'IPv6 aux visiteurs ; les AAAA servent surtout à `media` (accès direct en IPv6) et au trajet Cloudflare → VPS. Le réseau d'entrée de Docker est en IPv6 pour que Caddy voie la vraie adresse (§ 3, étape 4).

### 8.3 Réglages Cloudflare (5 minutes)

- **SSL/TLS** → **Overview** : mode **Full (strict)**.
- **SSL/TLS** → **Edge Certificates** : **Always Use HTTPS** désactivé (Caddy redirige déjà, § 3 étape 3) ; version TLS minimale 1.2.
- **Network** : **HTTP/3 (with QUIC)** activé. La compression Brotli est appliquée d'office.
- **Security** → **Bots** : **Bot Fight Mode** désactivé.
- **Caching** → **Cache Rules** → **Create rule** : nom « API sans cache », condition *Hostname* égal à `api.ecine.art`, action **Bypass cache**, **Deploy**.

### 8.4 Passage au proxy (après mon feu vert)

Quand je confirme que les quatre certificats sont obtenus : passer en **orange** les cinq lignes `@`, `www` et `api` du § 8.2 (laisser `media` en gris), puis me prévenir. Je passe alors `CADDY_ORIGIN=cloudflare` : les accès directs au VPS sur `ecine.art` et `api.ecine.art` sont refusés, seule l'entrée par Cloudflare reste ouverte.

### 8.5 Turnstile (5 minutes)

1. Cloudflare → **Turnstile** → **Add widget** : nom « E-Ciné », **Hostname management** : `ecine.art` (ses sous-domaines sont couverts), **Widget mode** : **Managed**, pas de *pre-clearance* → **Create**.
2. **Clé de site** (publique, visible dans les pages) : à me transmettre, ou `ssh -t ecine-vps sudo /srv/ecine/src/infra/secrets.sh set compose TURNSTILE_SITE_KEY`. Elle est figée dans l'image du site à la construction.
3. **Clé secrète** : `ssh -t ecine-vps sudo /srv/ecine/src/infra/secrets.sh set api TURNSTILE_SECRET` (saisie masquée).

### 8.6 Resend (15 minutes + vérification)

1. Sur `resend.com` : **Domains** → **Add Domain** → `ecine.art`, région **Ireland (eu-west-1)**. Resend conseille un sous-domaine d'envoi : si tu en choisis un (par exemple `mail.ecine.art`), l'adresse d'expédition `MAIL_FROM` doit l'utiliser (`secrets.sh set api MAIL_FROM`).
2. Enregistrements : bouton **Sign in to Cloudflare** (ajout automatique), sinon à la main dans Cloudflare → DNS, tous en **gris** : MX `send` (priorité 10, valeur donnée par Resend), TXT `send` (SPF `v=spf1 include:amazonses.com ~all`), TXT `resend._domainkey` (DKIM). Puis **Verify** dans Resend (souvent moins de 15 minutes).
3. Après la vérification : TXT `_dmarc` = `v=DMARC1; p=none;` (surveillance seulement au début).
4. **API Keys** → **Create API Key** : nom « ecine-vps », permission **Sending access**, domaine `ecine.art`. La clé (`re_…`) ne s'affiche qu'une fois : la saisir aussitôt avec `ssh -t ecine-vps sudo /srv/ecine/src/infra/secrets.sh set api RESEND_API_KEY`.

### 8.7 R2 pour les sauvegardes (10 minutes)

1. Cloudflare → **R2 object storage** : s'abonner (un moyen de paiement est demandé même pour l'offre gratuite). Gratuit jusqu'à 10 Go par mois, puis 0,015 $ par Go et par mois ; aucun frais de sortie. Les médias sauvegardés (sources et HLS) dépasseront vite 10 Go : environ 1,50 $ par mois pour 100 Go.
2. **Create bucket** : `ecine-sauvegardes`, emplacement automatique, accès public **désactivé**.
3. **R2 object storage** → **Overview** → **Account Details** → **API Tokens** → **Manage** → **Create Account API token** : nom « ecine-sauvegardes-vps », permission **Object Read & Write**, limitée au compartiment `ecine-sauvegardes`, sans expiration → **Create**. La page affiche l'**Access Key ID**, la **Secret Access Key** (une seule fois) et l'adresse `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.
4. Sur le VPS : `ssh -t ecine-vps sudo /srv/ecine/src/infra/secrets.sh r2` (Account ID visible, clés masquées). Le script écrit puis efface un fichier de test dans le compartiment.
5. La clé de chiffrement des sauvegardes (`secrets.sh age`) est tirée sur le VPS. Sa partie **privée** est copiée sur ce PC puis effacée du VPS : en garder une **seconde copie hors ligne** (clé USB rangée ou gestionnaire de mots de passe). Sans elle, aucune sauvegarde n'est restaurable.

### 8.8 Ordre de mise en service

1. 8.1, 8.2 (gris), 8.3 et 8.5 : dès maintenant.
2. 8.6 : dès que Cloudflare a activé le domaine.
3. Je construis l'image du site avec la clé Turnstile, je démarre tout (`deploy.sh`), Caddy obtient les certificats, je vérifie.
4. 8.4 (orange), puis `CADDY_ORIGIN=cloudflare`.
5. `secrets.sh admin` : premier compte SUPER_ADMIN, mot de passe à changer, double authentification.
6. 8.7 : sauvegardes, puis premier essai de restauration (`docs/exploitation.md`).
