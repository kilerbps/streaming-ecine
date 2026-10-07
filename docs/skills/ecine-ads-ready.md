---
name: ecine-ads-ready
description: Préparer l'arrivée de publicités dans E-Ciné sans refonte (emplacements, composant AdSlot, consentement, CSP, ads.txt, performance, UX respectueuse). À utiliser dès qu'on dessine une mise en page ou un modèle de données pouvant accueillir de la pub.
---

# Compétence : publicités (prévoir dès maintenant, activer plus tard)

## Principe
**V1 : zéro pub affichée**, mais l'architecture est prête. Tout est piloté par `SiteSettings.adsEnabled` (drapeau) et par le consentement.

## Emplacements nommés (`placement`)
| Clé | Où | Format |
|---|---|---|
| `feed-native` | Tous les ~8 éléments du feed | Tuile native « Sponsorisé » |
| `film-sidebar` | Page film (PC/tablette) | 300×250 ou native |
| `article-inline` | Dans les actualités | Native |
| `player-preroll` | Avant lecture (V3, à discuter) | Vidéo courte, ignorable ≤ 5 s |
| `home-banner` | Sous l'en-tête (PC) | 728×90 / responsive |

## Règles techniques
1. **`AdSlot`** : composant unique ; reçoit `placement` ; rend **un espace de hauteur fixe** (pas de saut de mise en page, CLS ≈ 0) ; rend `null` si pub désactivée ou consentement absent.
2. **Consentement** : catégorie « Publicité » refusée par défaut ; aucun script pub avant accord ; relecture du choix à chaque chargement.
3. **CSP** : domaines publicitaires ajoutés **uniquement** quand `adsEnabled` ; SRI quand possible ; `proxy.ts` ajuste la CSP.
4. **Chargement** : scripts après interaction/visibilité (IntersectionObserver), `async`, jamais bloquants ; ne doit pas dégrader LCP/INP (surveiller en CI : Lighthouse avec pubs simulées).
5. **`ads.txt`** servi à la racine quand une régie est choisie.
6. **Données** (V2) : `AdCampaign`, `AdCreative`, journal d'impressions/clics **agrégé** (sans identifiant personnel sans consentement). Admin : création de campagnes, dates, emplacements, aperçu, arrêt d'urgence.
7. **Sponsors directs** (recommandé pour démarrer) : créatifs servis par E-Ciné (images compressées + lien), sans script tiers → plus rapide, plus sûr, plus respectueux.
8. **Sécurité** : iframes sandboxées, `rel="sponsored noopener"`, aucun script tiers dans l'admin.

## UX respectueuse
Étiquette **« Sponsorisé »** visible ; pas de pub qui imite un contenu éditorial sans étiquette ; pas de pop-up ; pas d'autoplay sonore ; pas de pub pendant la lecture d'un court-métrage en V1 ; fermeture/masquage quand c'est pertinent ; **un seul CTA** de la page n'est jamais celui de la pub (la pub reste visuellement secondaire).

## Décisions à prendre avec le propriétaire (Q6)
Sponsors directs d'abord ou régie (AdSense/Ad Manager) ? Quels emplacements ? Calendrier ? Mesure et facturation ? Normes (Better Ads Standards) ?

## Checklist
- [ ] `AdSlot` sans saut de mise en page
- [ ] Désactivé par défaut, drapeau testé
- [ ] Rien chargé sans consentement
- [ ] CSP conditionnelle
- [ ] Étiquette « Sponsorisé »
- [ ] Impact perf mesuré
