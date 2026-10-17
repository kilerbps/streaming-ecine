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
| GET | `/home` | PUBLIC | Accueil en rangées (lot 3) : affiche à la une (programmée, sinon derniers films ; `previewVideoId` quand l'emplacement programmé autorise l'aperçu vidéo) et rangées automatiques ou programmées, sous leurs seuils ; cache 120 s |
| POST | `/home/personal` | PUBLIC (limité) | Partie personnelle de l'accueil (ADR-0014) : membre → son compte ; visiteur → signaux de l'appareil envoyés dans le corps (`history`, `dismissed`, `tastes`), seulement s'il a accepté « Personnalisation ». Jamais en cache |
| GET | `/whats-new` | PUBLIC | Nouveautés : films annoncés (sortie la plus proche d'abord) et événements à venir avec film lié ; cache 120 s |
| GET | `/categories` | PUBLIC | Avec `filmCount` (titres visibles) et `cover` (affiche du plus récent) |
| GET | `/share-images/films/{slug}` | PUBLIC (limité) | Affiche du film recadrée pour l'image de partage (`opengraph-image`) |
| GET | `/push/key` | PUBLIC | `{ publicKey }` VAPID, `null` si Web Push n'est pas configuré ; cache 1 h |
| GET | `/search?q=` | PUBLIC | Groupé par type ; limité en débit |
| GET | `/pages/{slug}` | PUBLIC | À propos, légales |
| GET | `/team` | PUBLIC | Équipe dirigeante |
| GET | `/site-settings` | PUBLIC | Contacts, réseaux, `adsEnabled` |
| GET | `/sitemap-data` | Interne | Utilisé par `app/sitemap.ts` ; clé de service |

### Lecture vidéo

| Méthode | Route | Accès | Notes |
|---|---|---|---|
| POST | `/playback/{videoId}/session` | PUBLIC (limité) | Vérifie que le film est publié ; renvoie `{ manifestUrl, token, expiresAt }`. `?apercu=1` : session d'aperçu plafonnée à 240p, non comptée dans le Top 10 |
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
| POST | `/me/2fa/setup` | MEMBER — secret, lien `otpauth://` et QR code SVG (data URL) |
| POST | `/me/2fa/enable` | MEMBER (limité) — `{ code }` ; renvoie 10 codes de secours, montrés une seule fois |
| POST | `/me/2fa/recovery-codes` | MEMBER (limité) — mot de passe + code ; remplace les codes de secours |
| POST | `/me/2fa/disable` | MEMBER (limité) — mot de passe + code (application ou secours) ; efface les codes |

`/auth/login` accepte au second facteur un code à 6 chiffres ou un code de secours `abcd-efgh` (usage unique, journalisé `auth.2fa_recovery_used`). `GET /me` donne `recoveryCodesLeft`.

### Interactions

| Méthode | Route | Accès |
|---|---|---|
| PUT / DELETE | `/likes/{targetType}/{targetId}` | MEMBER (idempotent) |
| PUT / DELETE | `/bookmarks/{filmId}` | MEMBER |
| GET | `/me/bookmarks` | MEMBER |
| PUT / DELETE | `/me/reminders/{filmId}` | MEMBER (« Me le rappeler » : film annoncé seulement, sinon 409 ; e-mail le jour de la sortie) |
| GET | `/me/reminders` | MEMBER (rappels en attente) |
| PUT / DELETE | `/me/dismissals/{filmId}` | MEMBER — « Pas pour moi » : titre masqué de l'accueil 90 jours (ADR-0014) |
| GET / PUT | `/me/tastes` | MEMBER — goûts : `{ categories }`, 8 slugs au plus |
| POST / DELETE | `/me/push-subscriptions` | MEMBER — abonnement Web Push de l'appareil (hôtes de push autorisés seulement) |
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
| PATCH | `/admin/media/images/{id}/framing` | EDITOR — point focal et recadrages par format |
| POST | `/admin/media/uploads` (init) · PATCH (morceaux) · POST (finalisation) | EDITOR |
| GET | `/admin/videos/{id}/status` | EDITOR |
| CRUD | `/admin/people` · `/admin/articles` · `/admin/posts` · `/admin/team` · `/admin/pages` | EDITOR |
| CRUD | `/admin/categories` · `/admin/redirects` | EDITOR |
| GET/PUT | `/admin/home` (affiche à la une, rangées éditoriales, talents à l'honneur, enregistrés ensemble ; Top 10 en lecture seule) | EDITOR |
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
