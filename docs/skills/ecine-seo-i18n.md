---
name: ecine-seo-i18n
description: Référencement Google et internationalisation d'E-Ciné (métadonnées, JSON-LD Movie/Person/NewsArticle, sitemap, robots, OG, hreflang, next-intl, images). À utiliser pour toute page publique ou ajout de langue.
---

# Compétence : SEO + i18n

## Objectifs métier
Résumés de films indexés · fiches acteurs visibles sur Google · actualités visibles · **une page unique avec son lien par film** · balises (titre, description, mots-clés) configurées.

## Règles
1. URLs : `/fr/films/{slug}`, `/fr/personnes/{slug}`, `/fr/actualites/{slug}`, `/fr/categories/{slug}` ; slugs stables, sans accents ; canonical partout ; changement de slug ⇒ 301 (`Redirect`).
2. Rendu serveur : le HTML contient le contenu (résumé, bio, article). Rien de critique chargé seulement côté client.
3. `generateMetadata` : titre unique < 60 car., description < 160, Open Graph + Twitter, `alternates` (canonical, hreflang). Champs SEO éditables en admin (`seoTitle`, `seoDescription`) avec valeurs par défaut calculées. **Mots-clés** : balise `keywords` facultative (peu utilisée par Google) — surtout travailler titres, descriptions et contenu.
4. JSON-LD : `Movie`/`VideoObject` (jamais l'URL du flux protégé), `Person`, `NewsArticle`, `BreadcrumbList`, `Organization` + `WebSite`. Doit refléter le contenu visible. Valider avec le test de résultats enrichis.
5. `app/sitemap.ts` dynamique (films, personnes, actualités, pages, `lastModified`, `alternates`) ; `app/robots.ts` (interdit `/admin`, `/me`, recherche interne ; lien du sitemap). `noindex` pour connexion, compte, recherche interne.
6. Images : `alt` obligatoire, AVIF/WebP, `sizes`, nom de fichier parlant, dimensions ; image OG 1200×630 par contenu ; favicon complet (SVG, ICO, Apple touch, PWA 192/512 maskable).
7. Maillage : film ↔ personnes ↔ catégories ↔ actualités liées ; fil d'Ariane.
8. Performance = SEO : Core Web Vitals (LCP < 2,5 s, INP < 200 ms, CLS < 0,1).
9. Suivi : Search Console + Bing Webmaster, rapport d'indexation mensuel.

## i18n
- `next-intl`, `fr` obligatoire, route `/[locale]`, `<html lang>`, `hreflang` + `x-default`.
- Aucun texte d'interface en dur : `messages/fr.json`. Dates/nombres via `Intl`.
- Contenu éditorial : tables `*Translation` ; **repli sur `fr`** si traduction manquante (avec `noindex` sur la page non traduite).
- Ajouter une langue = fichier de messages + traductions de contenu + sitemap ; **zéro changement de composant**. Candidates (Q7) : anglais, lingala, swahili, kikongo, tshiluba (prévoir polices/caractères, direction du texte inchangée).

## Checklist
- [ ] Meta + OG + canonical + hreflang
- [ ] JSON-LD valide
- [ ] Sitemap/robots corrects
- [ ] `alt` partout, images compressées
- [ ] Aucun doublon de titre
- [ ] Lighthouse SEO ≥ 95
