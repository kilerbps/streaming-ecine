# Journal des modifications

## [Non publié] — 2026-10-15 · Refonte « Nuit de Kin », lot 3 (en cours)

### Ajouté

- Données de l'accueil et du catalogue (ADR-0012) : langues, lieu de tournage, titre dessiné, accroche, date de sortie, fin de disponibilité ; lecture bloquée avant la sortie.
- Images : couleur dominante, aperçu flou, point focal et recadrages par ratio, calculés à l'envoi (`pnpm --filter @ecine/api images:backfill` pour l'existant).
- Accueil en rangées (`GET /v1/home`) :
  - affiche à la une programmée, sinon les 5 derniers films ;
  - Reprendre, Top 10, Nouveautés, Courts-métrages, Bientôt, Talents à l'honneur, rangées éditoriales, catégories, chacune sous son seuil ;
  - fin de page « Ouvrir Découvrir ».
- Administration : écran `/admin/accueil` (affiche à la une, rangées éditoriales, talents à l'honneur, rangées automatiques et Top 10 en lecture seule).
- Recherche v2 : vignettes « Explorer par catégorie » (`/v1/categories` donne le nombre de titres et une image), talents, recherches récentes de l'appareil, suggestions avec vignettes au clavier.
- Fiche film v2 : scène 4:5 / 16:9, bouton unique Regarder ou Reprendre avec temps restant, rangée d'actions, langues, distribution, « Vous aimerez aussi », détails.
- Fiche talent v2, Moi v2 (avatar, rangées, lignes de réglages), cartes v2 partout (catalogues, actualités, talents, Reprendre, fil Découvrir).
- Aperçu rapide : toucher une affiche de l'accueil ouvre une feuille (route interceptée `/fr/films/{slug}/apercu`) ; une visite directe affiche la fiche.
- Nouveautés `/fr/nouveautes` : Bientôt (rappel « Me le rappeler », e-mail le jour de la sortie), Événements (fichier `.ics`), Actualités ; rangée « Mes rappels » dans Moi.
- Mesure : `home_row_impression`, `home_row_click`, `preview_open`, `reminder_set`.
- Réglages v2 :
  - groupes Affichage, Sons et vibrations, Données et performances, Lecture, Notifications, Goûts, Profil, Sécurité, Mes données ;
  - Lecture : qualité préférée (avec les données consommées par heure) et sous-titres (langue par défaut, taille) ;
  - aperçus automatiques activables.
- Double authentification : QR code, clé pour la saisie manuelle, 10 codes de secours à usage unique (copie, téléchargement, renouvellement), désactivation avec mot de passe et code. La connexion accepte un code de secours (ADR-0014).
- Feuille de connexion v2 : titre qui dit pourquoi la connexion est demandée, bouton Afficher le mot de passe, inscription dans la même feuille avec compteur « 7 sur 12 caractères », erreurs à la sortie du champ, panneau de 440 px sur PC.
- Choix des goûts « Qu'aimez-vous regarder ? » (R-ENG-11) : au retour sur l'accueil après 10 minutes d'un premier film, trois genres pré-choisis (ceux du film, complétés par les catégories les plus fournies), « Valider » et « Plus tard » de même poids ; « Plus tard » repousse de 7 jours, une seule fois. Cookie `ecine_tastes_prompt` (ADR-0014).
- Aperçus vidéo automatiques (D-12, ADR-0015) sur l'affiche à la une (emplacement programmé avec « Aperçu vidéo ») et dans l'aperçu rapide :
  - extrait statique de 14 s au passage choisi en administration (« Début de l'aperçu »), 240p, muet, logo E-Ciné en filigrane, environ 0,6 Mo, généré par le worker et servi sans jeton sous `/media/previews/` (cache d'un an) ;
  - démarrage après 1 s de visibilité, 5 par visite au plus, arrêt hors de l'écran ou onglet masqué, bouton pause ; l'affiche à la une attend la fin de l'aperçu ;
  - seulement avec le réglage actif, hors mode allégé, économie de données et mouvement réduit, en 4G ou Wi-Fi détectés ; réseau inconnu (iPhone) : après 2 s, un seul par écran.
- Limites de débit par identité (ADR-0015) : par compte, appareil vérifié (Turnstile invisible sur la fiche) ou appareil neuf, avec un pot commun des appareils neufs et un plafond par IP selon le réseau (RDC, autres, hébergeurs ; bases DB-IP Lite, `pnpm --filter @ecine/api geo:update`). Mode observation au lancement (`RATE_LIMIT_MODE=observe`). Le lecteur réessaie seul après un refus, avec un compte à rebours, ou vérifie l'appareil.
- Relais signé du site vers l'API (HMAC horodaté) et cookie d'appareil signé, à la place de la clé de service statique.
- Lecture : listes sans jeton pour hls.js, la clé AES n'est demandée qu'une fois par session.

### Modifié

- Erreur d'adresse e-mail qui dit quoi corriger, avec un exemple (« L’adresse doit contenir « @ ». Exemple : grace@gmail.com »).
- Le fil vertical quitte l'accueil : il reste dans l'onglet Découvrir jusqu'au lot 4.
- L'onglet Nouveautés mène à `/fr/nouveautes` (les articles restent sous `/fr/actualites`).
- Seuil des rangées de l'accueil : 4 titres (ADR-0013).

### Corrigé

- Revalidation : les étiquettes à tiret (`whats-new`) étaient refusées et faisaient rejeter tout le lot.
- Développement : Next.js n'écrit plus les arguments des actions serveur (dont les mots de passe) dans le terminal.

## [Non publié] — 2026-10-09 · Refonte « Nuit de Kin », lot 2 (coquille native)

### Ajouté

- Barre d'onglets flottante (Accueil, Découvrir, Nouveautés, Moi) et bouton Recherche détaché sous 1 056 px :
  - lentille qui glisse en ressort ;
  - rétraction au défilement, masquée quand le clavier est ouvert ;
  - retour en haut au second toucher ;
  - pastille rouge sur Nouveautés ;
  - mémoire de défilement par onglet.
- Navigation haute sur PC, transparente puis en matériau ; le rail latéral public est retiré.
- En-tête mobile qui s'efface au défilement, pastilles Films, Courts-métrages et Catégories sur l'accueil, grand titre réduit dans l'en-tête.
- Route `/fr/decouvrir` (fil actuel, en attendant le lot 4). Nouveautés mène aux actualités jusqu'au lot 3.
- Réglages séparés :
  - thème Nuit, Jour ou Automatique ;
  - vibrations ;
  - son au lancement d'un film ;
  - sons de l'interface, coupés par défaut ;
  - mode allégé Automatique, Activé ou Désactivé, détecté avant l'affichage ;
  - économie de données reprise de l'en-tête `Save-Data`.
- Couleur de la barre du navigateur rendue côté serveur.
- Skeleton à la forme de l'écran pour chaque route.
- Touche retour d'Android qui ferme d'abord la feuille ou le menu ouvert.
- Tirer pour rafraîchir sur l'accueil et les actualités.
- Transitions de page sous `NEXT_PUBLIC_VIEW_TRANSITIONS` (désactivées par défaut).
- Application installable :
  - invitation à la 2e visite ou après un film terminé ;
  - feuille d'instructions pour iPhone ;
  - raccourcis du manifeste ;
  - icônes et écrans de démarrage générés depuis le logo (`pnpm brand:build`).
- Pages 404, erreur et hors ligne illustrées avec le logo ; motifs textiles retirés (D-13).
- Tests : `e2e/coquille.spec.ts` et mesure de fluidité `e2e/perf/fluidite.spec.ts` (porte G2).

### Corrigé

- Matériau translucide sans flou dans Chrome : Lightning CSS ne gardait que `-webkit-backdrop-filter`.
- 404 et redirections réelles préservées malgré les skeletons (décision prise avant tout streaming).
- Débordement horizontal de `/design` sur mobile.

### Connu

- Porte G2 non atteinte en laboratoire (42 à 52 images/s au défilement, 21 à 44 à l'ouverture d'une feuille) sur une machine de mesure trop chargée ; voir `docs/design/base-2026-10.md`.

## [Non publié] — 2026-10-08 · Refonte « Nuit de Kin », lot 1 (fondations)

### Modifié

- Jetons v2 « Nuit de Kin » (`packages/design-tokens/tokens.css`) :
  - neutres bleu nuit (Nuit `#0A0F16`, Jour `#F5F7FA`) ;
  - bleu du logo pour agir, rouge pour signaler ;
  - rayons de 4 à 24 px, ombres réservées aux couches flottantes, matériau translucide pour la navigation avec repli plein ;
  - durées, courbes et deux ressorts générés.

  La v2 remplace directement la v1 (pré-lancement). `contrast-pairs.json` passe à 32 paires, toutes conformes.

- Polices : IBM Plex retirée, remplacée par la police du système et Archivo 700/800 (35 Ko au lieu de 116 Ko).
- Icônes : jeu Solar (480 Design, CC BY 4.0) généré au build sans appel réseau, à la place des 64 icônes maison. API de `<Icon>` inchangée. Coordonnées arrondies au centième pour alléger le JavaScript.
- Primitives restylées :
  - bouton : variantes `on-image` et `danger`, état « en cours » qui garde le libellé ;
  - feuille glissable avec points d'arrêt ;
  - notification avec action « Annuler » ;
  - champs, étiquette, état vide, skeletons aux formes exactes ;
  - couleur de la barre du navigateur tirée de `--bg`.
- Zones d'image toujours en Nuit, quel que soit le thème (décision du 8 octobre 2026, porte G1) : voiles sombres, texte et boutons blancs sur l'affiche à la une et le haut des fiches.
- `docs/05-DESIGN-SYSTEM.md` v2 ; ADR-0011 (amende l'ADR-0003) ; `docs/licences.md` à jour.

### Ajouté

- Primitives : bouton icône, badge à coin coupé, pastille, contrôle segmenté, interrupteur, champ de recherche, barre de progression, image avec couleur dominante et point focal, tuiles (affiche, paysage, Top 10, portrait), rangée, affiche à la une, menu contextuel et bouton « … », illustrations construites avec le logo.
- Page `/design` (non indexée ; ouverte en développement, avec `DESIGN_PAGE_ENABLED` ou pour l'équipe) : chaque composant dans ses états, avec une barre d'outils Nuit/Jour, mode allégé, économie de données, mouvement réduit.
- Captures de référence de `/design` avec audit axe, en mobile et PC, dans les 4 modes (`E2E_CAPTURES=1`, `e2e/design`).
- Contrôles `pnpm check:tokens` (aucune valeur en dur) et `pnpm check:icons` (Solar seul, icônes à jour), ajoutés à la CI ; `check:gradient` passe en liste blanche (`--scrim-bottom`, `--scrim-top`, `.ambient`).
- Générateurs `pnpm tokens:springs` et `pnpm icons:build`.
- Attribution des icônes : `THIRD_PARTY_NOTICES.md`, section « Crédits » des pages À propos et Mentions légales.
- Mesure après le lot 1 dans `docs/design/base-2026-10.md` : JavaScript +7 % (limite +10 %), poids total en baisse de 55 Ko par page.

## [Non publié] — 2026-10-08 · Refonte « Nuit de Kin », lot 0 (mesure et cadrage)

### Ajouté

- Dossier de la refonte importé : `docs/AGENTS-REFONTE.md` (guide des lots, adapté au pré-lancement) et `docs/design/` (PRD, benchmark, charte, expérience native, écrans, administration, sources). Les décisions D-01 à D-14 sont validées par le propriétaire.
- Mesure de la refonte : 16 types d'événements, avec provenance, valeur numérique et session de navigation aléatoire (migration `20261008090000_analytics_source_value_session`). Branchés :
  - session ;
  - lancement de lecture (avec sa source), temps jusqu'à la première image, progression toutes les 10 s, achèvement à 90 % ;
  - ouverture et réussite de la connexion à la demande (avec la raison) ;
  - ajout à Ma liste, J'aime, installation de l'application.
- Profil d'appareil de référence dans Playwright (`android-ref` : processeur ×4, 4G lente) et mesure de laboratoire sur 5 pages (`e2e/perf`).
- Base de laboratoire `docs/design/base-2026-10.md` : LCP de 2,4 à 3,3 s, blocage de 0,7 à 1,3 s, 305 Ko de JavaScript et 116 Ko de polices.

### Modifié

- Lighthouse CI :
  - 5 pages au lieu d'une ;
  - catégories accessibilité, SEO et bonnes pratiques de nouveau évaluées ;
  - budgets TBT, JavaScript (base + 10 %) et polices (45 Ko).

## [Non publié] — 2026-10-07

### Modifié

- E-Ciné devient une plateforme **privée et indépendante, gratuite et ouverte à tous**, sans lien avec l'INA. Nouveau slogan : « Le cinéma congolais, en streaming. » (titre, description, application installée, images de partage, PRD et documentation).
- Transcodage : palier **144p**, audio à 64 kbit/s jusqu'en 360p, **segments de 4 s** (ADR-0006, évolution du 7 octobre). Les vidéos existantes sont à retranscoder (`demo-video.js --all` en développement).
- `Media.bytes` passe en entier 64 bits (migration `20261007120000_media_bytes_bigint`) : la taille des sources de plus de 2 Gio est enregistrée exactement.

### Ajouté

- Lecteur adapté aux réseaux instables :
  - débit de départ estimé ;
  - tampon adapté à l'appareil ;
  - chargement visible et explication en cas de blocage ;
  - bandeau « Pas de connexion » ;
  - **reprise automatique après une coupure** ;
  - partie chargée sous la barre de progression ;
  - « Auto (360p) » et consommation par heure de chaque qualité ;
  - choix de qualité mémorisé ;
  - changement de qualité sans interruption.
- `global-error.tsx` : page d'erreur quand un layout racine échoue.
- Script `demo-video.js` : options `--all` et `--seconds`.
- Analyse de ce qui reste à faire (`docs/12-ANALYSE-RESTE-A-FAIRE.md`) et ADR-0010 (stockage objet Cloudflare R2 + CDN, accepté).
- Tests : configuration de production de l'API et du site, réglages réseau du lecteur, E2E de lecture en 3G simulée et après coupure.

### Corrigé

- Après une erreur réseau, le lecteur affichait « la lecture reprendra dès que possible » sans jamais reprendre ; un appel hors connexion bloquait le démarrage.
- Sauvegardes : `pipefail` (un échec de `pg_dump` produisait une sauvegarde chiffrée vide jugée réussie) ; le test de restauration accepte un fichier de configuration local (`BACKUP_ENV`).

### Sécurité

- En production, l'API refuse le pilote d'e-mail `log` (liens de réinitialisation dans les journaux), l'adresse d'expédition factice, l'absence de `REVALIDATE_URL` et les URL publiques en HTTP.
- Le site active les cookies sécurisés par défaut en production et refuse `COOKIE_SECURE=false` sur Vercel en production ; règle unique partagée par `proxy.ts`.

## [Non publié] — 2026-10-02

### Ajouté

- Monorepo pnpm/Turborepo : `apps/web` (Next.js 16.3), `apps/api` (NestJS 12), `packages/contracts`, `packages/design-tokens`, `packages/config`.
- API : configuration validée au démarrage, erreurs RFC 9457, journaux pino sans données personnelles, Helmet, CORS en liste blanche, limites de débit Redis (repli prudent), OpenAPI (hors production), `/health`.
- Authentification complète : inscription, connexion, refresh tournant avec détection de rejeu, déconnexion propre, mot de passe oublié, vérification d'e-mail, 2FA TOTP, export et suppression du compte.
- Contenus publics : feed avec créneaux « surprise », films, courts-métrages, catégories, talents, actualités, publications, pages, équipe, recherche tolérante aux fautes et aux accents.
- Interactions : j'aime, Ma liste, reprise de lecture, signalements, connexion à la demande avec reprise de l'action.
- Lecture vidéo sécurisée : transcodage FFmpeg HLS AES-128, jetons de 5 min, playlists réécrites, quotas anti-aspiration, lecteur hls.js (qualité, vitesse, sous-titres, plein écran, clavier).
- Administration (API) : CRUD complet, contrôles de publication, planification, suppression douce, rôles, audit, statistiques, modération, redirections automatiques.
- Médias : images ré-encodées (sharp, EXIF supprimé), envoi vidéo reprenable par morceaux.
- Site : design system (tokens, IBM Plex, sombre/clair sans flash), navigation mobile en onglets et rail sur PC, sons et haptique désactivables, bannière cookies conforme, pages légales structurées, SEO (métadonnées, JSON-LD, sitemap, robots, hreflang), 404/erreur/hors ligne, PWA (manifeste, service worker).
- Qualité : tests unitaires (API, contrats, web), tests E2E Playwright des parcours du PRD avec axe, CI GitHub Actions, Dependabot, contrôles dégradé et contraste.
- Infrastructure : Compose de production durci, Caddy HTTPS/HSTS, scripts de sauvegarde chiffrée et de test de restauration.
- Interface d'administration `/admin` : tableau de bord, films (envoi vidéo reprenable, suivi du transcodage, contrôles avant publication, planification, suppression avec saisie du titre), talents et crédits, actualités (aperçu Markdown), publications du feed, catégories, équipe, pages, redirections, signalements, messages, utilisateurs et rôles, paramètres, journal, statistiques et export CSV.
- Images de partage Open Graph 1200×630, favicon multi-tailles, mesure des pages vues soumise au consentement, signalement de contenu.
- Documentation : ADR 0001 à 0009, guide d'administration, guide d'exploitation, compte rendu de recette, licences.

### Sécurité

- Formulaires sensibles forcés en POST (aucun mot de passe dans l'URL avant chargement du JavaScript), cookies serveur en HttpOnly, CSP complète sur toutes les réponses de l'API — corrections issues du scan ZAP.
