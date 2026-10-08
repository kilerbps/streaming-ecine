# Journal des modifications

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
