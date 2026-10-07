---
name: ecine-security-owasp
description: Sécuriser E-Ciné selon OWASP Top 10:2025, ASVS, API Security et ZAP (authentification, autorisation, en-têtes, CSP, anti-spam, uploads, chaîne d'approvisionnement, durcissement du VPS). À utiliser pour toute fonctionnalité sensible et avant chaque livraison.
---

# Compétence : sécurité OWASP

Source complète : `docs/06-SECURITY.md`.

## Les 10 réflexes (OWASP Top 10:2025)
1. **A01 Contrôle d'accès** : refus par défaut ; rôle **+** propriété dans le service ; tests BOLA/BFLA.
2. **A02 Configuration** : en-têtes, CSP à nonce, aucun port interne exposé, pas de Swagger public.
3. **A03 Chaîne d'approvisionnement** : lockfile, audit, mises à jour surveillées, **aucun paquet inconnu sans validation**.
4. **A04 Cryptographie** : HTTPS + HSTS, Argon2id, secrets hors dépôt, clés chiffrées au repos.
5. **A05 Injection** : Prisma paramétré, Zod partout, échappement, sanitisation HTML en liste blanche.
6. **A06 Conception** : revue de menaces par fonctionnalité sensible, ADR.
7. **A07 Authentification** : refresh tournant, rejeu détecté, limites, 2FA admin.
8. **A08 Intégrité** : CI protégée, webhooks signés (HMAC), SRI des scripts tiers.
9. **A09 Journalisation** : audit + alertes, **aucune PII** dans les logs.
10. **A10 Conditions exceptionnelles** : timeouts, erreurs sans fuite, **échec fermé**.

## Spécifique E-Ciné
- Cookies `HttpOnly; Secure; SameSite=Lax`, **jamais** de jeton dans le stockage navigateur.
- Anti-spam : honeypot + Turnstile + rate limit + délai minimal.
- Uploads : signature du fichier, taille, ré-encodage `sharp` (EXIF supprimé), SVG refusés, stockage privé.
- Streaming : voir `ecine-secure-streaming`.
- VPS : SSH par clé, ufw, fail2ban, mises à jour auto, PostgreSQL/Redis internes, conteneurs durcis.

## ZAP
- PR : `zap-baseline` sur la prévisualisation.
- Staging hebdomadaire : `zap-api-scan` (OpenAPI) ; avant mise en ligne : scan **authentifié** (MEMBER puis ADMIN).
- Exceptions documentées (`security/zap-rules.tsv`). **Jamais** de scan actif contre la production sans autorisation expresse.

## Veille
Avis Next.js (très fréquents), NestJS, Prisma, Node.js, Redis, PostgreSQL, Caddy. Critique → correctif sous 48 h. Majeure → proposer d'abord.

## Checklist avant livraison
- [ ] Tests « sans jeton / mauvais rôle / mauvais propriétaire »
- [ ] Rate limits testés (login, contact, clés)
- [ ] CSP/HSTS vérifiés (`curl -I`)
- [ ] ZAP sans alerte moyenne non justifiée
- [ ] `pnpm audit` + secrets (gitleaks) propres
- [ ] Aucune PII dans les logs
