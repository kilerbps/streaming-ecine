# ADR-0015 — Limites de débit par identité, aperçus statiques et jeton vérifié en bordure

- Statut : **décidé par le propriétaire le 20 octobre 2026** (voir « Décisions du propriétaire »). Rédigé le 17 octobre 2026 à partir de l'avis d'un expert en sécurité et en diffusion vidéo, sollicité par le propriétaire.
- Date : 2026-10-17, décision le 2026-10-20
- Complète l'ADR-0006 (lecture sécurisée), l'ADR-0010 (R2 et CDN Cloudflare) et l'ADR-0014 (aperçus et Top 10). Répond au manque P1 de `docs/12-ANALYSE-RESTE-A-FAIRE.md` §3.3 (« Limites par IP face au CGNAT »).

## Décisions du propriétaire (20 octobre 2026)

| Point | Décision |
| --- | --- |
| Aperçus | **Extrait statique accepté**, sous réserve des contrats des ayants droit. Exception inscrite dans `AGENTS.md` §3. |
| Passage de l'aperçu | **Choisi par l'équipe en administration** (« Début de l'aperçu ») ; sans ce choix, pas d'aperçu. |
| Filigrane | **Logo E-Ciné blanc en bas à droite**, environ 10 % de la largeur, opacité 60 %, marge de 4 % (rendu à montrer sur une vraie image avant la mise en ligne). |
| Classes d'IP | **DB-IP Lite** (« IP to ASN » et « IP to Country », CC BY 4.0, mention de DB-IP.com obligatoire) lue par **`mmdb-lib`** 3.0.3. |
| Lancement | **Deux semaines d'observation** : interrupteur `RATE_LIMIT_MODE` (`observe`, puis `enforce`). En observation, seuls les plafonds anti-inondation et la vérification des hébergeurs bloquent. |
| Turnstile | **Invisible, dès l'arrivée sur la fiche d'un film.** |
| Worker Cloudflare (plan Workers Paid) | **Plus tard.** En attendant, les segments passent par l'API, avec leurs quotas actuels. |
| Mise en œuvre | **Tout le plan d'un coup**, hors Worker. |

Reste à faire par le propriétaire : avis du juriste sur le cookie d'appareil (« strictement nécessaire ») et page Cookies ; mention de Turnstile sur les fiches dans la politique de confidentialité ; crédit « DB-IP.com » dans les mentions légales ; vérification des contrats pour les extraits.

## Contexte

**Toutes les limites comptent par IP.** Relevé du code au 17 octobre :

| Action | Limite actuelle |
| --- | --- |
| Ouvrir une session de lecture | 30 par 10 min et par IP (route), puis 40 par 10 min et par IP hachée (service) |
| Renouveler le jeton | 10 par 5 min et par session |
| Demander une clé AES | 60 par 5 min et par session |
| Segments | 150 par minute et par session |
| Inscription, contact | 5 par heure et par IP (Turnstile ; pot de miel pour le contact) |
| Limite générale | 120 requêtes par minute et par IP |

**Le CGNAT rend ces limites dangereuses.** En RDC, beaucoup d'abonnés mobiles partagent la même IP publique. À une heure de forte affluence, une IP d'opérateur peut regrouper des centaines de personnes : le 31e lancement de film de la tranche est refusé à un inconnu. Cloudflare a publié une étude sur ce problème en octobre 2025 (référence en fin de document).

**Les aperçus automatiques aggravent le problème.** Ils ouvrent des sessions par la même route et consomment le même quota que la lecture. La session d'aperçu est déjà réutilisée pendant la visite (commit `948b117`), ce qui limite seulement l'effet.

**Audit du 17 octobre**, sur les pièges signalés par l'expert :

| Point | État |
| --- | --- |
| Limites calculées sur l'IP de Vercel | **Évité** : le site relaie l'IP du visiteur (`x-client-ip`) et les limites l'utilisent (`ClientThrottlerGuard`). |
| Relais de l'IP authentifié | **À renforcer** : une clé de service statique suffit. Une clé qui fuite permet de forger l'IP de n'importe qui. |
| IP hachées sans secret | **Évité** : HMAC avec `IP_HASH_SALT`. Secret fixe, sans rotation quotidienne. |
| IPv4 « mappées » (`::ffff:a.b.c.d`) | **Non traité** : une même IP peut avoir deux compteurs. Pas de regroupement IPv6 par /64. |
| Fenêtres de limite | **Fixes** (stockage Redis du limiteur) : elles se rouvrent toutes au même moment. |
| Jeton dans l'adresse de la clé AES | **Oui** : les listes de lecture réécrites portent le jeton. Le lecteur peut recharger la clé après un renouvellement. |

## Décision proposée

### 1. Compter par identité

Trois niveaux, du moins au plus favorable :

1. **Appareil neuf** (sans cookie ou jamais vérifié). Petit quota propre. Chaque ouverture de session est aussi décomptée d'un **pot commun des appareils neufs** rattaché à l'IP. Jeter son cookie ramène toujours dans ce pot : un robot le vide vite, de vrais visiteurs arrivés au fil de la soirée le vident lentement.
2. **Appareil vérifié** : il a réussi Turnstile. Le cookie porte une date de fin de vérification (24 h), prolongée sans rien demander à chaque visite active. Quota propre, hors du pot commun.
3. **Membre connecté** : compté sur son compte.

**Cookie d'appareil.**
- Contenu : identifiant aléatoire de 128 bits, date d'émission, fin de vérification, signature HMAC-SHA256 de ces trois champs.
- Attributs : préfixe `__Host-`, `Secure`, `HttpOnly`, `SameSite=Lax`, 180 jours.
- Émis par `proxy.ts` (le middleware de Next.js 16), transmis à l'API par le serveur Next.js avec l'IP.
- Aucune donnée personnelle : seulement des compteurs Redis qui expirent.

**Turnstile.**
- Widget invisible lancé dès l'arrivée sur la fiche d'un film, pas au clic sur « Regarder » : le jeton est prêt sans attente. Jeton à usage unique, valable 5 minutes, vérifié par le serveur.
- Si Turnstile ne charge pas (réseau), l'utilisateur n'est pas bloqué : il reste un appareil neuf.
- Le nombre de nouveaux appareils vérifiés par IP et par heure est limité, contre les fermes de robots.
- Pas de preuve de travail : elle coûte des secondes de calcul et de batterie sur un Android d'entrée de gamme, alors qu'un robot la résout sur un serveur.

### 2. Plafond par IP : un garde-fou, plus le limiteur du quotidien

- **Trois classes d'IP** : réseaux de la RDC (plafond généreux), autres réseaux (moyen), hébergeurs et centres de données (strict, Turnstile systématique). Mise en œuvre : une IP est « hébergeur » si son ASN figure dans une liste d'ASN de grands hébergeurs, vérifiée contre la base DB-IP ; sinon « RDC » si son pays est `CD` ; sinon « autres ». Sans base installée, toute IP est « autres ».
- **Plafond dynamique** : `max(plancher ; k × appareils vérifiés distincts vus derrière l'IP en 1 h)`, compté avec un HyperLogLog Redis (`PFADD`/`PFCOUNT`, 12 Ko au plus par clé). Seuls les appareils vérifiés comptent : un robot ne doit pas pouvoir gonfler le plafond en fabriquant des cookies.
- Une IP à 80 % de son plafond déclenche une **alerte**, pas un blocage silencieux.
- **IPv6** : un /64 compte comme un appareil ; agrégat par /48 pour repérer un attaquant qui change d'adresse dans son bloc. **Normaliser les IPv4 mappées** et tronquer l'adresse avant de la hacher.
- **Hachage** : HMAC avec un secret qui change chaque jour.
- **Algorithme à seau** (GCRA en script Lua dans Redis) à la place des fenêtres fixes, avec une rafale d'environ la moitié du quota.
- **Panne de Redis** : la lecture continue avec un petit limiteur en mémoire par instance ; l'inscription et le contact sont refusés.

### 3. Relais signé entre le site et l'API

Les actions serveur envoient l'IP posée par Vercel et l'identifiant d'appareil avec une **signature HMAC** couvrant l'horodatage, la méthode, le chemin, l'IP et l'appareil, à la place de la clé statique. L'API refuse un décalage d'horloge de plus de 30 secondes et ignore ces en-têtes sans signature valide. Une clé qui fuite dans des journaux ne permet alors ni de rejouer ni de forger des requêtes.

### 4. En bordure (Cloudflare, chantier de l'ADR-0010)

- **Le site reste en DNS simple vers Vercel**, sans proxy Cloudflare devant : Vercel réécrit `X-Forwarded-For` et l'IP du visiteur serait perdue. Seuls `api.` et `media.` passent par Cloudflare.
- **Le VPS n'accepte que Cloudflare** : Cloudflare Tunnel, ou pare-feu limité aux plages de Cloudflare. L'IP réelle des appels directs du navigateur se lit dans `CF-Connecting-IP`.
- Les limites liées à une identité (compte, appareil, session) restent dans NestJS et Redis. En bordure : une règle large par IP contre les inondations, et la limite de segments par session dans le Worker.
- **Worker de vérification** : il vérifie la signature et l'expiration du jeton, et que le chemin demandé appartient bien au contenu du jeton. Clé de cache **sans le jeton**. Le cache ne doit jamais être consulté avant la vérification du jeton.
- **Jeton** : identifiant de session, identifiant du contenu, expiration, identifiant de la clé de signature (deux clés actives pour la rotation), signature HMAC. Ajouté au moment de la requête par hls.js, jamais dans un en-tête (une pré-requête CORS par segment).
- Bucket R2 privé, URL `r2.dev` désactivée. Segments de 6 s (inchangé).

### 5. Clés AES

- Une clé par film, avec une **adresse stable sans jeton** dans les listes de lecture ; le jeton est ajouté au moment de la requête. Le lecteur ne charge la clé qu'une fois par session.
- Pas de rotation pendant le film. En HLS AES-128, la clé finit toujours dans le navigateur : cette protection arrête le téléchargement facile, pas un pirate déterminé. Si un ayant droit exige davantage, l'étape suivante est un DRM (Widevine).
- La rotation utile est celle de la clé maîtresse qui chiffre les clés en base (déjà prévue dans `docs/12` §3.3).
- Quotas : 20 par 5 min et par session, 100 par heure et par compte ou appareil. Petit cache mémoire de 60 s dans l'API pour les soirées de sortie.

### 6. Aperçus vidéo

**Recommandation de l'expert : un extrait statique**, généré au transcodage.

| | Proposition |
| --- | --- |
| Durée | 12 à 15 s, 20 s au plus, passage choisi par l'équipe éditoriale (ni scène clé, ni fin) |
| Image | 240p, H.264 profil Main, 300 à 400 kbit/s, léger filigrane |
| Son | aucune piste audio |
| Fichier | MP4 avec l'index en tête, environ 0,5 à 0,75 Mo |
| Cache | nom de fichier versionné, `Cache-Control: public, max-age=31536000, immutable` |
| Stockage | préfixe R2 séparé (`/previews/`), servi sans jeton |

L'extrait ne touche ni l'API, ni Redis, ni le quota de lecture, et reste en cache au point de présence de Kinshasa. **Il exige une exception à la règle « aucun fichier vidéo en accès direct »** (voir les points à trancher).

**Repli** si un ayant droit refuse : quota séparé (60 par 10 min et par appareil), chiffrement conservé. Un jeton d'aperçu plus long ne serait acceptable que limité au préfixe des aperçus.

**Côté site**, dans tous les cas :
- budget de 5 aperçus par visite (environ 3 Mo) ;
- démarrage après 1 s de visibilité (600 ms aujourd'hui) ;
- déjà en place : `saveData`, `preload="none"`, arrêt hors de l'écran, réglage « Aperçus automatiques ».

La condition « 4G ou Wi-Fi » reste fragile : `effectiveType` mesure un débit perçu, et un « Wi-Fi » est souvent le partage de connexion d'un autre téléphone.

### 7. Observation, indicateurs et tests de charge

- **Deux semaines en mode observation** : les nouvelles limites journalisent « aurait bloqué » sans bloquer. Les valeurs se fixent sur les vraies données.
- Chaque 429 est journalisé avec la limite, le type de clé (compte, appareil, IP, pot), la clé hachée, l'ASN, l'état Turnstile et l'ancienneté de l'appareil.
- **Quatre indicateurs** :
  - taux de démarrages réussis (du clic sur « Regarder » au premier segment), par ASN et par heure ;
  - part des 429 reçus par des identités de confiance ;
  - « succès après 429 » dans les deux minutes ;
  - répartition des appareils vérifiés distincts par IP.
- **Alertes de départ** :
  - plus de 0,5 % de 429 sur l'ouverture de session pendant 10 min sur un ASN mobile ;
  - une IP à 80 % de son plafond ;
  - une baisse de plus de 5 points des démarrages réussis par rapport à la même heure une semaine plus tôt ;
  - un pic de cookies neufs ou d'échecs Turnstile.
- **Un 429 n'est jamais une impasse** : `Retry-After` et un motif lisible par une machine (par exemple `pot_ip`). Le lecteur réessaie seul après un délai aléatoire, ou lance Turnstile, et affiche un message simple avec un compte à rebours.
- **Test de charge k6**, scénario « sortie d'un film à 20 h » :
  - 500 utilisateurs sur deux ou trois IP, 70 % d'appareils neufs ;
  - lecture au rythme réel, et cinq robots qui jettent leur cookie ;
  - 3G simulée (`tc netem` : 300 ms, 1 % de pertes).

  Réussite : zéro 429 légitime, robots freinés en moins d'une minute, ouverture de session stable au 95e centile.

## Valeurs de départ (à régler après l'observation)

| Action | Par identité | Par IP : mobile RDC / autres / hébergeurs |
| --- | --- | --- |
| Ouvrir une session (par 10 min) | compte 20 ; appareil vérifié 15 ; appareil neuf 5 | pot des appareils neufs : 150 / 40 / 10 ; plafond global : max(600 ; 20 × appareils vérifiés vus en 1 h) / 200 / 50 |
| Sessions simultanées | compte 3 ; appareil 2 | — |
| Renouveler le jeton | 4 par 5 min et par session | — |
| Demander une clé | 20 par 5 min et par session ; 100 par heure et par compte ou appareil | — |
| Segments (Worker) | 40 par 60 s et par session | règle de bordure : environ 2 000 par 10 s |
| Nouveaux appareils vérifiés | — | 200 / 20 / 3 par heure |
| Inscription | 3 par heure et par appareil | 30 / 10 / 3 par heure (Turnstile obligatoire) |
| Contact | 3 par heure et par appareil | 20 / 10 / 3 par heure |
| Limite générale de l'API | 300 par minute | 3 000 / 600 / 120 par minute |
| Aperçus | aucune si fichiers statiques ; sinon 60 par 10 min et par appareil | — |
| IPv6 | un /64 = un appareil | agrégat /48 : 20 × la limite d'un appareil |

## Ordre de mise en œuvre proposé

1. **Mode observation et indicateurs**, réponse 429 utilisable par le lecteur.
2. **Corrections indépendantes de la décision** : normalisation des IPv4 mappées, adresse de la clé AES sans jeton.
3. **Identités** : cookie d'appareil, pot commun, Turnstile sur la fiche, relais signé, GCRA, IPv6.
4. **Aperçus statiques** si l'exception est validée, sinon quota séparé.
5. **Worker de vérification** (chantier de l'ADR-0010).

## Points à trancher par le propriétaire

1. **Exception pour les aperçus** à la règle « aucun fichier vidéo en accès direct » (`AGENTS.md` §3), formulée ainsi : « sauf les aperçus promotionnels de 20 s au plus, en 240p, sans son et filigranés ». À vérifier avec les contrats : certains ayants droit encadrent les extraits promotionnels.
2. **Coût Cloudflare** : plan Workers Paid (abonnement mensuel et dépassements à l'usage). Je ne souscris rien : la procédure sera fournie.
3. **Nouvelle dépendance** : une base ASN gratuite, mise à jour chaque mois (choix à proposer selon l'ADR-0002).
4. **Cookie d'appareil** : un juriste doit confirmer qu'il est « strictement nécessaire » au sens du Code du numérique. Il faut aussi compléter la page Cookies. Turnstile sur les fiches de films est un nouveau script tiers à mentionner dans la politique de confidentialité.
5. **Valeurs de départ** ci-dessus et **période d'observation** de deux semaines.

## Affirmations à vérifier dans la documentation officielle avant la mise en œuvre

Avancées par l'expert, non encore vérifiées (`docs/11`) :
- les fonctions de limite de Cloudflare selon le plan (comptage par IP seulement en Free et Pro, « IP avec support NAT » en Business, par cookie en Enterprise) ;
- l'ordre d'exécution entre Workers Cache et le Worker, et la facturation des appels internes par `ctx.exports` ;
- les limites de l'API Cache (pas de cache à deux niveaux, sans effet sur `*.workers.dev`) ;
- les tarifs des Workers ;
- le comportement de Vercel sur `X-Forwarded-For`.

## Références (citées par l'expert)

- Cloudflare, « One IP address, many users: detecting CGNAT to reduce collateral effects » (octobre 2025) : https://blog.cloudflare.com/detecting-cgn-to-reduce-collateral-damage/
- Cloudflare, fonctions des règles de limite par plan : https://developers.cloudflare.com/learning-paths/application-security/rate-limiting/features/
- Cloudflare, Workers Cache et clés de cache : https://developers.cloudflare.com/workers/cache/ et https://developers.cloudflare.com/workers/cache/cache-keys/
- Cloudflare, liaison Rate Limiting des Workers : https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- Cloudflare, tarifs des Workers : https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare, R2 avec l'API Cache : https://developers.cloudflare.com/r2/examples/cache-api/
- Cloudflare, jetons HMAC dans le WAF : https://developers.cloudflare.com/firewall/recipes/require-valid-hmac-token/
- Cloudflare, conditions d'utilisation et vidéo sur R2 : https://blog.cloudflare.com/updated-tos/
- Vercel, en-têtes de requête : https://vercel.com/docs/headers/request-headers
- Apple, HLS Authoring Specification (durée des segments) ; RFC 8216 (HLS).
