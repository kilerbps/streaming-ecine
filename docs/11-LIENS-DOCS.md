# 11 — Liens de documentation (à jour au 2 octobre 2026)

**Légende** : `[vérifié]` = apparu dans mes recherches du 02/10/2026 · `[canonique]` = adresse officielle connue, **à ouvrir et revérifier** au premier usage.

**Règle de fraîcheur pour l'IA** : avant d'utiliser une API, ouvre la doc de **la version installée** (`pnpm list`). Si la doc diffère de ce que tu crois savoir, **la doc gagne**. Si un lien est mort, cherche la page officielle et signale-le.

## 1. Versions de référence

| Techno | Version observée | Source |
|---|---|---|
| Next.js | **16.3** (sortie le 3 août 2026), correctifs 16.3.x ; avis de sécurité publiés régulièrement (dont 22 et 30 septembre 2026) | [vérifié] https://nextjs.org/blog |
| NestJS | **12.0.x** (ESM natif, Standard Schema, Vitest) ; 11.x reste en maintenance | [vérifié] https://github.com/nestjs/nest/releases · https://trilon.io/blog/nestjs-12-is-coming |
| Prisma ORM | **7.x** recommandé en production ; Prisma Next/8 annoncé : ne pas adopter sans validation | [vérifié] https://www.prisma.io/docs/orm/v7 |
| OWASP Top 10 | **2025** (A03 chaîne d'approvisionnement, A10 conditions exceptionnelles) | [vérifié] https://owasp.org/Top10/2025/ |

> Les sources divergent sur le nom de la prochaine version de Prisma (« 8 » ou « Prisma Next »). Reste sur la **v7** et vérifie https://www.prisma.io/changelog avant toute migration.

## 2. Frontend — Next.js, React, Vercel

| Sujet | Lien | Statut |
|---|---|---|
| Documentation Next.js (App Router) | https://nextjs.org/docs/app | [vérifié] |
| Démarrer / images / polices / déploiement / mise à jour | https://nextjs.org/docs/app/getting-started/images · /fonts · /deploying · /upgrading | [vérifié] |
| Annonce Next.js 16.3 | https://nextjs.org/blog/next-16-3 | [vérifié] |
| **Instant Navigations / expériences « app-like »** | https://nextjs.org/blog/building-app-like-experiences-with-nextjs-16-3 | [vérifié] |
| Métadonnées (`generateMetadata`) | https://nextjs.org/docs/app/api-reference/functions/generate-metadata | [canonique] |
| Sitemap / robots | https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap · /robots | [canonique] |
| `proxy.ts` (ex-middleware) | https://nextjs.org/docs/app/api-reference/file-conventions/proxy | [canonique] |
| Server Actions et mutations | https://nextjs.org/docs/app/getting-started/mutating-data | [canonique] |
| Sécurité Next.js (guide) | https://nextjs.org/docs/app/guides/data-security | [canonique] |
| PWA avec Next.js | https://nextjs.org/docs/app/guides/progressive-web-apps | [canonique] |
| Vercel — documentation, régions, variables | https://vercel.com/docs · https://vercel.com/docs/regions | [canonique] |
| React — documentation | https://react.dev | [canonique] |
| Tailwind CSS v4 | https://tailwindcss.com/docs | [canonique] |
| Radix UI Primitives | https://www.radix-ui.com/primitives | [canonique] |
| next-intl (i18n) | https://next-intl.dev | [canonique] |
| Serwist (service worker) | https://serwist.pages.dev | [canonique] |
| React Hook Form · Zod | https://react-hook-form.com · https://zod.dev | [canonique] |

## 3. Backend — NestJS, Prisma, PostgreSQL, Redis

| Sujet | Lien | Statut |
|---|---|---|
| NestJS (docs) | https://docs.nestjs.com | [canonique] |
| NestJS — Helmet, CORS, limitation de débit | https://docs.nestjs.com/security/helmet · /security/cors · /security/rate-limiting | [canonique] |
| NestJS — files (BullMQ) | https://docs.nestjs.com/techniques/queues | [canonique] |
| NestJS — OpenAPI | https://docs.nestjs.com/openapi/introduction | [canonique] |
| BullMQ | https://docs.bullmq.io | [canonique] |
| Prisma (docs v7) | https://www.prisma.io/docs/orm/v7 | [vérifié] |
| Prisma Config (`prisma.config.ts`) | https://www.prisma.io/docs/orm/reference/prisma-config-reference | [canonique] |
| Prisma — changelog | https://www.prisma.io/changelog | [vérifié] |
| Prisma — blog (notes de version) | https://www.prisma.io/blog | [vérifié] |
| PostgreSQL (courant) | https://www.postgresql.org/docs/current/ | [canonique] |
| `pg_trgm` · `unaccent` · recherche plein texte | https://www.postgresql.org/docs/current/pgtrgm.html · /unaccent.html · /textsearch.html | [canonique] |
| Redis (docs) · sécurité | https://redis.io/docs/latest/ · https://redis.io/docs/latest/operate/oss_and_stack/management/security/ | [canonique] |
| Caddy (HTTPS automatique) | https://caddyserver.com/docs/ | [canonique] |
| Docker Compose | https://docs.docker.com/compose/ | [canonique] |
| FFmpeg | https://ffmpeg.org/documentation.html | [canonique] |

## 4. Streaming et protection des contenus

| Sujet | Lien | Statut |
|---|---|---|
| HLS — RFC 8216 | https://datatracker.ietf.org/doc/html/rfc8216 | [canonique] |
| Apple — HTTP Live Streaming | https://developer.apple.com/documentation/http-live-streaming | [canonique] |
| hls.js | https://github.com/video-dev/hls.js | [canonique] |
| Shaka Player (alternative, DRM possible) | https://github.com/shaka-project/shaka-player | [canonique] |
| Chiffrement HLS AES-128 : principes et limites | https://publit.io/community/blog/hls-encryption | [vérifié] |
| Vidéo sécurisée : chiffrement + jetons + URL signées | https://www.shoutcastnet.com/blogs/secure-video-delivery-hls-encryption.php | [vérifié] |
| URL à jeton pour la vidéo (principes) | https://www.vdocipher.com/blog/token-based-urls/ | [vérifié] |
| Protéger des flux HLS avec des jetons d'URL | https://foliovision.com/player/securing-your-video/signed-urls-hls-protection | [vérifié] |

> Ces articles viennent d'éditeurs de solutions vidéo : utile pour les principes, **pas** comme spécification. La référence normative reste la RFC 8216.

## 5. Sécurité

| Sujet | Lien | Statut |
|---|---|---|
| OWASP Top 10:2025 | https://owasp.org/Top10/2025/ | [vérifié] |
| OWASP ASVS | https://owasp.org/www-project-application-security-verification-standard/ | [canonique] |
| OWASP API Security Top 10 (2023) | https://owasp.org/API-Security/ | [canonique] |
| OWASP Cheat Sheet Series (mots de passe, sessions, CSRF, upload…) | https://cheatsheetseries.owasp.org/ | [canonique] |
| OWASP ZAP — documentation | https://www.zaproxy.org/docs/ | [canonique] |
| ZAP — Automation Framework / scans Docker | https://www.zaproxy.org/docs/automate/automation-framework/ · https://www.zaproxy.org/docs/docker/ | [canonique] |
| Cloudflare Turnstile (anti-spam) | https://developers.cloudflare.com/turnstile/ | [canonique] |
| MDN — CSP · HSTS · cookies | https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP | [canonique] |
| Résumé des changements OWASP 2025 | https://blog.qualys.com/qualys-insights/2026/06/15/what-changed-in-owasp-top-10-2025-and-recommendations-for-each-category | [vérifié] |

## 6. SEO et performance

| Sujet | Lien | Statut |
|---|---|---|
| Google Search Central (documentation) | https://developers.google.com/search/docs | [canonique] |
| Données structurées : Film · Vidéo · Article · Fil d'Ariane | https://developers.google.com/search/docs/appearance/structured-data/movie · /video · /article · /breadcrumb | [canonique] |
| Test des résultats enrichis | https://search.google.com/test/rich-results | [canonique] |
| Core Web Vitals | https://web.dev/articles/vitals | [canonique] |
| Lighthouse CI | https://github.com/GoogleChrome/lighthouse-ci | [canonique] |
| Open Graph | https://ogp.me | [canonique] |
| lychee (liens cassés) | https://github.com/lycheeverse/lychee | [canonique] |

## 7. Accessibilité, design et UX

| Sujet | Lien | Statut |
|---|---|---|
| WCAG 2.2 | https://www.w3.org/TR/WCAG22/ | [canonique] |
| Vérificateur de contraste WebAIM | https://webaim.org/resources/contrastchecker/ | [canonique] |
| WAI-ARIA Authoring Practices | https://www.w3.org/WAI/ARIA/apg/ | [canonique] |
| axe-core | https://github.com/dequelabs/axe-core | [canonique] |
| **Carbon Design System** (grille, tokens, composants) | https://carbondesignsystem.com | [canonique] |
| IBM Plex (polices) | https://www.ibm.com/plex/ | [canonique] |
| Laws of UX | https://lawsofux.com | [canonique] |
| MDN — Web Audio API · Vibration API | https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API | [canonique] |
| Politique d'autoplay (Chrome) | https://developer.chrome.com/blog/autoplay | [canonique] |
| MDN — View Transitions API | https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API | [canonique] |
| MDN — Progressive Web Apps | https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps | [canonique] |

## 8. Légal et vie privée

| Sujet | Lien | Statut |
|---|---|---|
| RDC — Ordonnance-loi n° 23/010 du 13 mars 2023 (Code du numérique) : présentation | https://www.digitalbusiness.africa/rd-congo-la-loi-portant-code-du-numerique-presentee-trois-regimes-pour-un-meilleur-climat-des-affaires/ | [vérifié] |
| RDC — Droit numérique (ressources, analyses) | https://droitnumerique.cd | [vérifié] |
| RDC — campagne de vulgarisation du Code du numérique | https://fr.allafrica.com/stories/202306200488.html | [vérifié] |
| RDC — réseau national des DPO (mars 2026) et projet d'autorité de protection | https://osiris.sn/numerique-la-rdc-met-en-place-un-reseau-de-responsables-de-la-protection-des.html | [vérifié] |
| RGPD — texte officiel | https://eur-lex.europa.eu/eli/reg/2016/679/oj | [canonique] |
| CNIL — cookies et traceurs (bonnes pratiques) | https://www.cnil.fr/fr/cookies-et-autres-traceurs | [canonique] |
| Bibliothèque de consentement (open source) | https://cookieconsent.orestbida.com | [canonique] |

> Pour le droit congolais, **seul un juriste local** valide les textes finaux. Ces liens servent à préparer la discussion.

## 9. Publicité (préparation)

| Sujet | Lien | Statut |
|---|---|---|
| ads.txt (IAB Tech Lab) | https://iabtechlab.com/ads-txt/ | [canonique] |
| Better Ads Standards | https://www.betterads.org | [canonique] |
| Google Ad Manager / AdSense (règles) | https://support.google.com/admanager · https://support.google.com/adsense | [canonique] |

## 10. Tests et outils

| Sujet | Lien | Statut |
|---|---|---|
| Playwright | https://playwright.dev/docs/intro | [canonique] |
| Vitest | https://vitest.dev | [canonique] |
| Supertest | https://github.com/ladjs/supertest | [canonique] |
| Sentry (Next.js, NestJS) | https://docs.sentry.io | [canonique] |
| gitleaks | https://github.com/gitleaks/gitleaks | [canonique] |
| Renovate / Dependabot | https://docs.renovatebot.com · https://docs.github.com/code-security/dependabot | [canonique] |

## 11. Procédure de mise à jour de ce fichier

Tous les mois : ouvrir les liens `[vérifié]` et `[canonique]` critiques (Next.js, NestJS, Prisma, OWASP), mettre à jour la table des versions, noter la date en tête de fichier, créer un ADR si une version majeure change la stratégie.
