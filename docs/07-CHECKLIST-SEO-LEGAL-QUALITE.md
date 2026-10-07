# 07 — Checklist SEO, légal et qualité

Chaque ligne est une **tâche testable**. L'IA coche seulement avec une **preuve** (commande, capture, rapport). Rien n'est « fait » sans preuve.

## A. Ta liste « à ne pas oublier »

| # | Exigence | Comment | Preuve de validation |
|---|---|---|---|
| 1 | Page **RGPD / confidentialité** | `/fr/confidentialite` (contenu §C1) | Page publiée, liée dans le pied de page et la bannière |
| 2 | Page **CGU** | `/fr/conditions-generales` (contenu §C2) | Idem + version et date |
| 3 | **API hors frontend** | NestJS indépendant, domaine `api.*` | Le front fonctionne via l'API seule ; Swagger/OpenAPI |
| 4 | **HTTPS forcé** | Redirection 301 + HSTS (Vercel et Caddy) | `curl -I http://…` → 301 vers https ; en-tête HSTS présent |
| 5 | **Bannière cookies** | Catégories, refus aussi simple que l'acceptation, préférences rouvrables | Aucun traceur non essentiel avant consentement (test réseau) |
| 6 | **Meta title / description** | `generateMetadata` par page, titres uniques < 60 car., descriptions < 160 | Audit : 0 doublon, 0 manquant |
| 7 | **Image réseaux (OG/Twitter)** | `opengraph-image` par film/personne/article, 1200×630 | Test avec outil d'aperçu de partage |
| 8 | **Favicon** | SVG + `.ico` + `apple-touch-icon` + icônes PWA 192/512 + maskable | Affichage vérifié (onglet, écran d'accueil) |
| 9 | **Sitemap** | `app/sitemap.ts` dynamique (films, personnes, actualités, pages), `lastModified`, `hreflang` | `/sitemap.xml` valide ; soumis à Search Console |
| 10 | **robots.txt** | `app/robots.ts` : autorise le public, interdit `/admin`, `/api`, privé ; lien du sitemap | `/robots.txt` conforme |
| 11 | **Texte alternatif des images** | Champ `alt` obligatoire en admin ; `alt=""` seulement si décoratif | Audit automatisé : 0 image sans `alt` |
| 12 | **Compression des images** | `sharp` à l'upload (AVIF/WebP + tailles multiples), `next/image` avec `sizes` | Poids affiche ≤ 100 Ko, héros ≤ 200 Ko |
| 13 | **Vitesse des pages** | Budget : LCP < 2,5 s · INP < 200 ms · CLS < 0,1 ; JS initial < 170 Ko gz | Lighthouse CI en échec si dépassé |
| 14 | **Contraste** | Paires de tokens vérifiées (≥ 4,5:1 texte, ≥ 3:1 UI) en sombre **et** clair | Script de contraste + axe sans erreur |
| 15 | **Pas de dégradé** | Aucun `gradient` dans le code ni dans les images | `rg -i "gradient" apps packages` ne trouve rien (hors justification écrite) |
| 16 | **Page 404** | `not-found.tsx` utile : recherche + **un seul CTA** (« Revenir à l'accueil »), motif graphique | Statut HTTP **404** réel |
| 17 | **Réparer les liens cassés** | `lychee` en CI sur le site construit ; table `Redirect` ; 301 à chaque changement de slug | Rapport CI : 0 lien mort interne |
| 18 | **Validation des formulaires** | Zod client + serveur, messages clairs, erreurs liées aux champs | Tests E2E (champs vides, invalides, trop longs) |
| 19 | **Anti-spam** | Honeypot + Turnstile + limites | Test automatisé de rafale → 429 |
| 20 | **Protection OWASP / ZAP** | `06-SECURITY.md` §7 | Rapports ZAP archivés |
| 21 | **Un seul CTA** | Un bouton principal par vue | Revue visuelle + avertissement dev ; capture de chaque écran clé |
| 22 | **Middleware** | `proxy.ts` (HTTPS/domaine canonique, langue, garde `/admin`, CSP/nonce) | Tests des redirections et des en-têtes |
| 23 | Déconnexion + sauvegarde de l'état | PRD FR-082/083 | Test E2E : connexion → actions → déconnexion → rien de privé restant |
| 24 | Sons + interactions | `05` §8 | Réglage « Sons » fonctionnel et sauvegardé |
| 25 | Loader fourni | `05` §6 | Utilisé tel quel, accessible, arrêté en mouvement réduit |
| 26 | Responsive + sensation d'app | Mobile, tablette, PC ; PWA installable | Lighthouse PWA + tests sur appareil réel (Android milieu de gamme) |

## B. SEO technique détaillé

**URL** : `/fr/films/{slug}`, `/fr/personnes/{slug}`, `/fr/actualites/{slug}`, `/fr/courts-metrages`, `/fr/categories/{slug}`. Slugs lisibles, stables, sans accents ni identifiants numériques seuls. Canonical sur chaque page. Une URL = un contenu.

**Rendu** : pages publiques rendues côté serveur (HTML complet pour Googlebot), pas de contenu critique chargé uniquement côté client.

**Données structurées (JSON-LD)** :

| Page | Type | Remarques |
|---|---|---|
| Film | `Movie` (ou `VideoObject` pour la bande-annonce) | `name`, `description`, `image`, `datePublished`, `director`, `actor`. **Ne jamais exposer l'URL du flux protégé** dans `contentUrl` |
| Personne | `Person` | `name`, `image`, `description`, `sameAs` (réseaux), `jobTitle` |
| Actualité | `NewsArticle` / `Article` | `headline`, `datePublished`, `dateModified`, `author`, `image` |
| Accueil | `Organization` + `WebSite` | Logo, réseaux, nom |
| Fil d'Ariane | `BreadcrumbList` | Toutes les pages profondes |

Valider avec le test de résultats enrichis de Google. Aucune donnée structurée qui ne correspond pas au contenu visible.

**Contenu indexable** : résumés de films, biographies, actualités en HTML (jamais en image). Chaque fiche a un titre `<h1>` unique, un résumé ≥ 150 mots quand c'est possible, des liens internes (film ↔ personnes ↔ catégories).

**Performance (SEO)** : Core Web Vitals, images modernes, polices auto-hébergées, pas de scripts bloquants, `preconnect` seulement vers `media.*`.

**i18n** : `hreflang` + `x-default`, `<html lang>` correct, sitemap par langue.

**Suivi** : Google Search Console + Bing Webmaster Tools, vérification du domaine, rapports d'indexation mensuels.

**Pages à ne pas indexer** : `/admin`, `/me`, résultats de recherche internes, pages de connexion (`noindex`).

## C. Contenus légaux (plan à faire rédiger/valider par un juriste)

> L'IA **ne rédige pas le texte juridique définitif**. Elle prépare la structure et laisse des zones `[À COMPLÉTER — validation juridique]`.

### C0. Cadre applicable
- **RDC** : Ordonnance-loi n° 23/010 du 13 mars 2023 portant Code du numérique (protection des données à caractère personnel, cybersécurité, services numériques). Les sources consultées indiquent que l'autorité de protection des données prévue n'était pas encore pleinement constituée et que ses fonctions étaient provisoirement confiées à l'ARPTIC — **à revérifier à la date de rédaction**.
- **RGPD (UE)** : appliqué par prudence (utilisateurs ou diaspora dans l'UE) et comme référence de bonnes pratiques.
- **Droit d'auteur** : respecter le droit congolais et les conventions internationales ; **faire valider** par un juriste (texte de référence à confirmer).

### C1. Politique de confidentialité (« RGPD »)
Responsable du traitement (identité, contact, **DPO/délégué** si désigné) · données collectées et finalités · bases légales · destinataires et sous-traitants (Vercel, hébergeur du VPS, e-mail, Cloudflare, Sentry…) · transferts hors RDC et garanties · durées de conservation (tableau `03` §5) · **droits** (accès, rectification, effacement, opposition, portabilité, retrait du consentement) et comment les exercer (e-mail dédié + suppression/export dans le compte) · sécurité · mineurs · cookies · modification de la politique · date de version.

### C2. CGU
Objet · accès libre et comptes · règles de conduite · **propriété intellectuelle** et usage des films (streaming personnel, interdiction de téléchargement/reproduction/redistribution) · contenus des créateurs et licence accordée à E-Ciné (V2) · signalement et **procédure de retrait** · responsabilité · suspension de compte · publicités (futur) · droit applicable et juridiction · contact · date de version.

### C3. Mentions légales
Éditeur (E-Ciné, adresse, contact), directeur de publication, hébergeurs (Vercel + hébergeur du VPS), crédits.

### C4. Politique cookies et bannière
Catégories : **Nécessaires** (toujours actifs : session, sécurité, préférences de thème/son/langue) · **Mesure d'audience** · **Publicité** (V2). Tout est **refusé par défaut** sauf nécessaires. Boutons « Tout refuser » et « Tout accepter » **de même importance visuelle**, plus « Personnaliser ». Choix mémorisé (6 à 12 mois), modifiable via un lien permanent dans le pied de page. Aucun script non essentiel chargé avant consentement. Preuve du consentement : `ConsentRecord`.

> Note UX : sur la bannière aussi, **un seul CTA principal** — utiliser « Tout refuser » et « Tout accepter » comme deux boutons de même poids (la neutralité l'emporte ici sur la règle du bouton unique, car le refus doit être aussi simple que l'acceptation).

## D. Qualité et accessibilité (portes de livraison)

- Lighthouse (mobile) : Performance ≥ 90 · Accessibilité ≥ 95 · Bonnes pratiques ≥ 95 · SEO ≥ 95.
- axe : 0 violation critique/sérieuse sur les écrans clés.
- Tests manuels : clavier seul, lecteur d'écran (TalkBack), zoom 200 %, mode sombre/clair, réseau lent (« 3G rapide » simulé), appareil Android d'entrée de gamme.
- Tests de non-régression visuelle sur les écrans clés (mobile/tablette/PC, sombre/clair).
