# Compte rendu de recette — 2 octobre 2026

> Format de `docs/skills/ecine-qa-quality.md`. Seuls les points avec une preuve sont marqués ✅. « ⏳ » = prêt mais à vérifier en préproduction ou avec le propriétaire, « ❌ » = non fait.
> Environnement : poste Windows 11, PostgreSQL 18 et Redis 8 en Docker, API et site en local, navigateur Edge (Playwright).

## Checklist « à ne pas oublier » (docs/07 §A)

| # | Exigence | État | Preuve / reste à faire |
|---|---|---|---|
| 1 | Page confidentialité | ⏳ | `/fr/confidentialite` publiée (structure du §C1), **texte à rédiger et valider par un juriste** |
| 2 | Page CGU | ⏳ | `/fr/conditions-generales`, version + date affichées, idem juriste |
| 3 | API hors frontend | ✅ | NestJS indépendant (`/v1`), OpenAPI sur `/docs` (dev), site 100 % via l'API |
| 4 | HTTPS forcé | ⏳ | HSTS envoyé par l'API et le site ; redirection 301 assurée par Caddy et Vercel → à vérifier par `curl -I http://…` en préproduction |
| 5 | Bannière cookies | ✅ | Refus et acceptation de même poids, « Personnaliser », lien permanent ; test : aucune mesure d'audience envoyée sans accord (1 événement sur 2 visites, seule la visite consentie compte) |
| 6 | Meta title/description | ✅ | `generateMetadata` sur chaque page publique, titres tronqués < 60, descriptions < 160 |
| 7 | Images réseaux (OG) | ✅ | `opengraph-image` 1200×630 pour films, talents, actualités (rendu vérifié) |
| 8 | Favicon | ✅ | `icon.svg`, `favicon.ico` (16/32/48), `apple-icon.png`, PWA 192/512 + maskable |
| 9 | Sitemap | ✅ | `/sitemap.xml` dynamique (41 URL avec les données de démonstration), hreflang — soumission Search Console à faire |
| 10 | robots.txt | ✅ | Interdit `/admin`, `/api/`, `/fr/moi`, `/fr/compte`, `/fr/recherche` ; lien du sitemap |
| 11 | Texte alternatif | ✅ | `alt` obligatoire à l'envoi d'image (API 400 sinon) ; axe sans violation sérieuse |
| 12 | Compression des images | ✅ | WebP en 5 largeurs (sharp), chargeur `next/image` ; affiche de démonstration ≈ 10 Ko en 640 px |
| 13 | Vitesse des pages | ⏳ | Lighthouse CI configuré (`lighthouserc.json`) ; mesure à faire sur la préproduction en 4G |
| 14 | Contraste | ✅ | `pnpm check:contrast` : 40 paires conformes (sombre et clair) |
| 15 | Pas de dégradé | ✅ | `pnpm check:gradient` : aucun résultat |
| 16 | Page 404 | ✅ | Statut HTTP 404 réel (test E2E), recherche + un seul CTA + motif |
| 17 | Liens cassés | ⏳ | Redirections 301 automatiques au changement de slug (testé sur la base réelle) ; lychee en CI |
| 18 | Validation des formulaires | ✅ | Mêmes schémas Zod client/serveur ; tests (champs inconnus, trop longs, vides) |
| 19 | Anti-spam | ✅ | Pot de miel, délai minimal, Turnstile, limites : tests 400 (trop rapide, pot de miel) et 429 (rafale d'inscriptions) |
| 20 | OWASP / ZAP | ✅ (local) | ZAP baseline : API et site (build de production) → 0 échec, aucune alerte moyenne non justifiée. Correctifs issus du scan : CSP complète sur les 404 de l'API, **mot de passe qui pouvait partir dans l'URL avant le chargement du JavaScript** (formulaires forcés en POST), cookies serveur en HttpOnly. Exceptions justifiées : security/zap-rules.tsv. À refaire sur la préproduction |
| 21 | Un seul CTA | ✅ | Avertissement en développement + test E2E (≤ 1 bouton principal visible) |
| 22 | proxy.ts | ✅ | Redirection de langue (308), CSP à nonce, renouvellement des jetons, garde `/admin` |
| 23 | Déconnexion + état | ✅ | E2E : cookies supprimés, stockage local effacé, session révoquée côté serveur |
| 24 | Sons et interactions | ✅ | Réglage « Sons » sauvegardé (cookie) ; sons après geste uniquement |
| 25 | Loader fourni | ✅ | `.ecine-loader` tel quel (couleur `--text`, `role="status"`, coupé en mouvement réduit) |
| 26 | Responsive + app | ⏳ | Captures mobile/PC, sombre/clair vérifiées ; PWA installable ; test sur Android réel à faire |

## Sécurité (docs/06)

| Contrôle | Résultat |
|---|---|
| Tests d'intégration de sécurité (base réelle) | 16/16 : 401 sans jeton, jeton altéré, rejeu de refresh → famille révoquée, origine étrangère 403, membre sur l'admin 403, BOLA (liste d'un autre membre invisible), 413, 429 |
| Streaming | Segments chiffrés sur disque ; manifeste, clé et segment refusés sans jeton (403) ; jeton d'une autre vidéo ou altéré refusé ; aspiration → 429 après 150 segments par minute ; aucune URL de fichier (source `blob:`) |
| Matrice des rôles (administration) | 216 combinaisons testées (rôle de l'acteur × rôle de la cible × nouveau rôle) |
| Journaux | Ni IP, ni en-têtes, ni chaîne de requête (jetons de lecture) dans les journaux |

## Tests automatisés

| Suite | Résultat |
|---|---|
| API (unitaires, HTTP simulé) | 473/473 |
| API (intégration, base `ecine_test`) | 16/16 |
| Contrats | 19/19 |
| Site (unitaires) | 21/21 |
| E2E Playwright (PC + mobile) | Parcours 1, 2, 3, 5, page 404, axe sur 4 pages : verts |
| Administration (navigateur) | 30 écrans en HTTP 200 ; parcours complet film (affiche + alt, droits, envoi vidéo 13,5 Mo par morceaux avec pause/reprise, transcodage suivi, publication, corbeille), talent + crédit, événement, publication photo, matrice des rôles (403 / écrans masqués) |
| Production locale | 12 pages clés sans erreur console ni violation CSP (CSP à nonce stricte) |

## Non testé

- Déploiement réel (Vercel + VPS), HTTPS/HSTS de bout en bout, Search Console.
- Lighthouse sur réseau 4G réel ; appareil Android d'entrée de gamme ; TalkBack.
- Installation PWA sur un vrai téléphone.
- E-mails réels (Resend) : pilote `log` utilisé en local.
- Restauration de sauvegarde (script fourni, à exécuter sur l'environnement réel).

## Risques restants

- Bande passante du VPS pour la vidéo (Q3) : mesurer avant le lancement (ADR-0006).
- Textes juridiques non rédigés : **bloquant pour la mise en ligne**.
- Envoi de longs-métrages par morceaux via Vercel : lent (ADR-0008, alternative proposée).
