# 12 — Analyse : ce qui reste à faire

- Date : 7 octobre 2026
- Base : code du dépôt (`main`, commit `9869847`), base de développement, tests dans le navigateur (Edge, 390 × 844).
- Légende des priorités : **P0** bloque la mise en ligne · **P1** important · **P2** confort.
- Légende des efforts : **S** < ½ jour · **M** ≈ 1–2 jours · **L** > 3 jours.

## Résumé

- **Le produit est fonctionnel en local** : 26 exigences fonctionnelles du PRD sur 52 hors vidéo sont faites, le parcours complet (catalogue, compte, lecture sécurisée, administration) marche, et les tests sont verts. Il n'est **pas prêt pour la production**.
- **Le lecteur fonctionne**. Vous ne le voyez pas parce que 9 films de démonstration sur 10 n'ont pas de vidéo. Il s'adapte déjà à la connexion et permet de choisir la résolution, mais il lui manque l'essentiel pour la RDC : un indicateur de mise en tampon, une qualité sous 240p, un démarrage adapté au réseau et une meilleure résistance aux coupures (§ 1.3).
- **La vidéo passe entièrement par le VPS** : envoi, stockage et diffusion. C'est le premier frein à la performance et à la montée en charge. Le stockage objet avec CDN (§ 1.5, ADR-0010) règle à la fois l'envoi et la diffusion.
- **Blocages de mise en ligne hors vidéo** :
  - aucune commande pour initialiser la production (premier administrateur, pages légales) ;
  - textes juridiques non rédigés ;
  - sauvegardes non fiables et jamais restaurées ;
  - build Vercel probablement cassé ;
  - aucune supervision ;
  - domaine et e-mails non configurés ;
  - aucune préproduction ni mesure réelle (§ 3).
- Le plan proposé (§ 4) compte **8 lots**. Les quatre premiers sont techniques et peuvent démarrer tout de suite. Les contenus et le juridique dépendent du propriétaire.

---

## 1. Demandes du propriétaire (7 octobre 2026)

### 1.1 Retirer « INA » du projet

E-Ciné est une plateforme privée et indépendante ; l'Institut National des Arts n'était qu'une référence artistique.

**Inventaire (hors `docs-constrution/`)**

| Où | Occurrences | Nature |
|---|---|---|
| `apps/web/src/messages/fr.json` (l. 4, 5, 74, 100, 155, 282) | 6 | Textes visibles : titre par défaut, description SEO, intro du feed, intros des listes films et talents, slogan du pied de page |
| `apps/web/src/app/manifest.ts` (l. 6, 9) | 2 | Nom et description de l'application installée (PWA) |
| `apps/web/src/server/og.tsx` (l. 93) | 1 | Signature des images de partage (réseaux sociaux) |
| `apps/web/src/components/admin/film-editor.tsx`, `article-editor.tsx` | 2 | Exemples d'aide dans l'administration |
| `apps/web/src/components/ui/motif.tsx` | 1 | Commentaire : motifs « à valider avec l'INA » |
| Tests (`contracts.test.ts`, `securite.e2e-spec.ts`) | 3 | Données d'exemple |
| `README.md`, `AGENTS.md`, `CLAUDE.md` | 3 | Présentation du projet |
| `docs/` (00, 01-PRD, 05, 07, 09, 10, ADR 0003 et 0009, skills, guides, licences) | 15 | Public cible du PRD (« étudiants de l'INA »), motifs, licences |
| Base de développement | 1 | Événement de test, déjà dans la corbeille |

**Ce que cela change au-delà des mots**
- Le PRD décrit le public comme « les étudiants et diplômés de l'INA » : le public cible, le pitch et certaines priorités éditoriales (talents formés à l'INA) sont à reformuler.
- Les motifs graphiques restent (inspiration artistique congolaise) ; seule la mention de l'INA et la validation « avec des étudiants de l'INA » disparaissent.
- Le slogan « Le cinéma des talents de l'INA » doit être remplacé : **texte éditorial, à choisir par le propriétaire** (règle AGENTS §2). Pistes à valider ou réécrire :
  - « Le cinéma congolais, en streaming. »
  - « Films et talents du Congo, où que vous soyez. »
  - « [À COMPLÉTER] »

**Effort** : S (code et textes) + S (mise à jour du PRD et des docs, annoncée).

### 1.2 « Je ne vois pas le lecteur vidéo »

**Diagnostic (vérifié)**
- Le lecteur ne s'affiche que si le film a une vidéo transcodée prête (`film.videoId`, [page du film](../apps/web/src/app/[locale]/films/[slug]/page.tsx)). Sinon la page montre l'affiche et « pas de vidéo ».
- Dans la base de démonstration, **1 film publié sur 10 a une vidéo** : `le-chant-des-pirogues` (mire de test de 40 s, 240p à 720p). Les 9 autres ont été publiés par le script de démonstration **sans vidéo**, en contournant le contrôle de publication qui exige pourtant une vidéo prête ([publish-checks.ts:67](../apps/api/src/admin/publish-checks.ts)).
- Test dans Edge sur ce film : le lecteur démarre, source `blob:` (aucune URL de fichier), jeton sur chaque requête, 240p sur mobile, toute la vidéo de 40 s mise en tampon. **Le lecteur fonctionne.**
- Pendant le test, une page de film a affiché « Quelque chose s'est mal passé » : l'API redémarrait (mode surveillance du développement). Ce n'est pas un bug de la page, mais c'est un écran d'erreur générique là où un message « service momentanément indisponible, réessayer » serait plus juste (P2).

**À faire**
| Tâche | Priorité | Effort |
|---|---|---|
| Données de démonstration cohérentes : générer une vidéo de test pour chaque film publié (`db:seed:video`), ou ne publier que les films qui en ont une | P1 | S |
| Le script de démonstration doit passer par les mêmes contrôles de publication que l'administration (une seule règle) | P1 | S |
| Catalogue et feed : ne jamais proposer un film publié sans vidéo (impossible en production grâce au contrôle, mais l'indiquer si la vidéo est retirée ou en cours de retranscodage) | P2 | S |

### 1.3 Lecteur intelligent pour les réseaux de la RDC

**Ce qui existe déjà** ([use-hls.ts](../apps/web/src/components/features/player/use-hls.ts), [ffmpeg.ts](../apps/api/src/worker/ffmpeg.ts))
- hls.js 1.7.3 en débit adaptatif (ABR) : la qualité change automatiquement selon la bande passante mesurée.
- Démarrage en qualité la plus basse (`startLevel: 0`), qualité plafonnée à la taille du lecteur (`capLevelToPlayerSize`).
- Tampon : 30 s (12 s en mode « économie de données »), 90 s maximum.
- Menu « Qualité » : Auto, puis 240p, 360p, 480p, 720p (1080p si la source le permet). **Le choix manuel de la résolution existe déjà.**
- Mode « économie de données » (réglage du visiteur) : plafond à 360p.
- Renouvellement du jeton sans coupure, reprise après erreur réseau, reprise de lecture à la dernière position.
- Échelle de transcodage : 240p (400 kbit/s), 360p (800), 480p (1 200), 720p (2 500), 1080p (4 500), audio 96–128 kbit/s, segments de 6 s.

**Consommation de données (plafonds, vidéo + audio)**

| Qualité | Débit plafond | Par heure (max) |
|---|---|---|
| 144p (proposé) | ≈ 0,26 Mbit/s | ≈ 120 Mo |
| 240p | ≈ 0,50 Mbit/s | ≈ 225 Mo |
| 360p | ≈ 0,90 Mbit/s | ≈ 400 Mo |
| 480p | ≈ 1,30 Mbit/s | ≈ 585 Mo |
| 720p | ≈ 2,6 Mbit/s | ≈ 1,2 Go |
| 1080p | ≈ 4,6 Mbit/s | ≈ 2,1 Go |

**Manques constatés**

| # | Manque | Conséquence en RDC | Priorité | Effort |
|---|---|---|---|---|
| L1 | **Aucun indicateur de mise en tampon** : ni chargement pendant un blocage réseau (`waiting`/`stalled` non gérés), ni partie chargée dans la barre de progression | L'image se fige sans explication ; le visiteur croit que le site est cassé | P0 | S |
| L2 | Pas de palier sous 240p | Sous ≈ 0,5 Mbit/s (3G chargée, EDGE), coupures répétées au lieu d'une image plus floue | P1 | S |
| L3 | Audio à 96 kbit/s même en 240p (≈ 20 % du débit) | Débit gaspillé sur les petits forfaits ; 64 kbit/s suffisent en basse qualité | P1 | S |
| L4 | Segments de 6 s | L'adaptation réagit plus lentement aux chutes de débit ; 4 s est un meilleur compromis pour les réseaux instables | P1 | S (retranscodage du catalogue) |
| L5 | Démarrage toujours en 240p, estimation initiale par défaut de hls.js | Image floue au début même sur un bon réseau (fibre, 4G) | P1 | S |
| L6 | Pas de politique de reprise réglée pour les réseaux lents (délais, nombre d'essais, attente progressive) | Erreur fatale trop tôt sur une connexion qui revient au bout de quelques secondes | P1 | S |
| L7 | « Auto » n'affiche pas la qualité réellement jouée ; le choix manuel n'est pas mémorisé | Le visiteur ne comprend pas pourquoi l'image est floue ; il doit refaire son choix à chaque film | P1 | S |
| L8 | Tampon arrière non limité (`backBufferLength`), taille mémoire du tampon fixe | Saturation mémoire sur les téléphones d'entrée de gamme (1–2 Go de RAM) | P1 | S |
| L9 | Aucune mesure de la qualité d'expérience (temps de démarrage, taux de blocage, qualité moyenne) | Impossible de régler l'échelle de qualités sur des faits | P1 | M |
| L10 | Aucun test automatisé en réseau lent ou coupé | Les régressions sur 3G passent inaperçues | P1 | M |
| L11 | Toutes les vidéos passent par le VPS | La bande passante du VPS devient le goulot dès quelques dizaines de spectateurs (voir 1.5) | P0 | L |
| L12 | Pas de mode « audio seul » | Sur une connexion très faible, rien n'est regardable | P2 | M |

**Proposition technique** (options vérifiées dans hls.js 1.7.3)
1. **Démarrage intelligent** : estimer le débit avant la première image avec la Network Information API (`navigator.connection.downlink`, `effectiveType`, `saveData`, disponible sur Chrome Android, le navigateur dominant), sinon avec le dernier débit mesuré sur l'appareil (cookie de préférence, aucune donnée personnelle) ; le passer à `abrEwmaDefaultEstimate` avec `startLevel: -1`.
2. **Tampon adaptatif** : tampon avant plus long quand le débit dépasse largement celui de la qualité (`maxBufferLength` 30 → 60 s, `maxMaxBufferLength` 120 s) pour encaisser les coupures ; tampon arrière limité (`backBufferLength: 30`) ; `maxBufferSize` réduit si `navigator.deviceMemory` ≤ 2.
3. **Adaptation prudente** : `abrBandWidthFactor` / `abrBandWidthUpFactor` plus conservateurs (monter lentement, descendre vite) ; `fragLoadPolicy` avec délais et attente progressive adaptés à la 3G.
4. **Interface** : chargement visible pendant un blocage, partie chargée dans la barre, « Auto (360p) », consommation estimée par qualité (« ≈ 225 Mo/h »), choix mémorisé dans les préférences, message « Connexion lente : qualité réduite » quand l'ABR descend.
5. **Échelle de transcodage** : ajouter 144p (≈ 200 kbit/s + audio 64 kbit/s), audio 64 kbit/s jusqu'en 360p, segments de 4 s, puis retranscoder le catalogue existant (tâche de fond).
6. **Mesure** : événements agrégés `play_start` → temps de démarrage, blocages, qualité moyenne, soumis au consentement « mesure d'audience » comme le reste.
7. **Tests** : profils réseau 3G / coupure dans Playwright (émulation réseau du navigateur) avec critères : démarrage < 5 s en 3G, aucune erreur fatale après 20 s de coupure.

### 1.4 Envoi des vidéos : tampon et performance

**Ce qui existe** ([video-panel.tsx](../apps/web/src/components/admin/video-panel.tsx), [uploads.service.ts](../apps/api/src/media/uploads.service.ts))
- Envoi par morceaux de 3 Mio, **un morceau à la fois**, chemin : navigateur → Server Action Vercel → API → disque du VPS.
- Pause, reprise, reprise après rechargement de la page, nouvel essai automatique, vérification de la signature du fichier, contrôle de l'espace disque, 20 Gio maximum.

**Manques**

| # | Manque | Priorité | Effort |
|---|---|---|---|
| U1 | `Media.bytes` est un entier 32 bits ([schema.prisma:334](../apps/api/prisma/schema.prisma)) : au-delà de 2 Gio, la taille enregistrée est plafonnée ([video-source.ts:52](../apps/api/src/media/video-source.ts)) ; l'envoi aboutit, mais les statistiques de stockage seront fausses pour les longs-métrages (valeur exacte dans `Upload.bytes`) | P2 | S (migration `Int` → `BigInt`, proposée dans l'ADR-0006) |
| U2 | Un seul morceau à la fois, avec deux allers-retours réseau par morceau (Vercel puis API) : le débit dépend surtout de la latence, pas de la connexion | P1 | M |
| U3 | Ni débit ni temps restant affichés | P1 | S |
| U4 | Aucun avertissement si l'on ferme l'onglet pendant l'envoi ; l'écran peut se mettre en veille (pas de verrou d'écran) | P1 | S |
| U5 | Pas de contrôle d'intégrité par morceau (empreinte) : un morceau corrompu n'est détecté qu'au transcodage | P1 | S |
| U6 | Fichiers `.part` abandonnés jamais nettoyés (déjà noté dans l'ADR-0009) | P1 | S |
| U7 | Morceaux de 3 Mio imposés par la limite de Vercel (4,5 Mo) : un film de 4 Gio = ≈ 1 400 requêtes | P1 | résolu par U8 |
| U8 | En production : envoi direct du navigateur vers le stockage objet (voir 1.5), sans passer par Vercel ni par le VPS | P0 avec le stockage objet | M |

**Proposition**
- Tout de suite (stockage local) : file d'envoi avec **3 morceaux en parallèle**, taille de morceau adaptée au débit mesuré, débit et temps restant, avertissement avant fermeture, verrou d'écran (Wake Lock), empreinte SHA-256 par morceau vérifiée par l'API.
- Avec le stockage objet : **envoi multipart direct** (morceaux de 8 à 64 Mio, 4 en parallèle, chaque morceau retenté seul). L'API ne fait que signer chaque morceau et finaliser ; la reprise s'appuie sur la liste des morceaux déjà reçus par le stockage. Voir l'ADR-0010.

### 1.5 Stockage externe (S3 ou compatible) pour la production

**Situation actuelle**
- Tout est sur le disque du VPS : images, sources, segments HLS. Douze fichiers de l'API manipulent directement le système de fichiers (`media/*`, `playback/*`, `worker/transcode.processor.ts`, `seed/*`), sans couche d'abstraction.
- Les segments vidéo sont servis par l'API elle-même (`sendFile`) : **chaque spectateur consomme la bande passante du VPS**. C'est le premier goulot d'étranglement à la mise en ligne (L11).

**Cible** : une interface de stockage unique (`local` en développement, `s3` en production) pour les images, les sources et les segments. Le worker télécharge la source dans un dossier temporaire, transcode, puis dépose les segments chiffrés dans le stockage. L'API garde les clés de chiffrement et la réécriture des playlists ; **les segments sont servis par un CDN proche des spectateurs**, avec vérification du jeton de lecture à la périphérie.

**Options et recommandation** : voir le brouillon [ADR-0010](adr/0010-stockage-objet-cdn.md) (à valider). En bref : Cloudflare R2 + CDN Cloudflare (point de présence à Kinshasa, sortie de données gratuite, vidéo autorisée sur le CDN si elle est hébergée sur R2), avec une alternative Bunny.net.

| Tâche | Priorité | Effort |
|---|---|---|
| Interface `StorageDriver` + pilote local (aucun changement de comportement) | P0 | M |
| Pilote S3 compatible (R2, Bunny, MinIO, AWS…) + tests sur MinIO local | P0 | M |
| Worker : source téléchargée, segments envoyés au stockage | P0 | M |
| Segments servis par le CDN avec jeton vérifié à la périphérie ; clés toujours servies par l'API | P0 | M–L |
| Envoi multipart direct depuis l'administration (U8) | P0 | M |
| Script de migration du disque vers le stockage objet ; sauvegarde du bucket | P1 | S |
| Images : servies par le CDN depuis le stockage objet | P1 | S |

---

## 2. Écarts avec le PRD et la feuille de route

Le PRD compte 58 exigences fonctionnelles (FR). Les 6 qui portent sur la vidéo sont traitées au § 1. Sur les 52 restantes, **26 sont faites** et 26 sont partielles ou absentes. Le code ne contient aucun `TODO` ni `FIXME`.

### 2.1 Exigences fonctionnelles partielles ou absentes

| ID | Sujet | Ce qui manque | Preuve | Effort | Prio |
|---|---|---|---|---|---|
| — | Initialisation de la production | Le seed refuse la production (à juste titre) et rien ne le remplace : ni premier SUPER_ADMIN, ni pages À propos et légales, ni paramètres du site. Les liens du pied de page renverraient 404 | `apps/api/src/seed/seed.ts:345` | S | **P0** |
| FR-130 | Pages légales | Structure seulement, textes `[À COMPLÉTER — validation juridique]` | `seed/demo-data.ts:562-649` | S + juriste | **P0** |
| FR-050 | À propos | Bienvenue, vision, histoire : `[À COMPLÉTER]` | `seed/demo-data.ts:567-573` | contenu | **P0** |
| FR-102 | Pages statiques | Pas de route publique générique : une page créée en administration est introuvable ; renommer le slug d'une page légale casse son lien ; le sitemap liste ces pages quand même | `app/[locale]/[...introuvable]`, `app/sitemap.ts:30` | S | P1 |
| FR-103 | 2FA des administrateurs | Ni codes de secours ni réinitialisation par un SUPER_ADMIN (téléphone perdu = intervention en base). Le secret 2FA est scellé avec `MEDIA_KEY_SECRET`, la clé des vidéos | `users/me.service.ts:137` | S–M | P1 |
| FR-091 | Signalement | Bouton seulement sur les films ; l'API accepte aussi publications, articles et talents | `films/[slug]/page.tsx:150` | S | P1 |
| FR-132 | Page d'erreur | Pas de `global-error.tsx` : une erreur dans le layout racine n'est pas captée | `app/[locale]/error.tsx` seul | S | P1 |
| FR-133 | Liens cassés | lychee ne vérifie que la documentation, pas le site construit | `ci.yml:88` | S | P1 |
| FR-002 / 006 | Bande-annonce | Simple lien externe, pas de lecture dans la page | `films/[slug]/page.tsx:160` | M | P1 |
| FR-003 | Sous-titres | Le lecteur sait les afficher, mais aucun moyen de les envoyer (`MediaKind.SUBTITLE` inutilisé) | `schema.prisma` | M | P1 |
| FR-044 | Aperçu vidéo muet dans le feed | Absent (affiche seule) | `feed-cards.tsx:53` | M | P1 |
| FR-110 / 111 / 112 | Publicité | Ni composant d'emplacement, ni mention « Sponsorisé », ni chargement soumis au consentement. Seul le drapeau `adsEnabled` existe | `settings-form.tsx:98` | M | P1 si publicité prévue |
| FR-113 | `ads.txt`, CSP publicitaire | Absents | `proxy.ts:40` | S | P2 |
| FR-041 | Surprise « hors habitudes », épinglage | Tirage aléatoire dans les archives ; seul un `Post` peut être épinglé | `feed.algorithm.ts:59` | M | P2 |
| FR-001 | Catégories sur la tuile film | Données présentes, non affichées | `film-tile.tsx:37` | S | P2 |
| FR-005 | Durée maximale d'un court-métrage | Ni fixée ni contrôlée (valeur à donner par le propriétaire) | `contracts/src/admin.ts:55` | S | P2 |
| FR-104 | Statistiques | « Top contenus » limité aux films ; pays jamais renseigné | `insights.service.ts:126` | S | P2 |
| FR-105 | « Bannière » du site | Aucun champ ; sens à préciser par le propriétaire | `schema.prisma:530` | S | P2 |
| FR-107 | Suppression douce | Équipe, catégories et redirections supprimées définitivement (avec confirmation et audit) | `team.service.ts:85` | S | P2 |
| FR-083 | Brouillons | Pas pour le formulaire de contact | `admin/drafts.ts` | S | P2 |
| FR-121 | Ajout d'une langue | Une vingtaine de `'fr'` codés en dur (déconnexion, 404, hors ligne, service worker) | `logout-button.tsx:54`, `public/sw.js:9` | S | P2 |
| FR-013, 092, 093, 108 | Filigrane, commentaires, notifications, gestion des publicités | Prévus en V2 | — | L | P2 |

### 2.2 Exigences non fonctionnelles et feuille de route

| Sujet | Ce qui manque | Effort | Prio |
|---|---|---|---|
| Préproduction et déploiement (phases 1 et 7) | Vercel et le VPS ne sont pas branchés ; aucune image Docker construite en CI | M | **P0** |
| Mesure du VPS et décision CDN (phase 2) | Jamais faites (→ ADR-0010) | M | **P0** |
| Performance (LCP, INP, JS < 170 Ko) | Rien de mesuré ; Lighthouse ne tourne que si `PREVIEW_URL` est défini, avec le preset `perf` qui ignore accessibilité et SEO ; aucun budget JS | M | **P0** |
| Restauration de sauvegarde | Scripts présents, jamais exécutés | S | **P0** |
| Observabilité | Pas de Sentry, alertes seulement décrites | M | P1 |
| Durées de conservation (`03` §5) | Aucune purge : sessions, messages de contact (12 mois), consentements et mesures d'audience (13 mois) | S–M | P1 |
| E2E en CI | Playwright jamais lancé en CI ; parcours 4 (publication en administration) non automatisé | S–M | P1 |
| Sécurité (ASVS L2) | Pas de ZAP authentifié, pas de scan de l'API sur OpenAPI | M | P1 |
| Accessibilité et appareils réels | axe sur 4 pages seulement ; ni TalkBack, ni zoom 200 %, ni Android d'entrée de gamme, ni PWA installée sur téléphone | M | P1 |
| Fluidité (Instant Navigations) | Écartée au profit de la CSP à nonce (ADR-0004), à trancher après mesure en 4G | M | P1 |
| Guide d'administration | 24 zones `[À COMPLÉTER]` ou `[Capture à ajouter]` | S | P1 |
| Hooks git, page `/design` (phase 1) | Absents | S–M | P2 |

### 2.3 Décisions en attente (ADR et recette)

- **ADR-0009** : les réponses par défaut à Q1–Q12 et les 13 hypothèses attendent votre validation. Ses 7 « manques connus de l'API » sont toujours présents (compteurs du tableau de bord, titre des cibles de signalement, nettoyage des envois abandonnés, etc.).
- **ADR-0003** : SVG officiel du logo et teinte du badge. Le logo INA et la validation des motifs par l'INA **deviennent sans objet** (§ 1.1).
- **ADR-0004** : CSP à nonce ou Instant Navigations.
- **ADR-0005** : fenêtre de grâce de 20 s, réponse 409 qui révèle qu'un e-mail est inscrit, vérification d'e-mail non bloquante.
- **ADR-0006 et 0008** : remplacés par l'ADR-0010 pour l'hébergement et l'envoi ; `Media.bytes` en `BigInt`.
- **Recette** : textes juridiques, HTTPS de bout en bout, Lighthouse en 4G, appareil réel, e-mails Resend réels, restauration — tous à faire en préproduction.
- **Domaine factice** `e-cine.example` partout (`MAIL_FROM`, `.env.example`, seed) : domaine réel à fournir (Q8).

---

## 3. Mise en production

**Déjà solide** :
- Compose de production durci : système de fichiers en lecture seule, capacités retirées, réseau de données interne, journaux limités.
- Images Docker non root avec contrôle de santé, migrations versionnées vérifiées en CI.
- Configuration validée au démarrage : 2FA admin, Turnstile et cookies sécurisés imposés en production.
- CSP à nonce, en-têtes de sécurité, limites de débit dans Redis.
- Journaux sans données personnelles, SEO structuré, Dependabot, `pnpm audit`, gitleaks.

### 3.1 Déploiement

| Manque | Pourquoi | Effort | Prio |
|---|---|---|---|
| Commande `db:bootstrap` de production : premier SUPER_ADMIN, pages légales et À propos aux bons slugs, paramètres du site, sans aucune donnée de démonstration | Sans elle, il faut éditer la base à la main au lancement | S | **P0** |
| Build Vercel fiable : `turbo.json` ne déclare aucune variable d'environnement (Turbo 2 les filtre) ; la commande documentée ne construit pas `@ecine/contracts` (dont l'export pointe vers `dist/`, ignoré par git) ; pas de `vercel.json` (région des fonctions près du VPS, pnpm 11) | Échec probable du premier déploiement, ou build réutilisé depuis le mauvais environnement | S | **P0** |
| Domaine et DNS : site → Vercel, `api.` et `media.` → VPS ou CDN, enregistrement CAA | Tout pointe vers `e-cine.example` | S | **P0** (votre décision) |
| Registre d'images + CD : construire et pousser les images taguées par commit, déploiement SSH, retour arrière documenté (pas de `latest`) | `ghcr.io/e-cine` est fictif, l'image `migrate` n'a jamais été construite | M | P1 |
| Sauvegarde avant chaque migration dans la procédure ; modèles `compose.env` / `backup.env` avec les valeurs de production | Exigé par `08` §4 ; valeurs de production faciles à rater | S | P1 |
| Coupure de quelques secondes à chaque déploiement (une seule instance de l'API) | Réessai dans Caddy (`lb_try_duration`) | S | P2 |
| Durcissement du VPS scripté (pare-feu, fail2ban, mises à jour) | Seulement décrit | M | P2 |

### 3.2 Exploitation

| Manque | Pourquoi | Effort | Prio |
|---|---|---|---|
| **`backup.sh` sans `pipefail`** : si `pg_dump` échoue, `age` produit quand même un fichier non vide et la sauvegarde est jugée réussie ([backup.sh:17-21](../infra/backup/backup.sh)) | Sauvegardes vides sans que personne ne le sache | S | **P0** |
| Test de restauration jamais exécuté ; il lit `/etc/ecine/backup.env` alors qu'il doit tourner depuis un poste d'administration ; il ne vérifie ni les médias ni le déchiffrement d'une clé | Une sauvegarde non restaurée n'est pas une sauvegarde | S | **P0** |
| Supervision minimale : disponibilité vue de l'extérieur et **alerte d'espace disque** (vidéos et base sur le même disque : disque plein = base en panne) | Panne découverte par les utilisateurs | S | **P0** |
| Alerte en cas d'échec de sauvegarde ; versionnement du bucket de sauvegarde (`rclone sync` propage une suppression) | Perte silencieuse | S | P1 |
| Sentry (site et API), journaux d'accès Caddy, journaux centralisés | Erreurs invisibles en production | M | P1 |
| Limites mémoire et CPU des conteneurs | FFmpeg peut affamer l'API et la base | S | P1 |
| Purges planifiées : conservation RGPD, fichiers `.part`, images orphelines | Données gardées trop longtemps, disque qui se remplit | M | P1 |
| Santé du worker, de la file et du disque ; métriques | Vidéos bloquées en « traitement » sans alerte | S–M | P2 |

### 3.3 Sécurité

| Manque | Pourquoi | Effort | Prio |
|---|---|---|---|
| **Séquestre hors ligne** de `MEDIA_KEY_SECRET`, de la clé privée de sauvegarde et de `/etc/ecine`, gardé par deux personnes | Perdre `MEDIA_KEY_SECRET` rend toutes les vidéos et tous les secrets 2FA illisibles | S | **P0** |
| Garde-fous de production : refuser `MAIL_DRIVER=log` (il écrit les liens de réinitialisation dans les journaux), exiger `REVALIDATE_URL` et un vrai `MAIL_FROM`, imposer `COOKIE_SECURE` côté site | Jetons dans les journaux, cookies non sécurisés | S | P1 |
| Rotation des secrets outillée (format scellé sans identifiant de clé : pas de double clé possible) ; clé distincte pour la 2FA | Rotation impossible sans coupure | M | P1 |
| Codes de secours 2FA, au moins deux SUPER_ADMIN, procédure « bris de glace » | Blocage total si l'unique administrateur perd son téléphone | M | P1 |
| **Limites par IP face au CGNAT** : en RDC, beaucoup d'abonnés mobiles partagent la même IP (inscription 5/h, contact 5/h, 30 sessions de lecture/10 min). Décidé : ADR-0015 (20 octobre 2026), en cours de réalisation | Des utilisateurs légitimes bloqués en masse | S–M | P1 |
| ZAP authentifié (membre puis admin) et scan de l'API sur staging ; protection de la branche `main` | Exigé par `06` §7 | M | P1 |
| Rôle Postgres applicatif distinct du superutilisateur ; images Docker à tags fixes ; Trivy/osv-scanner | Défense en profondeur | S–M | P2 |

### 3.4 Juridique, SEO et e-mails

| Manque | Effort | Prio |
|---|---|---|
| Textes juridiques complets (éditeur, directeur de publication, hébergeurs, responsable du traitement, retrait de contenus) par un juriste | L (juriste) | **P0** |
| Liste des sous-traitants et transferts hors RDC (Vercel, hébergeur du VPS, Resend, Cloudflare, stockage), contrats de sous-traitance | M | **P0** |
| Domaine d'envoi vérifié chez Resend avec SPF, DKIM et DMARC (sinon les e-mails de vérification finissent en spam) | S | **P0** |
| Envoi d'e-mails par file avec nouvelles tentatives (aujourd'hui, échec silencieux) ; e-mails de sécurité (mot de passe changé, 2FA désactivée) | M | P1 |
| Registre des traitements, décision sur le DPO, démarches auprès de l'autorité congolaise (à faire vérifier par un juriste) | M | P1 |
| Search Console et Bing, sitemap robuste quand l'API ne répond pas | S | P1 |

### 3.5 Tests et performance

| Manque | Effort | Prio |
|---|---|---|
| Lighthouse sur chaque préproduction (fiches film, feed), sans le preset `perf`, avec un budget JS | S–M | P1 |
| Test de charge sur staging : Argon2 en rafale, rendu serveur Vercel → API, sessions de lecture, débit | M | P1 |
| Tests unitaires du site : un seul fichier aujourd'hui. Rien sur `proxy.ts` (CSP, jetons), le webhook de revalidation ni les Server Actions | M | P1 |
| API : services sans tests (`auth.service` 2FA et réinitialisation, export et suppression du compte, `client-ip.middleware`, règles de production d'`env.ts`) | M | P1 |
| Images en AVIF, réglage de Postgres, réduction des polices chargées | S | P2 |

---

## 4. Plan proposé par lots

Chaque lot se termine par la « définition de terminé » d'AGENTS §5 : tests, types, lint, build, mobile et PC, sombre et clair, validation du propriétaire. Les durées sont des ordres de grandeur pour un développeur.

| Lot | Contenu | Dépend de | Durée |
|---|---|---|---|
| **0. Corrections immédiates** | Retrait d'INA (code, textes, docs), une fois le slogan choisi · vidéo de test pour chaque film de démonstration et seed soumis aux contrôles de publication · **indicateur de mise en tampon** (L1) · `global-error.tsx` · `pipefail` dans `backup.sh` · garde-fous de production d'`env.ts` · migration `Media.bytes` → `BigInt` (SQL montré avant) | Slogan (Q1) | 1–2 j |
| **1. Lecteur intelligent pour la RDC** | Palier 144p, audio 64 kbit/s, segments de 4 s, retranscodage du catalogue · démarrage selon le réseau · tampon adaptatif · reprise prudente · « Auto (360p) », consommation par qualité, choix mémorisé · tests en 3G simulée · mesure de la qualité d'expérience | — | 3–4 j |
| **2. Envoi performant et interface de stockage** | 3 morceaux en parallèle, débit et temps restant, avertissement avant fermeture, verrou d'écran, empreinte par morceau, nettoyage des envois abandonnés · interface `StorageDriver` avec pilote local · MinIO dans le Compose de développement | — | 3–5 j |
| **3. Stockage objet et CDN** | Pilote S3, worker branché sur le stockage, envoi multipart direct, segments servis par le CDN avec jeton vérifié à la périphérie, images sur le CDN, script de migration | Validation de l'ADR-0010 (Q3), comptes du fournisseur | 5–8 j |
| **4. Socle de production** | `db:bootstrap` · build Vercel (Turbo, `vercel.json`) · images en CI, registre, déploiement et retour arrière · restauration testée et alertes de sauvegarde · séquestre des secrets · supervision (disponibilité, disque) · limites des conteneurs · Sentry · purges RGPD · codes de secours 2FA | Domaine, hébergeur du VPS | 5–7 j |
| **5. Préproduction et mesures** | Environnement de staging · Lighthouse, ZAP authentifié et E2E en CI · test de charge · Android d'entrée de gamme, PWA installée, TalkBack · réglage des limites face au CGNAT · trancher l'ADR-0004 | Lots 3 et 4 | 3–5 j |
| **6. Contenus et juridique** (propriétaire, juriste) | Textes légaux, À propos, sous-traitants, DPO · domaine d'envoi Resend (SPF, DKIM, DMARC) · Search Console · captures du guide d'administration · vrais films et affiches | Propriétaire | — |
| **7. Compléments du PRD** | Route des pages statiques, signalement partout, sous-titres envoyables, bande-annonce dans la page, aperçu muet dans le feed, publicité (si retenue), statistiques, P2 restants | Lots 0–2 | 5–8 j |

**Ordre recommandé** : 0 → 1 → 2, en parallèle de vos décisions (domaine, fournisseur, textes), puis 3 → 4 → 5 et la mise en ligne. Le lot 7 s'intercale selon vos priorités.

---

## 5. Questions au propriétaire

**Réponses du propriétaire (7 octobre 2026)**

1. **Slogan** : « Le cinéma congolais, en streaming. » (appliqué : titre, description, application installée, images de partage, pied de page).
2. **Plateforme privée** = indépendante, **gratuite et ouverte à tous** (aucun paiement en V1).
3. **Stockage externe** : ADR-0010 accepté (Cloudflare R2 + CDN, MinIO en développement).
4. **Ordre** : lots 0 et 1 d'abord.

**Questions encore ouvertes**
1. Nom de domaine définitif (Q8 de l'ADR-0009).
2. Compte Cloudflare (R2) et budget mensuel du stockage et du CDN.
3. Hébergeur et taille du VPS (CPU pour le transcodage, disque).
4. Publicité en V1 : oui ou non (lot 7) ?
5. Durée maximale d'un court-métrage (FR-005) et sens de la « bannière » dans les paramètres du site (FR-105).
6. Validation des décisions en attente : ADR-0003, 0004, 0005 et 0009.
