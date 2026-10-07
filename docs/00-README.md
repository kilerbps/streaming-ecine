# E-Ciné — Dossier de conception (à donner à l'IA)

> Plateforme congolaise de streaming et de culture cinéma, privée et indépendante (« Le cinéma congolais, en streaming. »).
> Dossier généré le **2 octobre 2026**. Les versions et liens ont été vérifiés à cette date (voir `11-LIENS-DOCS.md`).

## 1. Contenu du dossier

| Fichier | Rôle | Qui le lit |
|---|---|---|
| `00-README.md` | Index, décisions à valider, outils à connecter | Toi |
| `01-PRD.md` | Cahier des charges produit complet (exigences, user stories, critères d'acceptation) | IA + humain |
| `02-ARCHITECTURE.md` | Stack, flux de données, déploiement Vercel + VPS, streaming | IA |
| `03-DATA-MODEL.md` | Schéma Prisma 7 / PostgreSQL, règles de source de vérité | IA |
| `04-API-SPEC.md` | Conventions et endpoints de l'API NestJS (hors frontend) | IA |
| `05-DESIGN-SYSTEM.md` | Identité, tokens dark/clair, style Carbon, sons, loader, anti « look IA » | IA + designer |
| `06-SECURITY.md` | OWASP Top 10:2025, protection du streaming, durcissement VPS, ZAP | IA |
| `07-CHECKLIST-SEO-LEGAL-QUALITE.md` | Ta liste « à ne pas oublier » transformée en tâches testables | IA + QA |
| `08-BONNES-PRATIQUES.md` | Conventions de code, tests, Git, revue | IA |
| `09-AGENTS.md` | **Règles de comportement de l'IA** (demander avant d'agir) | IA (à la racine du repo) |
| `10-ROADMAP-TACHES.md` | Phases, tâches, critères de sortie, prompts de démarrage | Toi + IA |
| `11-LIENS-DOCS.md` | Liens officiels à jour, classés | IA |
| `skills/*.md` | 15 compétences réutilisables (un fichier = un domaine) | IA |

## 2. Comment l'utiliser avec une IA de code

1. Crée le repo, copie ce dossier dans `/docs`, et **copie `09-AGENTS.md` à la racine sous le nom `AGENTS.md`** (et `CLAUDE.md` si tu utilises Claude Code, avec le même contenu).
2. Copie `skills/` dans `/docs/skills` (ou `.claude/skills` si ton outil le supporte).
3. Démarre chaque session avec : *« Lis AGENTS.md, puis docs/01-PRD.md et la phase en cours dans docs/10-ROADMAP-TACHES.md. Pose-moi tes questions avant de coder. »*
4. Travaille **une phase à la fois**. L'IA ne passe à la suivante que si les critères de sortie sont validés par toi.

## 3. Stack retenue (versions vérifiées le 02/10/2026)

| Couche | Choix | Remarque |
|---|---|---|
| Frontend | **Next.js 16.3.x** (App Router, React 19) sur **Vercel** | Rester sur le dernier patch : des correctifs de sécurité sortent régulièrement |
| Backend | **NestJS 12** (ESM) sur **VPS** | NestJS 12 est sorti en août 2026 ; fallback possible : 11.x LTS si un package n'est pas compatible ESM |
| ORM | **Prisma 7** (`prisma.config.ts`, générateur `prisma-client`, adapter `pg`) | Prisma Next/8 est annoncé : **ne pas migrer** sans ta validation |
| Base | **PostgreSQL** (dernière version stable supportée) | Source de vérité unique |
| Cache / files | **Redis** | Cache dérivé, rate limit, sessions révocables, files BullMQ |
| Vidéo | **HLS** (FFmpeg) + URLs signées + chiffrement AES-128 | Voir `02` et `06` |

## 4. Mon interprétation de tes exigences ambiguës (à confirmer)

1. **« Le front ne fetch pas, il reçoit les données »** → les composants React n'appellent jamais l'API eux-mêmes (`fetch` dans un `useEffect`, SWR, etc. = interdit). Les **Server Components** reçoivent les données du serveur et les passent en props ; les actions (like, commentaire…) passent par des **Server Actions** ; la pagination du feed est servie par une Server Action. Seuls les segments vidéo sont chargés directement par le lecteur.
2. **« Une donnée = une source de vérité »** → PostgreSQL possède chaque donnée. Redis et le front ne sont que des copies jetables. Pas de compteur dupliqué sans règle de recalcul (voir `03`).
3. **« Un seul CTA »** → **un seul bouton principal par écran** (les autres actions sont secondaires : lien texte ou bouton discret).
4. **« Pas de dégradé »** → aucun `linear-gradient`/`radial-gradient`, ni dans les fonds, ni sur les affiches, ni dans les skeletons (pas de shimmer : pulsation d'opacité).
5. **« Courts maitrage »** → **courts-métrages**. Le feed mélange films, courts-métrages, publications photo + texte et actualités.
6. **« Pas une application muette »** → sons d'interface et retours haptiques, **désactivables** (voir `05`).

## 5. Questions ouvertes (réponds-y avant la Phase 1)

| # | Question | Défaut que l'IA appliquera si tu ne réponds pas |
|---|---|---|
| Q1 | Peux-tu fournir le **logo E-Ciné** (SVG/PNG) ? Quelles sont leurs couleurs ? | Palette provisoire de `05` (terre cuite + encre) |
| Q2 | **Qui publie ?** Seulement l'équipe E-Ciné, ou aussi des étudiants (créateurs vérifiés, avec modération) ? | Équipe seule en V1 ; rôle `CREATOR` prévu en V2 |
| Q3 | **Où stocker les vidéos ?** Caractéristiques du VPS (CPU, RAM, disque, **bande passante mensuelle**, localisation) ? | VPS en Europe + CDN devant les segments dès que possible |
| Q4 | Le visionnage est-il **libre sans compte** ? | Oui ; compte requis seulement pour les actions |
| Q5 | As-tu les **autorisations/cessions de droits** pour chaque film ? Y a-t-il des films de tiers ? | Champ « droits » obligatoire par film dans l'admin |
| Q6 | **Publicités** : quand et via quel réseau (AdSense, Ad Manager, sponsors directs) ? | Architecture prête, aucune pub en V1 |
| Q7 | **Langues** supplémentaires : anglais, lingala, swahili, kikongo, tshiluba ? | Français seul, i18n prête |
| Q8 | **Nom de domaine** (`e-cine.cd` ? `.com` ?) | Placeholder `e-cine.example` |
| Q9 | **Connexion** : e-mail + mot de passe seulement, ou aussi Google / numéro de téléphone (OTP) ? | E-mail + mot de passe, Google en option |
| Q10 | **E-mails/SMS transactionnels** : quel prestataire (Resend, Brevo…) ? | Resend (e-mail) |
| Q11 | **Statistiques** : outil interne ou Umami auto-hébergé sur le VPS ? | Événements internes + Umami en option |
| Q12 | **Notifications push** (PWA) en V1 ? | Non, V2 |

## 6. Outils à connecter (dis-moi lesquels tu peux brancher)

Je n'ai accès, dans cette conversation, qu'aux outils déjà branchés ici. Pour les phases suivantes, ces connexions te feront gagner du temps :

| Outil | Pourquoi | Priorité |
|---|---|---|
| **GitHub** | Repo, PR, Actions CI (tests, ZAP, Lighthouse, vérif des liens) | Haute |
| **Vercel** | Déploiements de prévisualisation, variables d'environnement | Haute |
| **Figma** (ou dossier d'images) | Maquettes et logo | Moyenne |
| **Sentry** | Suivi des erreurs front et API | Moyenne |
| **Cloudflare** | DNS, Turnstile (anti-spam), CDN/R2 pour la vidéo | Moyenne |
| **Accès SSH au VPS** | **À ne pas donner à une IA.** Déploie via CI avec une clé dédiée à droits limités | — |

> Ne colle jamais de secrets (clés API, mots de passe, clés SSH) dans une conversation avec une IA. Utilise des variables d'environnement.
