---
name: ecine-nestjs-backend
description: Construire l'API E-Ciné avec NestJS 12 (ESM) hors du frontend. À utiliser pour modules, contrôleurs, services, guards, validation, erreurs, jobs BullMQ, OpenAPI.
---

# Compétence : backend NestJS 12

## Rappels vérifiés (02/10/2026)
- NestJS 12 : tous les paquets officiels en **ESM**, support Standard Schema dans `@Body/@Query/@Param`, chaîne d'outils modernisée (Vitest). Si un paquet tiers n'est pas compatible ESM → proposer 11.x LTS (question au propriétaire).
- CLI 12 : module ES natif.

## Architecture
`Controller (fin) → Service (métier + autorisation de propriété) → Repository (Prisma)`.
Modules : auth, users, films, people, articles, posts, media, playback, search, interactions, contact, consent, analytics, ads (V2), admin, health.

## Règles
1. **Contrats** : schémas Zod de `packages/contracts` pour entrées **et** sorties ; rejet des champs inconnus ; jamais d'entité Prisma brute.
2. **Autorisation** : guard de rôle **+** contrôle de propriété dans le service. Refus par défaut. Tests « sans jeton / mauvais rôle / mauvais propriétaire ».
3. **Erreurs** : filtre global RFC 9457 (`application/problem+json`), sans trace ni détail interne.
4. **Sécurité** : Helmet, CORS en liste blanche, `@nestjs/throttler` sur Redis, CSRF sur mutations, cookies `HttpOnly; Secure; SameSite=Lax`.
5. **Config** : validée au démarrage (le serveur refuse de démarrer sinon).
6. **Logs** : pino, `X-Request-Id`, **aucune PII**.
7. **Jobs** : BullMQ pour transcodage, e-mails, images, recalcul de caches ; idempotents, avec reprises.
8. **Audit** : interceptor qui écrit `AuditLog` pour chaque action admin.
9. **OpenAPI** : généré, protégé ou désactivé en production publique.
10. **Santé** : `/health` vérifie base + Redis sans fuite d'information.

## Auth (résumé)
Argon2id ; JWT d'accès court ; refresh tournant haché avec famille et détection de rejeu ; verrouillage progressif ; réponses identiques si le compte n'existe pas ; 2FA TOTP pour ADMIN+.

## Interdits
Logique métier dans les contrôleurs · SQL brut non paramétré · secrets en dur · `any` · retours d'e-mails d'autres utilisateurs · CORS `*` avec cookies · exposition de ports PostgreSQL/Redis.

## Checklist
- [ ] Contrats Zod en entrée/sortie
- [ ] Autorisation testée (3 cas)
- [ ] Limites de débit sur routes sensibles
- [ ] Erreurs RFC 9457
- [ ] Logs sans PII
- [ ] OpenAPI à jour
