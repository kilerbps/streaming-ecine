# 05 — Design system E-Ciné v2 « Nuit de Kin »

> **v2, 8 octobre 2026.** Remplace la v1 (structure Carbon, angles droits, IBM Plex). Source : la charte du propriétaire, `docs/design/02-charte-design-system.md` ; décisions D-01 à D-14 validées le 8 octobre 2026 (`docs/design/00-prd-refonte.md`) ; ADR-0011, qui amende l'ADR-0003.
> **Source unique des valeurs** : `packages/design-tokens/tokens.css`. Ce document explique les règles ; il ne recopie pas les valeurs qui vivent dans le code.
> **Vitrine** : la page `/design` (non indexée, réservée à l'équipe) montre chaque composant dans chaque état, en Nuit et en Jour, en mouvement réduit et en mode allégé. Un composant n'est utilisé dans un écran qu'après y avoir été présenté.

## 1. Principes

L'interface est une salle de cinéma plongée dans le noir : elle s'efface pour que les affiches et les visages congolais occupent l'écran.

1. **L'affiche d'abord.** Le chrome (barres, boutons, cadres) prend le moins de place possible. Aucune bordure autour d'une affiche, aucun cadre autour d'une rangée.
2. **Le bleu fait, le rouge se passe.** Le bleu `#1E76BC` signale ce qu'on peut faire (bouton principal, lien, sélection). Le rouge `#D7262B` signale un moment (progression, Top 10, Nouveau, J'aime). Aucune autre couleur vive.
3. **Une seule audace.** La marque s'exprime par deux signatures : le clap au lancement d'un film et le coin coupé des badges.
4. **Natif avant original.** Gestes, tailles de texte, positions des boutons et comportements suivent iOS et Android.
5. **Léger par construction.** Tout effet coûteux (flou, ombre, aperçu vidéo, halo) a une version allégée définie dès le départ.
6. **La forme suit la taille.** Plus un élément est grand, plus son rayon est grand. Un élément intérieur prend le rayon de son conteneur moins la marge qui les sépare.
7. **Un seul bouton principal par vue** (`data-cta="primary"`, vérifié par les tests E2E).

**Refusé** : fond crème · surtitres en capitales espacées · police à chasse fixe pour les métadonnées · flèche « → » ajoutée aux liens · grilles de trois cartes identiques · dégradés décoratifs · emojis · police Inter · métadonnées enchaînées par des points médians.

## 2. Logo

Le logo est une caméra construite avec les lettres É et C : blocs bleus séparés par des canaux blancs, objectif triangulaire, deux barres inclinées d'environ 5° (accent et clap), badge rouge « E-ciné » au coin inférieur gauche coupé à 45°. La charte en tire trois éléments et pas un de plus :

| Élément du logo | Usage dans l'interface |
| --- | --- |
| Bleu des blocs | Couleur d'action en aplat (`--accent`) ; teinte claire `--accent-text` pour les liens en Nuit |
| Rouge du badge | Couleur de moment en aplat (`--signal`) ; le dégradé du badge reste exclusif au fichier du logo |
| Barres du clap | Animation de lancement d'un film et écran de démarrage (lot 4) |
| Coin coupé | Forme des badges (`.badge-cut`) |
| Canaux blancs | Illustrations des états vides et d'erreur (`illustration.tsx`), qui remplacent les motifs textiles (D-13) |

| Version | Usage | Taille minimale |
| --- | --- | --- |
| Complète (caméra + badge) | Démarrage, À propos, pied de page PC | 96 px de large |
| Symbole (caméra seule) | En-tête mobile (28 px de haut), icônes d'app | 24 px de haut |
| Glyphe simplifié | Favicon 16 et 32 px | 16 px |
| Monochrome blanc | Lecteur, images de partage, sur photo | 24 px de haut |
| Monochrome bleu nuit `#0A0F16` | Jour sur fond clair chargé, impression | 24 px de haut |

- Zone de protection : la hauteur d'une barre du clap, sur les quatre côtés.
- Interdits : recolorer, étirer, ajouter ombre ou halo, faire pivoter, poser le logo en couleur sur une image sans voile, utiliser le badge seul.
- Icône d'app : symbole blanc sur `#1E76BC`, zone utile de 80 % pour la version « maskable ».
- **Le SVG actuel est reconstitué depuis un PNG.** Il n'est pas redessiné une seconde fois : on attend le SVG officiel (`[À FOURNIR]` par le propriétaire). Sources : `packages/design-tokens/logo/logo.svg` (complet) et `symbol.svg` (caméra seule). `pnpm brand:build` (`scripts/build-brand.ts`) en génère toutes les déclinaisons : icônes de l'app (192, 512, maskable), icône Apple, favicon SVG, écrans de démarrage iPhone et leur liste pour les métadonnées. Le composant `logo.tsx` reprend la même géométrie et sera mis à jour avec le SVG officiel.

## 3. Couleurs

Thème **Nuit** par défaut, thème **Jour** complet ; thème choisi par `data-theme` sur `<html>`, rendu côté serveur. Les couleurs de marque ne servent jamais de couleur de texte. Les couleurs d'état ne sont jamais le seul signal : une icône et un texte les accompagnent.

| Jeton | Rôle | Classe Tailwind |
| --- | --- | --- |
| `--bg` | Fond de page | `bg-bg` |
| `--surface-1` | Feuilles, champs, cartes de texte | `bg-surface-1` |
| `--surface-2` | Appui, skeleton, pastilles | `bg-surface-2` |
| `--surface-3` | Menus, notifications | `bg-surface-3` |
| `--border` | Séparateurs décoratifs (non contrôlé) | `border-border` |
| `--border-strong` | Bordures de champs (≥ 3:1) | `border-border-strong` |
| `--text` · `--text-muted` · `--text-subtle` | Texte principal, secondaire, tertiaire | `text-text` · `text-muted` · `text-subtle` |
| `--accent` · `--accent-pressed` | Fond du bouton principal, sélection ; état appuyé | `bg-accent` · `bg-accent-pressed` |
| `--accent-text` | Liens, onglet actif, icône active | `text-accent-text` |
| `--on-accent` | Texte et icônes posés sur l'accent ou le signal | `text-on-accent` |
| `--signal` | Fond des badges, progression, cœur plein | `bg-signal` |
| `--signal-text` | Texte rouge sans badge | `text-signal-text` |
| `--success` · `--danger` · `--warning` | États | `text-success` … |
| `--focus` | Contour de focus 2 px décalé de 2 px | (base) |
| `--overlay` | Voile derrière les feuilles | `bg-overlay` |
| `--chrome` · `--chrome-solid` · `--chrome-edge` | Matériau de navigation et son repli | `.chrome` |
| `--on-image` · `--on-image-text` | Bouton posé sur une image (blanc à 16 %) | variante `on-image` |

- **`--text-subtle` est interdit sur `surface-2` et `surface-3` en Nuit** (contraste insuffisant).
- **Les zones d'image sont toujours en Nuit** (décision du propriétaire, 8 octobre 2026) : affiche à la une, haut de fiche, aperçus. Leur conteneur porte `data-theme="dark"` : voiles sombres, texte et boutons `on-image` blancs, même en thème Jour ; le reste de la page suit le thème. Les voiles `--scrim-*` sont donc les mêmes dans les deux thèmes.
- **Lecteur, identique dans les deux thèmes** : `--player-bg` noir, `--player-fg` blanc, piste blanc à 24 %, partie chargée blanc à 48 %, partie lue `--signal`. Ces valeurs tranchent l'ancien point « en attente » de `--player-track` / `--player-buffered`.
- **Couleur de la barre du navigateur** : `apps/web/src/lib/theme-colors.ts`, contrôlé par `pnpm check:tokens` (doit égaler `--bg` de chaque thème).
- **Contrastes** : les 32 paires de `packages/design-tokens/contrast-pairs.json` sont vérifiées par `pnpm check:contrast` (WCAG 2.2 : texte ≥ 4,5:1, grands textes et composants ≥ 3:1).

**Les trois dégradés autorisés (D-01)** — définis une seule fois, dans `tokens.css` :

| Jeton | Usage |
| --- | --- |
| `--scrim-bottom` | Sous un texte posé sur une image (affiche à la une, fiche, extrait) |
| `--scrim-top` | Derrière l'en-tête transparent sur image (boutons ronds `on-image` Retour et Partager) |
| `.ambient` | Halo radial en haut de l'accueil et des fiches, couleur dominante de l'affiche (`--ambient-color`) ; supprimé en mode allégé |

`pnpm check:gradient` refuse tout autre dégradé dans `apps/` et `packages/`. La CSP autorise les attributs `style` (`style-src-attr 'unsafe-inline'`, ADR-0004) : la couleur dominante est donc posée en variable CSS en ligne, sans quantification.

## 4. Typographie

Deux familles : **la police du système** pour tout ce qui se lit (0 octet, sensation native), **Archivo** pour ce qui se regarde (grotesque d'affiche qui répond aux blocs du logo).

| Famille | Jeton | Chargement | Rôle |
| --- | --- | --- | --- |
| Système | `--font-ui` (`font-sans`) | Aucun fichier | Interface, texte courant, boutons, métadonnées, chiffres du lecteur |
| Archivo | `--font-display` (`font-display`) | `next/font/google` dans `apps/web/src/app/fonts.ts` : 700 et 800, latin, `display: swap`, police de repli ajustée ; **≤ 45 Ko**, sinon 800 seule | Titres d'affiche, de fiche, d'écran ; chiffres du Top 10 |

IBM Plex est retirée des deux mises en page (`app/[locale]/layout.tsx` et `app/admin/layout.tsx`). L'administration n'utilise Archivo que pour son titre d'écran.

| Style | Mobile | PC | Famille et graisse | Usage |
| --- | --- | --- | --- | --- |
| Affiche | 34 / 38 | 56 / 60 | Archivo 800, approche −2 % | Titre sur l'affiche à la une et la fiche |
| Titre 1 (`h1`) | 28 / 32 | 40 / 44 | Archivo 800 | Titre d'écran |
| Titre 2 (`h2`) | 20 / 25 | 24 / 30 | Système 700 | Titre de rangée, de section |
| En-tête | 17 / 22 | 17 / 22 | Système 600 | Titre de feuille, de carte d'actualité |
| Corps | 16 / 24 | 16 / 26 | Système 400 | Synopsis, biographie, article |
| Appel | 15 / 20 | 15 / 22 | Système 400 | Feuilles et réglages |
| Sous-titre | 14 / 20 | 14 / 20 | Système 500 | Métadonnées, pastilles, boutons secondaires |
| Note | 13 / 18 | 13 / 18 | Système 400 | Titre sous une affiche (2 lignes au plus), aides |
| Légende | 12 / 16 | 12 / 16 | Système 600 | Badges, temps sur les tuiles |
| Onglet | 11 / 13 | — | Système 600 | Libellés de la barre d'onglets |
| Chiffre Top 10 | 112 de haut | 160 de haut | Archivo 800, contour 2 px `--text-muted` | `.top10-rank`, décoratif (`aria-hidden`) |

- Chiffres tabulaires (`tabular-nums`) pour temps, compteurs, durées.
- `text-wrap: balance` sur les titres, `pretty` sur les paragraphes ; 70 caractères par ligne au plus.
- **Casse de phrase partout** (D-14), jamais de capitales espacées ; seule exception : le mot « TOP » du badge.
- Tailles en `rem` : les mises en page tiennent jusqu'à 200 % de grossissement.

## 5. Formes, espacements, élévation, matériaux

| Jeton | Valeur | Usage | Classe |
| --- | --- | --- | --- |
| `--radius-xs` | 4 px | Progression, badges | `rounded-xs` |
| `--radius-sm` | 8 px | Affiches et vignettes en rangée | `rounded-sm` |
| `--radius-md` | 12 px | Boutons, champs, cartes, menus | `rounded-md` |
| `--radius-lg` | 16 px | Affiche à la une mobile, grandes cartes paysage | `rounded-lg` |
| `--radius-xl` | 24 px | Coins hauts des feuilles, panneaux PC | `rounded-xl` |
| `--radius-full` | 9999 px | Barre d'onglets, pastilles, portraits, boutons icônes | `rounded-full` |

- **Badge à coin coupé** (`.badge-cut`) : hauteur 20 px, marges 8 px, coin inférieur gauche coupé de 6 px, autres coins à 4 px.
- **Espacements** (grille de 4 px) : 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96. Marge de page (`.container-page`) : 16 px mobile, 32 px tablette, 48 px dès 1 056 px, 64 px dès 1 312 px. 8 px entre deux affiches, 32 px entre deux rangées. Les rangées vont jusqu'au bord de l'écran.
- **Affiches en rangée** (`.tile-size`, `--tile-w`) : 112 px mobile (3 affiches et le bord de la 4e sur 390 px), 148 px tablette, 184 px PC.
- **Points de rupture** inchangés : `sm 320` · `md 672` · `lg 1056` · `xl 1312` · `2xl 1584`. Attention : `sm:` s'applique à tous les téléphones.

| Niveau | Éléments | Nuit | Jour |
| --- | --- | --- | --- |
| 0 | Page | `--bg` | `--bg` |
| 1 | Feuilles, cartes de texte, champs | `--surface-1`, sans ombre | idem |
| 2 | Barre d'onglets, en-tête après défilement | `.chrome`, liseré `--chrome-edge` | `.chrome` + `--shadow-float` |
| 3 | Menus, notifications | `--surface-3` + `--shadow-menu` | blanc + `--shadow-menu` |
| 4 | Feuilles modales | `--surface-1` sur `--overlay` | idem |

**Aucune ombre sur une affiche, une carte ou un bouton** (D-03).

**Matériau translucide** (`.chrome`, D-04) : flou 24 px et saturation 160 %, uniquement sur la barre d'onglets, le bouton Recherche, l'en-tête après défilement et la navigation PC. Remplacé par `--chrome-solid` sans `backdrop-filter`, avec `prefers-reduced-transparency`, en mode allégé (`data-perf="lite"`) et en économie de données (`data-savedata="on"`).

**Cibles tactiles** : 44 × 44 px au minimum (`--target`), 8 px entre deux cibles.

## 6. Icônes Solar

Un seul jeu : **Solar Icon Set**, par 480 Design, licence **CC BY 4.0** (D-06). Attribution dans `THIRD_PARTY_NOTICES.md`, `docs/licences.md`, À propos et mentions légales.

- **Fabrication sans appel réseau** : `@iconify-json/solar` (dépendance de développement) → `pnpm icons:build` (`scripts/build-icons.ts`) lit `packages/design-tokens/icons.json` (sens → nom Solar → styles) et génère `apps/web/src/components/ui/icons/solar.generated.tsx`, en `currentColor`. **`icons.json` fait foi pour la correspondance** ; ne jamais modifier le fichier généré à la main.
- **Composant** : `<Icon name size filled variant />` (`components/ui/icon.tsx`), API inchangée depuis la v1. `filled` choisit le style actif de l'icône (Bold Duotone, ou Bold pour J'aime).

| Contexte | Style | Taille | Couleur |
| --- | --- | --- | --- |
| Onglet ou élément au repos | Linear | 24 | `--text-muted` |
| Onglet ou élément actif | Bold Duotone | 24 | `--accent-text` |
| J'aime actif | Bold | 24 | `--signal` |
| Dans un bouton ou une pastille | Linear | 20 | Couleur du texte du bouton |
| Commandes du lecteur | Bold | 28 ; 40 pour lecture/pause au centre | `--player-fg` |
| Métadonnée en ligne | Linear | 16 | `--text-subtle` |
| Administration | Linear ; Bold Duotone pour l'entrée active | 20 | `--text-muted` / `--accent-text` |

`pnpm check:icons` refuse toute autre bibliothèque d'icônes, tout `<svg>` écrit en dur hors du logo, des illustrations et des icônes générées, et un fichier généré périmé.

## 7. Mouvement

Le mouvement répond à la main et montre ce qui a changé ; il ne décore jamais. Seules deux choses bougent sans geste : l'avancée de l'affiche à la une et les aperçus muets autorisés.

| Jeton | Valeur | Usage |
| --- | --- | --- |
| `--dur-press` | 100 ms | Enfoncement au toucher |
| `--dur-fast` | 150 ms | Couleur, fondu, changement d'icône |
| `--dur-base` | 250 ms | Changement d'écran, sortie de feuille |
| `--dur-slow` | 400 ms | Affiche → fiche, changement d'affiche à la une |
| `--ease-standard` · `--ease-exit` · `--ease-emphasized` | courbes de Bézier | Entrées · sorties · transition partagée |
| `--spring-smooth` | raideur 170, amortissement 26 : 0 % de dépassement, 500 ms | Feuilles, indicateur d'onglet, contrôle segmenté |
| `--spring-snappy` | raideur 400, amortissement 30 : 2,8 % de dépassement, 350 ms | Relâchement d'un appui, icône d'onglet, interrupteur, clap |

Les ressorts sont des fonctions CSS `linear()` de 48 points, **générées** par `pnpm tokens:springs` (`scripts/springs.ts`) entre les marqueurs `springs:start` et `springs:end` de `tokens.css`. Aucune bibliothèque d'animation.

| Interaction | Animation | Mise en œuvre |
| --- | --- | --- |
| Appui sur une affiche, une carte, un bouton | Échelle 0,97 en 100 ms, retour en ressort vif | `.press` |
| Appui sur un bouton icône | Échelle 0,92, même retour | `.press-icon` |
| Ouverture d'une feuille | Montée en ressort doux ; suit le doigt ; point d'arrêt le plus proche au lâcher | `sheet.tsx` |
| Notification | Montée de 12 px et fondu | `ecine-toast-in` |
| Image qui arrive | Couleur dominante → aperçu flou → image ; fondu de 240 ms | `media-image.tsx` (fondu au lot 3, avec le calcul de la couleur et de l'aperçu à l'envoi) |
| Skeleton | Pulsation d'opacité 0,55 → 1 en 1,2 s, apparition après 150 ms | `.skeleton` |
| Changement d'onglet, approfondissement, affiche → fiche, clap | Voir `docs/design/03-experience-native.md` | Lots 2 et 4 |

**Règles** : seules `transform` et `opacity` s'animent (jamais `height`, `top`, `width`). En mouvement réduit (`prefers-reduced-motion` ou `data-motion="reduce"`), les déplacements passent à 0 ms, seuls les fondus de 150 ms au plus restent, le skeleton et le loader sont figés.

## 8. Composants

Tous dans `apps/web/src/components/ui/`, présentés sur `/design`.

| Composant | Fichier | Règle clé |
| --- | --- | --- |
| Bouton | `button.tsx`, `button-styles.ts`, `link-button.tsx` | Variantes `primary`, `secondary`, `on-image`, `ghost`, `danger` ; tailles `lg` 52, `md` 44, `sm` 36 ; en cours : libellé gardé, loader 20 px après 300 ms, `aria-busy` ; un seul `primary` visible |
| Bouton icône | `icon-button.tsx` | Rond de 44, icône 24 ; `pressed` → `aria-pressed` et style actif ; toujours un `aria-label` |
| Badge | `badge.tsx` | Coin coupé ; `signal` (Nouveau, TOP 10), `neutral` (Court-métrage), `accent` (Bientôt) ; 2 badges par tuile au plus |
| Étiquette | `tag.tsx` | Bordée, casse normale |
| Pastille | `pill.tsx` | Hauteur 36, rayon complet ; sélectionnée en `--accent` |
| Contrôle segmenté | `segmented-control.tsx` | 2 à 4 segments, `radiogroup`, flèches du clavier, curseur en ressort doux |
| Interrupteur | `switch.tsx` | 51 × 31, `role="switch"`, `--success` actif, état verrouillé |
| Champ de recherche | `search-field.tsx` | Hauteur 44, bouton Effacer, fonctionne sans JavaScript |
| Champs de formulaire | `field.tsx` | Étiquette visible, aide et erreur liées par `aria-describedby` |
| Barre de progression | `progress-bar.tsx` | 3 px, partie lue `--signal` ; l'appelant la masque sous 2 min et au-delà de 95 % |
| Image | `media-image.tsx` | Couleur dominante, aperçu flou, point focal, illustration de repli |
| Tuiles | `tiles.tsx` | Affiche 2:3 rayon 8, paysage 16:9 rayon 12, Top 10 (rang annoncé dans le libellé), portrait rond ; toute la tuile est le lien |
| Rangée | `row.tsx` | Titre 2 + « Tout voir » ; défilement natif, `scroll-snap-type: x proximity` ; `content-visibility: auto` au-delà de la 3e rangée |
| Affiche à la une | `featured.tsx` | 5 titres au plus ; mobile 4:5 rayon 16, PC 16:9 ; avance toutes les 7 s si visible et hors mode allégé / mouvement réduit, s'arrête au premier geste |
| Feuille | `sheet.tsx` | Base Radix Dialog (piège du focus, Échap) ; glissable sur téléphone (fermeture au-delà de 30 % ou vite), points d'arrêt 60 % / 92 % ; panneau centré de 560 px sur PC |
| Menu contextuel | `context-menu.tsx` | Appui long ou clic droit, aperçu de l'affiche ; toujours un bouton « … » équivalent (`MoreMenu`) |
| Notification | `providers/toast.tsx` | Une à la fois, `role="status"` ; 4,5 s, 6 s avec action « Annuler » ; glisser pour fermer |
| État vide | `empty-state.tsx`, `illustration.tsx` | Illustration du logo, Titre 2, une phrase, un bouton ; dit quoi faire |
| Skeleton | `loader.tsx` | Formes aux dimensions exactes (texte, affiche, paysage, rangée, affiche à la une) ; aucun décalage au remplacement |
| Loader orbital | `loader.tsx` | Imposé par le propriétaire, inchangé (règles ci-dessous) |

## 9. Chargement

D'abord **éviter l'attente** (cache, préchargement, navigations instantanées, mises à jour optimistes).

- Pas de skeleton si la donnée arrive en moins de 150 ms : la classe `.skeleton` n'apparaît qu'après ce délai.
- Chaque route a un `loading.tsx` à la forme de l'écran (`components/ui/page-skeletons.tsx`).
- **Aucun `loading.tsx` au-dessus d'une décision 404 ou redirection** : dès qu'un skeleton s'affiche, le statut HTTP 200 est envoyé et ne peut plus changer (soft 404, redirection 301 perdue). Les listes et l'accueil sont dans des groupes de routes `(liste)` et `(accueil)` ; l'existence d'une fiche est vérifiée dans un `layout.tsx` de son segment, au-dessus de son skeleton. Une adresse inconnue doit toujours répondre 404 (test `e2e/coquille.spec.ts`).
- Skeleton = aplat `--surface-2` avec pulsation d'opacité. **Jamais de shimmer** (c'est un dégradé).
- **Loader orbital** (`.ecine-loader`, choisi par le propriétaire) : seulement pour une attente de plus de 300 ms sans skeleton (lecteur, action serveur longue). Couleur `--text`, surchargeable par `--loader-color` (le lecteur le met en blanc) ; `role="status"` et texte masqué ; figé en mouvement réduit. Taille 45 px, 20 px avec `ecine-loader--sm` (boutons en cours). Le CSS est dans `apps/web/src/app/globals.css`.

## 10. Sons et vibrations

Trois réglages dans Moi → Réglages (D-08), en cookies : **Vibrations** (`ecine_haptics`, activé), **Son au lancement d'un film** (`ecine_sound_clap`, activé), **Sons de l'interface** (`ecine_sound_ui`, coupé par défaut, car les apps natives sont silencieuses au toucher). `lib/haptics.ts` porte les durées de la charte (onglet 8 ms, J'aime 12 ms, point d'arrêt de feuille 6 ms, menu 20 ms…) ; `lib/sound.ts` ne garde que J'aime, Ma liste, succès, erreur et le clap.

- Aucun son avant un geste de l'utilisateur (politique d'autoplay des navigateurs).
- Sons courts (≤ 400 ms), jamais de musique ni de boucle ; vibration jamais essentielle.
- Toute ressource sonore tierce est tracée avec sa licence dans `docs/licences.md`.

## 10 bis. Coquille native (lot 2)

- **Barre d'onglets flottante** sous 1 056 px (`components/layout/navigation.tsx`) : Accueil, Découvrir, Nouveautés, Moi et bouton Recherche détaché ; matériau `.chrome`, lentille en ressort doux, rétraction au défilement (`lib/scroll-state.ts`), masquée clavier ouvert, retour en haut au second toucher, pastille rouge sur Nouveautés (`lib/news-seen.ts`), mémoire de défilement par onglet (`lib/tab-scroll.ts`). Place à laisser sous le contenu : `--tabbar-space`.
- **Navigation PC** (≥ 1 056 px) : `--topnav-h`, transparente puis `.chrome-bar` après 24 px.
- **En-tête mobile** : s'efface en descendant au-delà de 56 px, revient en remontant ; grand titre réduit (`LargeTitle`, `components/layout/header-title.tsx`).
- **Couches et retour d'Android** : feuilles et menus s'inscrivent dans l'historique (`lib/use-history-layer.ts`) ; un lien dans une feuille passe par `SheetLink`.
- **Tirer pour rafraîchir** : accueil et Nouveautés (`components/features/system/pull-to-refresh.tsx`), rebond natif coupé sur `html` et `body`.
- **Thème** Nuit, Jour ou Automatique : le bloc Automatique de `tokens.css` est généré depuis le thème Jour (`pnpm tokens:theme`). **Mode allégé** Automatique, Activé ou Désactivé : détecté avant l'affichage (`LITE_DETECTION_SCRIPT`, nonce), attributs `data-perf` et `data-savedata` rendus par le serveur (`server/html-preferences.tsx`).
- **Transitions de page** : `components/layout/page-transition.tsx` et gabarits `template.tsx`, sous `NEXT_PUBLIC_VIEW_TRANSITIONS`.
- **Application installable** : `components/pwa/install-prompt.tsx`, `lib/install.ts` ; déclinaisons du logo par `pnpm brand:build`.

## 11. Accessibilité

Clavier complet · focus visible (2 px, `--focus`) · ordre logique · `alt` utile · sous-titres du lecteur · pas d'information portée par la seule couleur · cibles ≥ 44 px · `aria-live` pour les notifications · texte grossissable à 200 % · audit axe sur mobile et PC dans les tests E2E · test au lecteur d'écran (TalkBack).

## 12. Contrôles automatiques

| Commande | Vérifie |
| --- | --- |
| `pnpm check:contrast` | Paires de `contrast-pairs.json`, Nuit et Jour |
| `pnpm check:gradient` | Aucun dégradé hors `--scrim-bottom`, `--scrim-top` et `.ambient` |
| `pnpm check:tokens` | Aucune couleur, aucun rayon, aucune ombre ni durée en dur dans `components/` et `app/` (exceptions : logo, images de partage, icônes générées, `globals.css`) ; `theme-colors.ts` = `--bg` |
| `pnpm check:icons` | Solar uniquement, aucun `<svg>` en ligne non autorisé, icônes générées à jour |
| `pnpm tokens:springs` · `pnpm icons:build` | Régénèrent les ressorts et les icônes |

Les quatre contrôles tournent dans la CI (`.github/workflows/ci.yml`).
