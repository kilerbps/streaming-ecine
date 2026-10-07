# ADR-0005 — Authentification et sessions

- Statut : **appliqué, points marqués ⚠ à valider**
- Date : 2026-10-02

## Décision

1. **Next.js comme intermédiaire (BFF).** Le navigateur ne parle qu'au site. L'API pose ses cookies `HttpOnly; Secure; SameSite=Lax` (préfixe `__Host-` en HTTPS) et le site les relaie (`relaySetCookies`). Les rendus serveur les retransmettent à l'API. Aucun jeton n'existe hors cookie HttpOnly.
2. **Jeton d'accès** JWT HS256 de 15 min (`jose`). **Refresh tournant** opaque de 256 bits, stocké haché (SHA-256), à usage unique, valable 30 jours (12 h pour ADMIN et plus). Une famille de sessions est révoquée en cas de rejeu. `proxy.ts` renouvelle la paire de façon transparente quand le jeton d'accès expire dans moins de 60 s.
3. ⚠ **Fenêtre de grâce de 20 s** : un refresh déjà tourné reste accepté 20 s, pour que des requêtes simultanées (préchargements) ne déconnectent pas l'utilisateur. Au-delà, rejeu = famille révoquée et ligne d'audit `auth.refresh_reuse` (testé).
4. **Révocation immédiate** : `sess:revoked:{famille}` dans Redis, contrôlé à chaque requête, avec repli sur la base si Redis tombe.
5. **CSRF** : les cookies n'existent que sur le domaine du site. L'API refuse toute requête navigateur d'une origine non autorisée (`OriginGuard`). Les Server Actions vérifient `Origin` contre `Host` (protection native de Next.js). Le jeton « double soumission » du 04 §1 n'apporte donc rien ici ; il n'est pas implémenté.
6. **IP réelle** : le site transmet `x-client-ip` / `x-client-user-agent`, que l'API ne croit qu'avec la clé de service (`SERVICE_API_KEY`). Sans cela, toutes les limites par IP s'appliqueraient à l'IP de Vercel.
7. **Verrouillage progressif** par empreinte d'e-mail (5 échecs puis 1, 2, 4… jusqu'à 30 min). Il s'applique aussi aux e-mails inexistants, donc aucune énumération possible. S'y ajoute une limite par IP.
8. **Argon2id** (m = 19 Mio, t = 2, p = 1, recommandation OWASP). Longueur minimale de 12 caractères, liste de mots de passe trop courants, refus d'un mot de passe contenant l'e-mail.
9. **2FA TOTP** (RFC 6238) obligatoire pour ADMIN et SUPER_ADMIN, avec anti-rejeu du code et secret chiffré AES-256-GCM. `ADMIN_MFA_REQUIRED=false` n'est accepté qu'hors production : le serveur refuse de démarrer sinon.
10. ⚠ **Inscription avec un e-mail déjà utilisé** : réponse 409 explicite (« Un compte existe déjà… »), protégée par Turnstile et une limite de 5 inscriptions par heure et par IP. Cela révèle l'existence d'un compte, mais évite d'obliger à passer par sa boîte mail avant de pouvoir « aimer » un film (PRD §8 parcours 2). Alternative : réponse identique dans tous les cas et connexion via le lien e-mail.
11. ⚠ **Vérification d'e-mail non bloquante** : le compte est utilisable tout de suite. La vérification sera exigée pour les commentaires (V2), conformément à 06 §3.
12. **Suppression de compte** : effacement des données personnelles et anonymisation des journaux. Les comptes d'équipe doivent d'abord être rétrogradés.

## Vérifié

Tests unitaires TOTP (vecteurs RFC), chiffrement, rotation et rejeu sur base réelle, verrouillage (401 ×5 puis 429), refus d'origine étrangère (403), corps > 100 Ko (413), déconnexion qui révoque la famille. Parcours E2E « J'aime → inscription → reprise ».
