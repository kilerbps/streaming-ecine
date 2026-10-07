---
name: ecine-design-system
description: Appliquer l'identité visuelle d'E-Ciné (structure Carbon, artistique, sombre + clair, sans dégradé, anti « look IA »), le loader imposé, les sons et le responsive. À utiliser pour tout écran, composant ou style.
---

# Compétence : design system E-Ciné

Source complète : `docs/05-DESIGN-SYSTEM.md`. Résumé opérationnel :

## Règles non négociables
1. **Un seul CTA principal** par écran.
2. **Aucun dégradé** (CSS, SVG, image, skeleton shimmer, voile sur affiche). Lisibilité sur image = bandeau plein ou texte sous l'image.
3. Angles droits (0–2 px), bordures 1 px, **pas d'ombres décoratives**.
4. **Tokens uniquement** (`--bg`, `--surface-1`, `--text`, `--accent`…) ; thème par `data-theme`, valeur lue côté serveur (pas de flash).
5. Contraste ≥ 4,5:1 (texte) / 3:1 (UI, focus) en sombre **et** clair ; couleurs finales = celles du logo (Q1).
6. Typo : IBM Plex Serif (titres), Plex Sans (interface), Plex Mono (méta). Corps ≥ 16 px.
7. Grille : unité 8 px ; ruptures 320 / 672 / 1056 / 1312 / 1584.
8. Mouvement 70/150/240 ms, `prefers-reduced-motion` respecté.

## Anti « look IA » (refuser)
Dégradés violet/bleu · glassmorphism · cartes très arrondies à ombre douce · icônes en pastilles colorées · hero centré générique · lorem · emojis-icônes · 3 cartes identiques · Inter par défaut · rebonds partout · badges « New » partout.

## Loader
Utiliser le loader orbital de `05` §6 tel quel (classe `.ecine-loader`, couleur `--text`, `role="status"`, animation coupée en mouvement réduit). Pour les attentes > ~300 ms. **Pas de skeleton** sauf nécessité (zone de hauteur connue) : aplat + pulsation d'opacité.

## Sons / haptique
Service `sound.ts` unique ; sprite ≤ 100 Ko ; démarrage après geste ; réglage « Sons » visible et sauvegardé ; aperçus du feed muets ; haptique `navigator.vibrate` optionnelle. Table des événements : `05` §8.

## Mobile « application en main »
Barre d'onglets en bas, bottom sheets, `100dvh`, `safe-area`, cibles ≥ 44 px, gestes simples, retours sonores/haptiques, transitions de vue. Tablette : rail latéral. PC : navigation latérale + raccourcis clavier.

## Motifs
3–5 motifs géométriques SVG en aplat, **validés avec l'INA** ; usage parcimonieux (séparateurs, 404, états vides, démarrage PWA).

## Checklist visuelle
- [ ] Un seul CTA principal
- [ ] `rg -i gradient` vide
- [ ] Contrastes vérifiés (script)
- [ ] Sombre + clair, mobile + tablette + PC
- [ ] Focus visible, clavier complet
- [ ] Aucun élément de la liste « look IA »
- [ ] Captures soumises au propriétaire
