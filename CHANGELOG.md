# Journal des modifications

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
