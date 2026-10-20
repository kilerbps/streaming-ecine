# 06 — Sécurité

Référentiels : **OWASP Top 10:2025**, **OWASP ASVS** (niveau 2 visé), **OWASP API Security Top 10 (2023)**, **OWASP Cheat Sheet Series**. Outil de test dynamique : **OWASP ZAP**.

## 1. Modèle de menaces (résumé)

| Actif | Menace principale | Parade |
|---|---|---|
| Films | Téléchargement/aspiration, partage de liens | HLS + jetons courts + AES-128 + limites (§6) |
| Comptes | Bourrage d'identifiants, force brute | Argon2id, limites, verrouillage progressif, alertes |
| Admin | Prise de contrôle | Rôles, 2FA (obligatoire pour ADMIN+), audit, hôte dédié |
| Formulaires | Spam, injection | Validation, Turnstile, honeypot, rate limit |
| Chaîne logicielle | Dépendance compromise / faille framework | Veille, mises à jour rapides, lockfile, CI |
| VPS | Intrusion | Durcissement (§8), aucun service interne exposé |
| Données perso | Fuite | Minimisation, chiffrement, journaux sans PII |

## 2. Correspondance OWASP Top 10:2025

| Cat. | Risque | Mesures E-Ciné |
|---|---|---|
| A01 | Contrôle d'accès défaillant (inclut BOLA/BFLA) | Guards de rôles **+** contrôle de propriété dans chaque service ; tests « mauvais rôle / mauvais propriétaire » ; refus par défaut |
| A02 | Mauvaise configuration | En-têtes de sécurité, CSP, pas de ports ouverts, pas de Swagger public, variables par environnement, revue d'`infra/` |
| A03 | Défaillances de la chaîne d'approvisionnement | `pnpm-lock.yaml` verrouillé, Dependabot/Renovate, `pnpm audit` en CI, versions épinglées, vérification des nouveaux paquets (qui maintient ? téléchargements ?), **pas d'installation d'un paquet sans validation** |
| A04 | Défaillances cryptographiques | HTTPS partout + HSTS, Argon2id, secrets hors dépôt, clés AES chiffrées au repos, aucun algorithme maison |
| A05 | Injection | Prisma (requêtes paramétrées), pas de SQL brut non paramétré, Zod sur toutes les entrées, échappement React, sanitisation du HTML riche (liste blanche) |
| A06 | Conception non sécurisée | Revue de menaces par fonctionnalité sensible (lecture, upload, auth), ADR |
| A07 | Défaillances d'authentification | Voir §3 |
| A08 | Intégrité logicielle/données | CI protégée, branche principale protégée, SRI pour scripts tiers, jobs signés (webhooks de revalidation HMAC) |
| A09 | Journalisation/alertes | Journal d'audit, alertes sur échecs de connexion en rafale, 5xx, jobs en échec ; **aucune PII dans les logs** |
| A10 | Mauvaise gestion des conditions exceptionnelles | Erreurs RFC 9457 sans fuite, délais d'attente (timeouts), disjoncteurs, échec **fermé** (en cas d'erreur d'autorisation : refuser) |

## 3. Authentification et sessions

- Mot de passe : **Argon2id**, longueur ≥ 12, liste des mots de passe courants refusée, pas de règles de composition absurdes.
- Jeton d'accès JWT **court** (10–15 min) ; **refresh token tournant** (usage unique, stocké haché), **détection de rejeu** (famille révoquée).
- Cookies : `HttpOnly; Secure; SameSite=Lax; Path` minimal ; préfixe `__Host-` quand le domaine le permet. **Aucun jeton dans `localStorage`.**
- Limites : par compte ou par appareil (cookie signé), l'IP ne servant que de plafond (CGNAT, ADR-0015) ; les routes d'authentification restent toujours appliquées ; verrouillage progressif ; réponse identique que le compte existe ou non.
- Déconnexion : révocation côté serveur, suppression des cookies, purge des caches privés du service worker.
- 2FA (TOTP) **obligatoire** pour ADMIN/SUPER_ADMIN ; recommandé pour EDITOR.
- Vérification d'e-mail avant toute action publique (commentaires, V2).

## 4. En-têtes et transport

| Sujet | Règle |
|---|---|
| HTTPS | Forcé : redirection 301, **HSTS** `max-age=31536000; includeSubDomains` (preload seulement après validation) |
| CSP | Stricte, avec **nonce** généré dans `proxy.ts` ; `default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` ; sources vidéo/images listées explicitement (`media.*`) ; scripts de pub ajoutés **uniquement** quand `adsEnabled` |
| Autres en-têtes | `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimale, `Cross-Origin-Opener-Policy: same-origin` |
| CORS | Liste blanche d'origines exactes ; jamais `*` avec cookies |
| Cache | `no-store` sur les réponses privées (clés, session, `/me`) |

## 5. Entrées, formulaires et anti-spam

- Validation **double** : client (confort) + serveur (autorité) avec le même schéma Zod (`contracts`).
- **Anti-spam** (formulaire de contact, inscription) : champ honeypot masqué + **Cloudflare Turnstile** + limite de débit + délai minimal de saisie + e-mail de vérification. Pas de CAPTCHA envahissant.
- Uploads : liste blanche de types **vérifiés par signature (magic bytes)**, taille max, **ré-encodage des images avec `sharp`** (supprime les métadonnées EXIF/GPS et le contenu piégé), noms de fichiers régénérés, stockage hors racine web, **SVG refusés** en upload utilisateur (SVG maison uniquement), analyse antivirus (ClamAV) pour les envois de créateurs (V2).
- HTML riche (articles) : stocké en Markdown/JSON, rendu avec sanitisation ; jamais `dangerouslySetInnerHTML` sans nettoyage.
- Redirections : uniquement vers des chemins internes ou une liste blanche (anti open-redirect).
- SSRF : l'API n'appelle jamais d'URL fournie par l'utilisateur sans liste blanche.

## 6. Protection des films (streaming sécurisé)

**Objectif** : empêcher le téléchargement simple (clic droit « enregistrer », lien `.mp4`, outils grand public). **Limite assumée** : aucune solution web sans DRM matériel n'empêche l'enregistrement d'écran ni un attaquant déterminé. Une couche DRM (Widevine/FairPlay via un fournisseur) pourra être étudiée plus tard si le risque le justifie.

Couches (toutes obligatoires) :

1. **Pas de fichier MP4 public.** Source stockée privée ; diffusion en **HLS** uniquement. Seule exception (ADR-0015, décision du propriétaire du 20 octobre 2026) : les aperçus promotionnels de 20 s au plus, en 240p, sans son et filigranés, au passage choisi en administration.
2. **Chiffrement AES-128** des segments ; clé servie **seulement** avec un jeton valide, `no-store`, rate limit strict.
3. **Jetons signés courts** (HMAC/JWT) liés à la session et à la vidéo, ≤ 5 min, renouvelés par le lecteur ; la validité est vérifiée sur manifest, segments (ou cookies signés) et clé. Le chiffrement seul ne bloque pas le partage d'une URL autorisée : **le jeton est indispensable**.
4. **Quotas** : sessions de lecture par compte ou appareil (pot commun des appareils neufs, plafond IP), sessions simultanées, renouvellements, clés et segments par session ; détection d'aspiration (téléchargement séquentiel rapide de tous les segments) → 429 + journal (ADR-0015).
5. **Anti-hotlinking** : vérification d'`Origin`/`Referer` (renfort, pas garantie), HTTPS uniquement.
6. **Pas de listage de répertoire**, noms de segments non devinables.
7. **Interface** : `controlsList="nodownload"`, `disablePictureInPicture` si souhaité, menu contextuel vidéo désactivé — **confort uniquement, pas une sécurité**.
8. **Filigrane** (V2) : identifiant discret par session pour dissuader et tracer les fuites.
9. **Procédure de retrait** : si un film fuite, désactivation immédiate (jetons invalidés), rotation de la clé, journal.

La bande-annonce peut être publique et téléchargeable en pratique ; elle ne doit pas contenir le film.

## 7. Tests de sécurité (ZAP et autres)

- **Pull request** : `zap-baseline` (scan passif) contre l'environnement de prévisualisation. Échec de la CI sur alerte de niveau moyen ou supérieur non justifiée.
- **Staging, chaque semaine** : `zap-api-scan` sur le document OpenAPI ; scan complet planifié hors production.
- **Avant la mise en ligne** : scan authentifié (contexte MEMBER, puis ADMIN), revue manuelle des endpoints de lecture et d'admin, test de rejeu de refresh token, test BOLA/BFLA.
- Exceptions documentées dans `security/zap-rules.tsv` avec justification et date.
- Ne **jamais** lancer un scan actif contre la production sans autorisation expresse du propriétaire.
- Outils complémentaires : `pnpm audit`, `osv-scanner`, analyse de secrets (gitleaks), CodeQL ou équivalent.

## 8. Durcissement du VPS

SSH par clé uniquement (mot de passe et root désactivés), port 22 limité, `ufw` (22/80/443), `fail2ban`, mises à jour de sécurité automatiques, utilisateur non root, Docker rootless si possible, conteneurs `read_only` + `no-new-privileges`, **PostgreSQL et Redis sans port public** (réseau Docker interne, Redis avec mot de passe/ACL), secrets via variables/fichiers à droits restreints, synchronisation NTP, rotation des journaux, sauvegardes chiffrées hors site et **restauration testée**.

## 9. Gestion des secrets

Jamais dans le dépôt (`.env` ignoré, `gitleaks` en CI). Vercel : variables d'environnement par environnement. VPS : fichiers `.env` à droits `600`, rotation planifiée (JWT, HMAC médias, clés AES maîtresses). Un secret exposé = **rotation immédiate** + enquête.

## 10. Réponse à incident (version courte)

Détecter (alerte) → contenir (révoquer sessions, couper la fonction, désactiver le film) → corriger → informer les personnes concernées si des données personnelles sont touchées (obligation de notification à vérifier auprès de l'autorité compétente, voir `07`) → rédiger un rapport post-incident sans recherche de coupable.

## 11. Veille

S'abonner aux avis de sécurité de Next.js, NestJS, Prisma, Node.js, Redis, PostgreSQL et Caddy. Les mises à jour de sécurité **critiques** sont appliquées sous 48 h ; Next.js publie des versions correctives fréquentes (voir `11`). Ne jamais appliquer une mise à jour majeure sans la proposer d'abord (voir `09`).
