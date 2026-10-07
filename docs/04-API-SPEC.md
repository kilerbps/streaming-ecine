# 04 — Spécification de l'API (NestJS, hors frontend)

## 1. Conventions

| Sujet | Règle |
|---|---|
| Base | `https://api.e-cine.*/v1` — versionnée dans l'URL |
| Format | JSON UTF-8. Dates ISO 8601 UTC |
| Contrat | Schémas Zod dans `packages/contracts`, OpenAPI généré |
| Authentification | Cookies `HttpOnly; Secure; SameSite=Lax` (access JWT court 10–15 min + refresh tournant 30 j). Les Server Actions Next.js transmettent les cookies |
| CSRF | Jeton anti-CSRF sur les mutations (double soumission signée) en plus de `SameSite` ; vérification de `Origin` |
| Autorisation | Guards `Roles` + vérification de propriété dans le **service** (jamais seulement dans le contrôleur) |
| Erreurs | RFC 9457 : `{ type, title, status, detail, instance, errors? }` — jamais de trace de pile |
| Pagination | Curseur : `?limit=20&cursor=…` → `{ items, nextCursor }`. `limit` max 50 |
| Tri/filtres | Liste blanche de champs ; jamais d'accès direct à la base par paramètre |
| Idempotence | En-tête `Idempotency-Key` sur les créations sensibles (inscription, contact, upload) |
| Limitation de débit | En-têtes `RateLimit-*` ; 429 + `Retry-After` |
| Cache | `ETag` + `Cache-Control` sur les lectures publiques ; Redis en dessous |
| Langue | `Accept-Language` ou `?locale=` ; repli sur `fr` |
| Santé | `GET /health` (base, Redis) — sans détail sensible |
| Observabilité | `X-Request-Id` propagé dans les logs |

## 2. Rôles

`PUBLIC` · `MEMBER` · `CREATOR` (V2) · `MODERATOR` · `EDITOR` · `ADMIN` · `SUPER_ADMIN`

## 3. Endpoints

### Public (lecture)

| Méthode | Route | Accès | Notes |
|---|---|---|---|
| GET | `/feed` | PUBLIC | Curseur ; mélange films, courts, posts, articles ; créneaux surprise |
| GET | `/films` | PUBLIC | Filtres : `kind`, `category`, `year`, `q` |
| GET | `/films/{slug}` | PUBLIC | Détail + crédits + catégories |
| GET | `/people/{slug}` | PUBLIC | Détail + filmographie |
| GET | `/articles` · `/articles/{slug}` | PUBLIC | `kind` = NEWS/ANNOUNCEMENT/EVENT |
| GET | `/posts/{id}` | PUBLIC | Publication photo + texte |
| GET | `/categories` | PUBLIC | |
| GET | `/search?q=` | PUBLIC | Groupé par type ; limité en débit |
| GET | `/pages/{slug}` | PUBLIC | À propos, légales |
| GET | `/team` | PUBLIC | Équipe dirigeante |
| GET | `/site-settings` | PUBLIC | Contacts, réseaux, `adsEnabled` |
| GET | `/sitemap-data` | Interne | Utilisé par `app/sitemap.ts` ; clé de service |

### Lecture vidéo

| Méthode | Route | Accès | Notes |
|---|---|---|---|
| POST | `/playback/{videoId}/session` | PUBLIC (limité) | Vérifie que le film est publié ; renvoie `{ manifestUrl, token, expiresAt }` |
| POST | `/playback/{videoId}/refresh` | Jeton valide | Renouvelle sans nouvelle autorisation lourde |
| GET | `/playback/keys/{keyId}` | Jeton valide | Clé AES ; **rate limit strict** ; `Cache-Control: no-store` |

### Compte et session

| Méthode | Route | Accès |
|---|---|---|
| POST | `/auth/register` | PUBLIC (anti-spam) |
| POST | `/auth/verify-email` | PUBLIC (jeton) |
| POST | `/auth/login` | PUBLIC (limité, verrouillage progressif) |
| POST | `/auth/refresh` | Cookie refresh |
| POST | `/auth/logout` | MEMBER — révoque la famille de sessions |
| POST | `/auth/forgot-password` · `/auth/reset-password` | PUBLIC |
| GET | `/me` | MEMBER |
| PATCH | `/me` | MEMBER (nom, langue, préférences) |
| GET | `/me/export` | MEMBER — export des données |
| DELETE | `/me` | MEMBER — suppression du compte (confirmation par mot de passe) |

### Interactions

| Méthode | Route | Accès |
|---|---|---|
| PUT / DELETE | `/likes/{targetType}/{targetId}` | MEMBER (idempotent) |
| PUT / DELETE | `/bookmarks/{filmId}` | MEMBER |
| GET | `/me/bookmarks` | MEMBER |
| PUT | `/me/progress/{filmId}` | MEMBER — `{ positionSec }`, limité à 1 écriture / 10 s |
| GET | `/me/continue-watching` | MEMBER |
| POST | `/reports` | MEMBER |

### Contact et consentement

| Méthode | Route | Accès |
|---|---|---|
| POST | `/contact` | PUBLIC (Turnstile + honeypot + limite) |
| POST | `/consent` | PUBLIC — enregistre la version et les catégories |
| POST | `/analytics/events` | PUBLIC — uniquement si consentement ou mode anonyme ; limité |

### Administration (préfixe `/admin`, ADMIN/EDITOR selon le cas)

| Méthode | Route | Rôle minimum |
|---|---|---|
| CRUD | `/admin/films` | EDITOR |
| POST | `/admin/films/{id}/publish` · `/unpublish` · `/schedule` | EDITOR |
| POST | `/admin/media/uploads` (init) · PATCH (morceaux) · POST (finalisation) | EDITOR |
| GET | `/admin/videos/{id}/status` | EDITOR |
| CRUD | `/admin/people` · `/admin/articles` · `/admin/posts` · `/admin/team` · `/admin/pages` | EDITOR |
| CRUD | `/admin/categories` · `/admin/redirects` | EDITOR |
| GET/PATCH | `/admin/users` · `/admin/users/{id}/role` | ADMIN (rôle SUPER_ADMIN : SUPER_ADMIN seulement) |
| GET | `/admin/reports` · PATCH `/admin/reports/{id}` | MODERATOR |
| GET | `/admin/stats/*` | ADMIN |
| GET | `/admin/audit-log` | ADMIN |
| PATCH | `/admin/site-settings` | ADMIN |
| CRUD | `/admin/ads/*` | ADMIN (V2) |

Toute action admin écrit une ligne dans `AuditLog`. Toute suppression exige un paramètre `confirm=true` **et** une confirmation explicite dans l'interface.

## 4. Règles de réponse

- Ne jamais renvoyer : `passwordHash`, `tokenHash`, chemins de stockage internes, e-mails d'autres utilisateurs.
- Réponses listes : objets **allégés** (pas de `body` d'article complet dans un listing).
- Les entrées inconnues sont rejetées (400). Taille de corps limitée (ex. 100 Ko hors uploads).
- Les erreurs d'authentification ne révèlent pas si l'e-mail existe.

## 5. Tests d'API obligatoires

- Contrat : chaque route valide ses entrées/sorties contre `contracts`.
- Autorisation : pour chaque route protégée, test « sans jeton », « mauvais rôle », « mauvais propriétaire » (BOLA).
- Limites : test de 429 sur login, contact, clés de lecture.
- ZAP API scan sur le document OpenAPI en CI (voir `06`).
