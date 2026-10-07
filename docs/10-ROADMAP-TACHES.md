# 10 — Roadmap et tâches

Principe : **une phase à la fois**. L'IA ne passe à la suivante qu'après validation des critères de sortie par le propriétaire. Les durées sont indicatives (un développeur + IA).

## Phase 0 — Cadrage (2–3 jours)

- [ ] Répondre aux questions Q1–Q12 (`00-README.md`)
- [ ] Fournir le logo et valider la palette (`05` §3)
- [ ] Choisir domaine, hébergeur du VPS, prestataire e-mail
- [ ] Lister les 5 premiers films/courts et prouver les droits
- [ ] Créer le dépôt, brancher GitHub/Vercel, copier `/docs` + `AGENTS.md`

**Sortie** : questions closes, ADR-0001 (stack) validé, accès prêts.

## Phase 1 — Fondations (1–2 semaines)

- [ ] Monorepo pnpm/Turborepo, TypeScript strict, ESLint/Prettier, hooks, CI (lint, types, tests, build)
- [ ] `apps/api` NestJS 12 : config validée, Prisma 7 + PostgreSQL, Redis, Helmet, throttler, erreurs RFC 9457, `/health`, OpenAPI
- [ ] `apps/web` Next.js 16.3 : layout, `proxy.ts`, i18n `fr`, tokens sombre/clair, `/design`
- [ ] `packages/contracts` (Zod) et `design-tokens`
- [ ] Auth complète (inscription, vérification, connexion, refresh tournant, déconnexion, mot de passe oublié)
- [ ] Déploiement staging : Vercel Preview + VPS (Docker Compose + Caddy, HTTPS forcé), sauvegarde quotidienne
- [ ] Scripts `check:gradient`, `check:contrast`, `check:links`

**Sortie** : un utilisateur peut s'inscrire, se connecter et se **déconnecter proprement** sur staging en HTTPS ; CI verte ; ZAP baseline sans alerte moyenne.

## Phase 2 — Contenu et lecture (2–3 semaines)

- [ ] Modèles Film/Personne/Catégorie/Crédit/Media ; admin minimal pour les créer
- [ ] Upload + pipeline FFmpeg + HLS chiffré + jetons de lecture (`02` §8, `06` §6)
- [ ] Lecteur (hls.js) : qualité auto/manuelle, sous-titres, reprise, plein écran, clavier
- [ ] Pages `/films`, `/films/{slug}`, `/personnes/{slug}`, catégories
- [ ] Images : compression `sharp`, `next/image`, `alt` obligatoire
- [ ] Mesure réelle de la bande passante/CPU du VPS → décision CDN (ADR)

**Sortie** : un film se lit en HLS sur mobile 4G ; aucun `.mp4` accessible ; clés refusées sans jeton ; test d'aspiration → 429.

## Phase 3 — Feed et interactions (2 semaines)

- [ ] Feed mixte (films, courts, posts photo + texte, actualités), curseur, créneaux « surprise »
- [ ] Likes, Ma liste, reprise de lecture ; **connexion à la demande** avec reprise de l'action
- [ ] Mises à jour optimistes ; états sauvegardés (thème, son, langue, position)
- [ ] Sons et haptique (`05` §8) ; loader fourni
- [ ] Recherche (pg_trgm + full-text FR) avec suggestions
- [ ] Contact (anti-spam complet)

**Sortie** : parcours PRD §8 (1 à 3, 5) validés en E2E mobile et PC ; fluidité mesurée (INP < 200 ms).

## Phase 4 — Administration complète (2 semaines)

- [ ] CRUD complet (films, personnes, articles/annonces, posts, équipe, pages, catégories, redirections)
- [ ] Planification, brouillons, suppression douce + confirmation
- [ ] Utilisateurs et rôles, 2FA admin, journal d'audit
- [ ] Statistiques (visites, lectures, top contenus, appareils, sources)
- [ ] File de modération (signalements)
- [ ] **Guide d'utilisation de l'admin** (livrable)

**Sortie** : un éditeur non technique publie film + acteur + actualité sans aide ; chaque action est auditée.

## Phase 5 — SEO, légal, sécurité, qualité (1–2 semaines)

- [ ] Métadonnées, OG images, favicon, JSON-LD, sitemap, robots, hreflang
- [ ] Pages légales (structure + validation juridique), bannière cookies, consentement tracé
- [ ] 404/500/hors-ligne, redirections, lychee propre
- [ ] ZAP authentifié + revue OWASP Top 10:2025 + test BOLA/BFLA
- [ ] Lighthouse CI aux seuils, axe, contraste, tests d'appareils réels
- [ ] Sauvegarde + **restauration testée**

**Sortie** : toute la section A de `07` cochée avec preuves.

## Phase 6 — App-like et finition (1 semaine)

- [ ] PWA (manifeste, service worker, installation, hors-ligne propre, mise à jour)
- [ ] Navigation mobile en barre d'onglets, gestes, `safe-area`, transitions
- [ ] Motifs artistiques validés par le propriétaire, réglages (sons, thème, économie de données)
- [ ] Optimisation des performances sur Android d'entrée de gamme

**Sortie** : installation sur l'écran d'accueil, sensation d'application validée par 5 testeurs réels.

## Phase 7 — Lancement

- [ ] Bascule DNS, HTTPS/HSTS vérifiés, Search Console, supervision et alertes
- [ ] Plan de retour arrière, plan d'incident, contacts
- [ ] Formation de l'équipe d'administration

## Phase 8 — Après lancement (V2)

Commentaires modérés · rôle Créateur (étudiants) · notifications push · **publicités** (`skills/ecine-ads-ready.md`) · langues supplémentaires · filigrane · DRM si nécessaire.

---

## Prompts de démarrage (à copier)

**Début de session**
> Lis `AGENTS.md`, `docs/01-PRD.md` et la phase en cours dans `docs/10-ROADMAP-TACHES.md`. Résume en 10 lignes ce que tu vas faire, liste tes questions (max 3) avec options et recommandation, puis attends ma réponse avant de coder.

**Démarrer une tâche**
> Charge `docs/skills/<compétence>.md`. Vérifie dans la documentation officielle (`docs/11-LIENS-DOCS.md`) les API que tu comptes utiliser. Propose un plan, puis implémente par petites étapes avec tests.

**Fin de tâche**
> Vérifie la définition de « terminé » (`AGENTS.md` §5). Donne la preuve (commandes, captures mobile/PC, sombre/clair). Liste ce qui n'est pas testé. Mets à jour la doc.

**Revue de sécurité**
> Passe en revue la fonctionnalité contre `docs/06-SECURITY.md` §2 (OWASP Top 10:2025). Écris les tests « sans jeton / mauvais rôle / mauvais propriétaire ». Ne corrige rien en silence : liste les écarts.
