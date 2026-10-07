# Journal des modifications

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
