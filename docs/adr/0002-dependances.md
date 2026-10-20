# ADR-0002 — Dépendances et scripts d'installation

- Statut : **appliqué, à valider**
- Date : 2026-10-02

## Contexte

`09-AGENTS.md` interdit d'installer un paquet inconnu sans validation et d'exécuter des scripts d'installation douteux. pnpm 11 bloque par défaut les scripts d'installation et exige une liste explicite (`allowBuilds`).

## Décision

Dépendances ajoutées au-delà de celles nommées dans le dossier, toutes maintenues et très utilisées :

| Paquet | Où | Pourquoi |
|---|---|---|
| `jose` | API | Signature/vérification JWT (accès, lecture) sans dépendance CommonJS |
| `argon2` | API | Hachage Argon2id (exigé par 03 §1) |
| `nestjs-pino`, `pino`, `pino-http` | API | Journaux structurés sans PII (exigé par 02 §6) |
| `cookie-parser`, `helmet` | API | Cookies, en-têtes de sécurité |
| `sharp` | API | Ré-encodage des images (EXIF supprimé) |
| `radix-ui` | Web | Primitives accessibles (feuilles modales) |
| `hls.js` | Web | Lecteur HLS (chargé à la demande) |
| `@axe-core/playwright` | Web (dev) | Audit d'accessibilité automatisé |
| `web-push` 3.6.7 (MPL-2.0) | API | Notifications Web Push des rappels, chiffrement et signature VAPID (ADR-0014, validé le 15 octobre 2026) |
| `qrcode` 1.5.4 (MIT) | API | QR code SVG de la double authentification (validé le 15 octobre 2026) |
| `mmdb-lib` 3.0.3 (MIT, aucune dépendance) | API | Lecture des bases DB-IP Lite « IP to ASN » et « IP to Country » (CC BY 4.0, mention de DB-IP.com obligatoire) pour classer les IP des limites de débit (ADR-0015, validé le 20 octobre 2026). Les bases ne sont pas versionnées : `pnpm --filter @ecine/api geo:update` les télécharge chaque mois. |

Volontairement **non ajoutés** : bibliothèque d'icônes (icônes SVG maison), bibliothèque de dates (Intl), Serwist (service worker écrit à la main, 80 lignes), bibliothèque OTP (TOTP RFC 6238 implémenté et testé avec les vecteurs officiels), SDK Resend (appel HTTP direct), bibliothèque de graphiques.

Scripts d'installation autorisés (`pnpm-workspace.yaml` → `allowBuilds`) : `@prisma/engines`, `prisma`, `argon2`, `@swc/core`, `@parcel/watcher`, `unrs-resolver`. Refusés : `@scarf/scarf` (télémétrie de swagger-ui), `msgpackr-extract` (accélérateur optionnel).

## Conséquences

Toute nouvelle entrée dans `allowBuilds` ou nouvelle dépendance passe par une ADR ou une PR validée.
