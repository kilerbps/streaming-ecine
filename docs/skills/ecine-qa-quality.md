---
name: ecine-qa-quality
description: Vérifier la qualité d'E-Ciné avant livraison (tests, accessibilité, contraste, performance, liens, formulaires, 404, responsive, absence de dégradé, un seul CTA). À utiliser à la fin de chaque tâche et avant chaque mise en production.
---

# Compétence : qualité et recette

## Portes de livraison (preuves obligatoires)
| Contrôle | Outil | Seuil |
|---|---|---|
| Types, lint, tests | `pnpm typecheck && pnpm lint && pnpm test` | 0 erreur |
| E2E parcours PRD §8 | Playwright (mobile + PC, sombre + clair) | Tous verts |
| Accessibilité | axe + clavier + TalkBack | 0 violation critique/sérieuse |
| Contraste | `pnpm check:contrast` | ≥ 4,5:1 texte · ≥ 3:1 UI, sombre **et** clair |
| Dégradés | `pnpm check:gradient` | Aucun |
| Performance | Lighthouse CI (mobile) | Perf ≥ 90 · LCP < 2,5 s · INP < 200 ms · CLS < 0,1 |
| SEO | Lighthouse + test résultats enrichis | ≥ 95, JSON-LD valide |
| Liens | `pnpm check:links` (lychee) | 0 lien interne mort |
| Sécurité | `pnpm audit`, gitleaks, ZAP baseline | Aucune alerte moyenne non justifiée |
| Formulaires | E2E | Champs vides/invalides/trop longs/spam gérés |
| 404/500/hors-ligne | E2E | Statut HTTP correct, un seul CTA |
| Poids des images | Script | Affiche ≤ 100 Ko, héros ≤ 200 Ko |

## Recette manuelle (checklist)
- [ ] 320 / 672 / 1056 / 1312 px, portrait/paysage
- [ ] Sombre et clair, pas de flash au chargement
- [ ] Un seul CTA principal par écran (capture)
- [ ] Connexion à la demande → reprise de l'action
- [ ] Déconnexion : rien de privé en cache ni en stockage local
- [ ] État sauvegardé : thème, son, langue, position de lecture, brouillon
- [ ] Sons/haptique avec réglage ; aucun son sans geste
- [ ] Réseau lent simulé ; mode avion ; reprise
- [ ] Appareil Android d'entrée de gamme réel
- [ ] Lecture : qualité auto/manuelle, sous-titres, reprise ; aucune URL MP4 ; clé refusée sans jeton
- [ ] Bannière cookies : refus aussi simple ; aucun traceur avant accord
- [ ] Pages légales présentes, versionnées
- [ ] Sitemap, robots, favicon, OG vérifiés

## Compte rendu de recette (format)
```
Tâche : …
Preuves : commandes + sorties résumées, captures (mobile/PC, sombre/clair)
Non testé : …
Risques restants : …
Questions pour le propriétaire : …
```

## Règle
Pas de « terminé » sans preuve. Un bug corrigé = un test qui échouait avant. Les écarts sont **listés**, jamais corrigés en silence ni masqués par désactivation d'une règle.
