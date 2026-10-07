# 01 — PRD : E-Ciné

Version 1.0 · 2 octobre 2026 · Statut : à valider par le propriétaire du produit

## 1. Résumé

E-Ciné est une plateforme web (installable comme une application mobile) de **diffusion de films et courts-métrages en streaming**, de **valorisation des talents** (acteurs, réalisateurs, producteurs) et de **publication d'actualités**, destinée d'abord aux étudiants et diplômés de l'**Institut National des Arts (INA)** de la RDC, puis au grand public.

Elle se vit comme un **flux de découverte** (films, courts-métrages, publications photo + texte, actualités) sans ressembler à un réseau social ni à Netflix : l'utilisateur doit être **surpris**, pas piégé.

## 2. Problème et opportunité

- Les œuvres des étudiants de l'INA manquent de visibilité et d'une vitrine professionnelle.
- Les acteurs et réalisateurs congolais ont peu de pages référencées sur Google.
- Les connexions mobiles sont variables : la vidéo doit s'adapter au débit.
- Les contenus doivent être protégés contre le téléchargement simple.

## 3. Objectifs et mesures de succès

| Objectif | Indicateur | Cible à 6 mois (à valider) |
|---|---|---|
| Diffuser les films | Lectures lancées / semaine, taux de lecture terminée | À fixer après 1 mois de données |
| Promouvoir les talents | Pages acteurs/réalisateurs indexées par Google | 100 % des fiches publiées dans le sitemap |
| Visibilité | Impressions Google (Search Console) | Croissance mensuelle |
| Fluidité | LCP / INP / CLS (p75 mobile) | LCP < 2,5 s · INP < 200 ms · CLS < 0,1 |
| Engagement sain | Sessions avec ≥ 2 contenus consultés | À fixer |
| Fiabilité | Disponibilité | ≥ 99,5 % |

## 4. Personas

| Persona | Besoin | Appareil |
|---|---|---|
| **Spectateur** (public, étudiants) | Découvrir et regarder vite, sans compte | Mobile (majorité), débit variable |
| **Créateur INA** (V2) | Montrer ses œuvres, avoir sa fiche | Mobile + PC |
| **Éditeur / Admin E-Ciné** | Publier, modérer, suivre les stats | PC + tablette |
| **Annonceur** (futur) | Placer une publicité propre et mesurée | — |

## 5. Périmètre

**MVP (V1)** : catalogue, lecture HLS sécurisée, fiches acteurs/équipes, actualités/annonces, feed mixte, recherche, contact, compte (e-mail), likes / favoris / reprise de lecture, admin complet, SEO, pages légales, bannière cookies, dark/clair, PWA, sons, i18n prête.

**V2** : commentaires modérés, rôle Créateur (publication par les étudiants), notifications push, publicités, langues supplémentaires.

**Hors périmètre** : téléchargement hors ligne, paiement/abonnement, application native iOS/Android (la PWA suffit), direct live.

## 6. Exigences fonctionnelles

Priorités : **P0** = MVP obligatoire · **P1** = MVP souhaité · **P2** = V2.

### 6.1 Catalogue et lecture (A)

| ID | Exigence | Prio |
|---|---|---|
| FR-001 | Liste des films avec affiche, titre, année, durée, catégories | P0 |
| FR-002 | Page film unique à URL stable `/films/{slug}` : résumé, bande-annonce (si dispo), distribution et équipe (liens vers fiches), lecture | P0 |
| FR-003 | Lecture HLS adaptative (qualité auto + choix manuel), sous-titres, plein écran, vitesse | P0 |
| FR-004 | Reprise de lecture (position sauvegardée) : serveur si connecté, local sinon | P0 |
| FR-005 | Courts-métrages : même modèle que les films avec type `SHORT` et durée max affichée | P0 |
| FR-006 | Bande-annonce lisible sans compte, sans jeton long | P1 |

**Critères d'acceptation FR-003** : démarrage < 3 s sur 4G ; bascule de qualité sans coupure ; aucune URL `.mp4` publique ; manifest et clés inaccessibles sans jeton valide.

### 6.2 Protection des contenus (B)

| ID | Exigence | Prio |
|---|---|---|
| FR-010 | Aucun fichier vidéo téléchargeable via lien direct ; HLS + jetons courts + chiffrement AES-128 | P0 |
| FR-011 | Jeton de lecture lié à la session, durée ≤ 5 min, renouvelé par le lecteur | P0 |
| FR-012 | Limitation du nombre de jetons par IP/session (anti-aspiration) | P0 |
| FR-013 | Filigrane optionnel (identifiant utilisateur discret) pour les films sensibles | P2 |

> Honnêteté produit : aucune protection web n'empêche une capture d'écran ou un enregistrement. L'objectif est de bloquer le téléchargement simple (voir `06-SECURITY.md`).

### 6.3 Personnes : acteurs, réalisateurs, producteurs (C)

| ID | Exigence | Prio |
|---|---|---|
| FR-020 | Fiche `/personnes/{slug}` : photo, biographie, filmographie (auto depuis les crédits), réseaux sociaux | P0 |
| FR-021 | Rôles multiples par personne (acteur, réalisateur, producteur, scénariste…) | P0 |
| FR-022 | Données structurées `Person` pour Google | P0 |

### 6.4 Actualités et annonces (D)

| ID | Exigence | Prio |
|---|---|---|
| FR-030 | Articles `/actualites/{slug}` (type `NEWS` ou `ANNOUNCEMENT`), image, date, auteur | P0 |
| FR-031 | Mise en avant d'un nouveau film depuis un article | P1 |
| FR-032 | Événements d'E-Ciné (date, lieu) | P1 |

### 6.5 Feed de découverte (nouveau)

| ID | Exigence | Prio |
|---|---|---|
| FR-040 | Page d'accueil = **flux vertical** mixant films, courts-métrages, publications photo + texte, actualités | P0 |
| FR-041 | Règle d'ordonnancement : récence + épinglage éditorial + **créneaux « surprise »** (1 contenu sur ~6 hors habitudes) | P0 |
| FR-042 | Pagination par curseur (pas de numéro de page), chargement fluide | P0 |
| FR-043 | Publications photo + texte (`Post`) avec 1 à 10 images, légende, texte alternatif obligatoire | P0 |
| FR-044 | Aperçu court des vidéos dans le feed (muet par défaut, son au tap) | P1 |
| FR-045 | Le feed ne doit **pas** ressembler à un réseau social : pas de compteur d'abonnés, pas de fil de commentaires ouvert dans le feed | P0 |

### 6.6 Présentation (E)

| ID | Exigence | Prio |
|---|---|---|
| FR-050 | Page « À propos » : message de bienvenue, vision, histoire d'E-Ciné | P0 |
| FR-051 | Équipe dirigeante : photos, noms, fonctions (gérées en admin) | P0 |

### 6.7 Recherche (F)

| ID | Exigence | Prio |
|---|---|---|
| FR-060 | Recherche par titre, acteur/personne, catégorie, tolérante aux fautes et aux accents | P0 |
| FR-061 | Suggestions rapides (< 150 ms perçus) ; résultats groupés par type | P0 |
| FR-062 | Recherche PostgreSQL (`pg_trgm` + `unaccent` + full-text français) ; moteur dédié seulement si insuffisant | P0 |

### 6.8 Contact (G)

| ID | Exigence | Prio |
|---|---|---|
| FR-070 | Formulaire (nom, e-mail, sujet, message) validé côté client et serveur, anti-spam | P0 |
| FR-071 | Affichage e-mail, téléphone, réseaux sociaux (depuis `SiteSettings`) | P0 |
| FR-072 | Accusé de réception par e-mail ; message visible dans l'admin | P1 |

### 6.9 Compte, session, état

| ID | Exigence | Prio |
|---|---|---|
| FR-080 | **Connexion requise uniquement pour agir** (like, favori, commentaire, signalement, reprise synchronisée). Après connexion, l'action interrompue est **reprise automatiquement** | P0 |
| FR-081 | Inscription, connexion, mot de passe oublié, vérification d'e-mail | P0 |
| FR-082 | **Déconnexion propre** : révocation du refresh token, effacement des cookies, vidage des caches privés (service worker, stockage local lié au compte) | P0 |
| FR-083 | **Sauvegarde de l'état** : thème, son, langue, position de lecture, brouillons, position dans le feed | P0 |
| FR-084 | Suppression de compte et export des données (droits des personnes) | P0 |

### 6.10 Interactions

| ID | Exigence | Prio |
|---|---|---|
| FR-090 | J'aime, Ma liste (favoris), Reprendre la lecture | P0 |
| FR-091 | Signalement d'un contenu | P1 |
| FR-092 | Commentaires modérés (prémodération au début) | P2 |
| FR-093 | Notifications push | P2 |

### 6.11 Administration (`admin.` ou `/admin`)

| ID | Exigence | Prio |
|---|---|---|
| FR-100 | CRUD films/courts : métadonnées, affiche, bande-annonce, crédits, catégories, SEO, **droits**, état (brouillon/planifié/publié/archivé) | P0 |
| FR-101 | Upload vidéo avec suivi de transcodage et reprise d'envoi | P0 |
| FR-102 | CRUD personnes, articles, annonces, publications du feed, équipe, pages statiques | P0 |
| FR-103 | Gestion des utilisateurs et **rôles** (SUPER_ADMIN, ADMIN, EDITOR, MODERATOR) ; journal d'audit | P0 |
| FR-104 | Statistiques : visites, lectures, top contenus, sources, appareils | P0 |
| FR-105 | Gestion des paramètres du site (contacts, réseaux, bannière) et des redirections | P0 |
| FR-106 | File de modération (signalements, commentaires) | P1 |
| FR-107 | Suppression = **suppression douce** avec confirmation explicite | P0 |
| FR-108 | Gestion des publicités (campagnes, emplacements) | P2 |

### 6.12 Publicités (préparation)

| ID | Exigence | Prio |
|---|---|---|
| FR-110 | Composant `AdSlot` et emplacements nommés, **désactivés par drapeau** en V1 | P0 |
| FR-111 | Espace réservé fixe (aucun saut de mise en page), mention « Sponsorisé » | P0 |
| FR-112 | Respect du consentement (catégorie publicité) | P0 |
| FR-113 | `ads.txt` et CSP adaptables | P1 |

### 6.13 Langues

| ID | Exigence | Prio |
|---|---|---|
| FR-120 | Français obligatoire, routes `/fr/...`, textes dans des fichiers de messages | P0 |
| FR-121 | Ajout d'une langue sans toucher au code des composants ; `hreflang` | P1 |

### 6.14 Pages système et légales

| ID | Exigence | Prio |
|---|---|---|
| FR-130 | Pages : Mentions légales, **Confidentialité (RGPD / Code du numérique RDC)**, **CGU**, Politique cookies | P0 |
| FR-131 | **Bannière cookies** avec refus aussi simple que l'acceptation, préférences modifiables | P0 |
| FR-132 | **Page 404** utile (recherche + un CTA), page 500 et page hors-ligne | P0 |
| FR-133 | Aucun lien cassé (vérification automatique en CI) ; redirections 301 en cas de changement d'URL | P0 |

## 7. Exigences non fonctionnelles

| Domaine | Exigence |
|---|---|
| Performance | LCP < 2,5 s, INP < 200 ms, CLS < 0,1 (p75, mobile 4G). Budget JS initial < 170 Ko gzip. Images AVIF/WebP compressées |
| Fluidité | Navigation instantanée (Instant Navigations de Next.js 16.3), mises à jour optimistes, skeleton **seulement si nécessaire** |
| Sécurité | OWASP Top 10:2025, ASVS niveau 2, ZAP en CI, HTTPS forcé + HSTS, cookies `HttpOnly` `Secure` |
| Accessibilité | WCAG 2.2 AA, contrastes ≥ 4,5:1 (texte) et 3:1 (composants), navigation clavier, `prefers-reduced-motion` |
| SEO | Une URL unique par contenu, balises meta, données structurées, sitemap, robots |
| Fiabilité | Sauvegardes automatiques chiffrées (quotidiennes) hors du VPS, restauration testée chaque mois |
| Compatibilité | Mobile, tablette, PC ; 2 dernières versions de Chrome, Safari, Firefox, Edge ; Android Go toléré |
| Observabilité | Logs structurés, erreurs (Sentry), santé (`/health`), alertes |
| Évolutivité | Pubs, langues, rôle Créateur et commentaires sans refonte |

## 8. Parcours clés

1. **Découverte** : arrivée sur le feed → tape sur un court-métrage → lecture immédiate (sans compte).
2. **Action différée** : appuie sur « J'aime » → feuille de connexion → après connexion, le like est enregistré et l'utilisateur reste au même endroit.
3. **Recherche** : saisit « Kabila » ou une catégorie → résultats groupés → fiche personne → filmographie.
4. **Publication (admin)** : crée un film → upload → transcodage → prévisualisation → planification → publication → apparition dans le feed et le sitemap.
5. **Déconnexion** : un seul geste → session révoquée, données privées effacées de l'appareil.

## 9. Règles UX (psychologie)

Détail dans `skills/ecine-ux-psychology.md`. Principes : une action principale par écran, réduction des choix (loi de Hick), progression visible (reprise de lecture), récompense variable **éthique** (créneaux de surprise), preuve sociale modérée, pas de dark patterns (pas de lecture automatique infinie sans pause, pas de culpabilisation, désinscription aussi facile que l'inscription).

## 10. Risques

| Risque | Impact | Mesure |
|---|---|---|
| Bande passante du VPS insuffisante | Lecture saccadée, coûts | CDN devant les segments ; débits adaptés ; mesurer dès la phase 2 |
| Droits d'auteur sur les films | Juridique | Champ « droits » obligatoire, procédure de retrait dans les CGU |
| Piratage | Perte de contrôle | Protection en couches + filigrane V2 + retrait rapide |
| Connexion lente des utilisateurs | Abandon | Qualité de départ basse, PWA, images légères |
| Failles dans les dépendances (Next.js publie des correctifs fréquents) | Sécurité | Veille et mise à jour sous 48 h pour les critiques |
| Absence d'autorité de protection des données formellement établie en RDC (à vérifier) | Conformité | Appliquer les principes du Code du numérique + RGPD par prudence |
| Dépendance à un seul VPS | Disponibilité | Sauvegardes, procédure de restauration, supervision |

## 11. Définition de « terminé » (globale)

Une fonctionnalité est terminée si : critères d'acceptation validés · tests passés · accessibilité vérifiée · contraste vérifié · responsive (mobile, tablette, PC) vérifié · SEO (si page publique) vérifié · aucun `console.error` · ajouté à la documentation · **validée par le propriétaire du produit**.
