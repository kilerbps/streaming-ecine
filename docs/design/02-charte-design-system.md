# 02 · Charte « Nuit de Kin » et design system v2

Fichier cible : remplace `docs/05-DESIGN-SYSTEM.md` et alimente `packages/design-tokens/tokens.css`.

## Principes de la direction « Nuit de Kin »

L'interface est une salle de cinéma plongée dans le noir : elle s'efface pour que les affiches et les visages congolais occupent l'écran. Six principes tranchent les cas que ce document ne prévoit pas.

1. **L'affiche d'abord.** Le chrome (barres, boutons, cadres) occupe le moins de place possible ; aucune bordure autour d'une affiche, aucun cadre autour d'une rangée.
2. **Le bleu fait, le rouge se passe.** Le bleu `#1E76BC` signale ce qu'on peut faire (bouton principal, lien, sélection). Le rouge `#D7262B` signale un moment (progression, Top 10, Nouveau, J'aime). Aucune autre couleur vive dans l'interface.
3. **Une seule audace.** La marque s'exprime par deux signatures et nulle part ailleurs : le clap au lancement d'un film et le coin coupé des badges.
4. **Natif avant original.** Gestes, tailles de texte, positions des boutons et comportements suivent iOS et Android ; on ne réinvente pas ce que la main connaît déjà.
5. **Léger par construction.** Tout effet coûteux (flou, ombre, aperçu vidéo, halo) a une version allégée définie dès le départ.
6. **La forme suit la taille.** Plus un élément est grand, plus son rayon est grand ; un élément intérieur a un rayon égal au rayon extérieur moins la marge qui les sépare.

**Ce que la direction refuse**, pour ne pas ressembler à un gabarit générique : fond crème, surtitres en capitales espacées, police à chasse fixe pour les métadonnées, flèche « → » ajoutée aux liens (« Voir le film → » devient une affiche cliquable), grilles de trois cartes identiques, dégradés décoratifs, emojis, police Inter, métadonnées enchainées par des points médians.

## Lecture du logo et règles d'usage

Le logo est une caméra construite avec les lettres É et C : des blocs bleus séparés par des canaux blancs, un objectif triangulaire à droite, deux barres inclinées d'environ 5° en haut qui forment l'accent et le clap, et un badge rouge « E-ciné » au coin inférieur gauche coupé à 45°. La charte en tire trois éléments et pas un de plus.

| Élément du logo | Ce que la charte en fait |
| --- | --- |
| Bleu `#1E76BC` des blocs | Couleur d'action, en aplat (boutons, sélection) ; une teinte plus claire `#6AB0F3` pour le texte des liens en thème Nuit |
| Rouge du badge (`#D7262B`, dégradé du `#B01E23` au `#FF2026` environ) | Couleur de moment, en aplat ; le dégradé reste exclusif au logo |
| Barres inclinées du clap | Animation de lancement d'un film (voir Mouvement) et écran de démarrage de l'app |
| Coin coupé du badge | Forme des badges « Nouveau », « TOP 10 », « Court-métrage », « Bientôt » |
| Canaux blancs entre les blocs | Base des illustrations d'états vides et d'erreur, qui remplacent les motifs textiles provisoires |

Cette lecture complète l'ADR-0003 : les couleurs de marque restent interdites comme couleur de texte, mais deviennent des aplats d'action et de signal.

**Versions et règles**

| Version | Usage | Taille minimale |
| --- | --- | --- |
| Complète (caméra + badge) | Écran de démarrage, À propos, pied de page PC | 96 px de large |
| Symbole (caméra seule) | En-tête mobile (28 px de haut), icônes d'app | 24 px de haut |
| Glyphe simplifié (blocs sans canaux fins) | Favicon 16 et 32 px | 16 px |
| Monochrome blanc | Lecteur, images de partage, sur photo | 24 px de haut |
| Monochrome bleu nuit `#0A0F16` | Thème Jour sur fond clair chargé, impressions | 24 px de haut |

- **Zone de protection** : la hauteur d'une barre du clap, sur les quatre côtés.
- **Interdits** : recolorer, étirer, ajouter ombre ou halo, faire pivoter, poser le logo en couleur sur une zone chargée d'une image sans voile, utiliser le badge seul comme logo.
- **Icône d'app installable** : symbole blanc sur fond `#1E76BC`, zone utile de 80 % pour la version « maskable ».
- **Fichier source** : le SVG actuel est redessiné à partir d'un PNG (dette n° 2). Les agents ne le redessinent pas une seconde fois ; ils demandent le SVG officiel et génèrent ensuite toutes les déclinaisons par script.

## Couleurs

Le thème Nuit est le thème par défaut ; le thème Jour est complet. Les contrastes ci-dessous ont été calculés selon WCAG 2.2 et doivent être recopiés dans `packages/design-tokens/contrast-pairs.json` pour que `pnpm check:contrast` les vérifie à chaque build.

| Jeton | Rôle | Nuit | Jour | Contraste minimal |
| --- | --- | --- | --- | --- |
| `--bg` | Fond de page | `#0A0F16` | `#F5F7FA` | — |
| `--surface-1` | Feuilles, champs, cartes de texte | `#111823` | `#FFFFFF` | — |
| `--surface-2` | Appui, skeleton, pastilles | `#1A2330` | `#EBEFF5` | — |
| `--surface-3` | Menus, notifications | `#243042` | `#FFFFFF` + ombre | — |
| `--border` | Séparateurs décoratifs | blanc à 10 % | `#0A0F16` à 10 % | Décoratif, non contrôlé |
| `--border-strong` | Bordures de champs | `#5B6B80` | `#7A8699` | 3,3:1 sur surface-1 Nuit, 3,4:1 sur fond Jour |
| `--text` | Texte principal | `#F4F6FA` | `#0A0F16` | 12,3:1 sur surface-3 Nuit |
| `--text-muted` | Texte secondaire | `#A7B1C2` | `#4A5568` | 6,1:1 sur surface-3 Nuit, 7,0:1 sur fond Jour |
| `--text-subtle` | Métadonnées tertiaires | `#7D8899` | `#5F6B7D` | 5,0:1 sur surface-1 Nuit ; **interdit sur surface-2 et surface-3 en Nuit** |
| `--accent` | Fond du bouton principal, sélection | `#1E76BC` | `#1E76BC` | Texte blanc 4,8:1 ; 4,0:1 contre le fond Nuit |
| `--accent-pressed` | Bouton principal appuyé | `#17629E` | `#17629E` | Texte blanc 6,4:1 |
| `--accent-text` | Liens, onglet actif, icône active | `#6AB0F3` | `#17629E` | 5,8:1 sur surface-3 Nuit, 6,0:1 sur fond Jour |
| `--on-accent` | Texte et icônes sur l'accent | `#FFFFFF` | `#FFFFFF` | Voir `--accent` |
| `--signal` | Fond des badges, barre de progression, cœur plein | `#D7262B` | `#D7262B` | Texte blanc 5,0:1 ; 3,8:1 contre le fond Nuit |
| `--signal-text` | Texte rouge (« Nouveau » sans badge) | `#FF6B6F` | `#C41E24` | 4,8:1 sur surface-3 Nuit, 5,5:1 sur fond Jour |
| `--success` | Succès | `#3FB97A` | `#1E7A4C` | 7,7:1 Nuit, 5,0:1 Jour |
| `--danger` | Erreur, suppression | `#F2685C` | `#B3261E` | 6,3:1 Nuit, 6,1:1 Jour |
| `--warning` | Connexion lente, attention | `#F2B33D` | `#8A5A00` | 10,3:1 Nuit, 5,5:1 Jour |
| `--focus` | Contour de focus de 2 px décalé de 2 px | `#FFFFFF` | `#0A0F16` | > 17:1 |
| `--overlay` | Voile derrière les feuilles | noir à 60 % | `#0A0F16` à 50 % | — |
| `--chrome` | Matériau de navigation | `#111823` à 72 % + flou 24 px | blanc à 72 % + flou 24 px | Texte posé dessus : celui de surface-1 |
| `--chrome-solid` | Repli du matériau | `#111823` | `#FFFFFF` | — |

**Lecteur (identique dans les deux thèmes)** : fond `#000000`, commandes `#FFFFFF`, piste blanc à 24 %, partie chargée blanc à 48 %, partie lue `--signal`. Ces valeurs remplacent `--player-track` et `--player-buffered`, restés en attente de validation.

**Les trois dégradés autorisés (D-01)**

| Jeton | Usage | Valeur |
| --- | --- | --- |
| `--scrim-bottom` | Sous le texte posé sur une image (affiche à la une, fiche, extrait) | Du fond opaque en bas à transparent à 75 % de la hauteur, palier à 80 % d'opacité à 35 % |
| `--scrim-top` | Derrière l'en-tête transparent sur image | Fond à 60 % en haut → transparent sur 120 px |
| `--ambient` | Halo en haut de l'accueil et des fiches | Radial, couleur dominante de l'affiche à 35 %, transparent à 70 % ; supprimé en mode allégé |

Le dégradé rouge du badge reste dans le fichier du logo et n'est jamais reproduit en CSS. Les couleurs d'état ne sont jamais le seul signal : icône et texte les accompagnent toujours.

**Point à vérifier (ADR-0004)** : la couleur dominante du halo est propre à chaque film. Si la politique CSP bloque les attributs `style`, l'agent la quantifie en 24 teintes servies par des classes générées, au lieu d'une variable CSS en ligne.

## Typographie

Deux familles seulement : la police du système pour tout ce qui se lit, Archivo pour ce qui se regarde. La police du système (SF Pro sur iPhone, Roboto ou la police du constructeur sur Android) donne la sensation native et ne coûte aucun octet ; Archivo, grotesque robuste aux allures d'affiche, répond aux blocs massifs du logo.

| Famille | Jeton | Chargement | Rôle |
| --- | --- | --- | --- |
| Système | `--font-ui` : `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", "Helvetica Neue", Arial, sans-serif` | Aucun fichier | Interface, texte courant, boutons, métadonnées, chiffres du lecteur |
| Archivo | `--font-display` | `next/font/google`, graisses 700 et 800, sous-ensemble latin, `display: swap`, ajustement de la police de repli activé ; 45 Ko au total au plus, sinon 800 seule | Titres d'affiche à la une, titres de fiche, titres d'écran, chiffres du Top 10 |

IBM Plex est retirée des deux mises en page (`app/[locale]/layout.tsx` et `app/admin/layout.tsx`, piège connu : les polices y sont déclarées deux fois). L'administration n'utilise qu'Archivo pour son titre d'écran et la police du système pour le reste.

| Style | Mobile (taille / interligne) | PC | Graisse et famille | Usage |
| --- | --- | --- | --- | --- |
| Affiche | 34 / 38 | 56 / 60 | Archivo 800, approche −2 % | Titre sur l'affiche à la une et la fiche, si le film n'a pas de titre dessiné |
| Titre 1 | 28 / 32 | 40 / 44 | Archivo 800 | Titre d'écran : Nouveautés, Moi, Recherche |
| Titre 2 | 20 / 25 | 24 / 30 | Système 700 | Titre de rangée, titre de section de fiche |
| En-tête | 17 / 22 | 17 / 22 | Système 600 | Titre de feuille, titre de carte d'actualité |
| Corps | 16 / 24 | 16 / 26 | Système 400 | Synopsis, biographie, article |
| Appel | 15 / 20 | 15 / 22 | Système 400 | Texte des feuilles et des réglages |
| Sous-titre | 14 / 20 | 14 / 20 | Système 500 | Métadonnées, pastilles, boutons secondaires |
| Note | 13 / 18 | 13 / 18 | Système 400 | Titre sous une affiche (2 lignes au plus), aides de champ |
| Légende | 12 / 16 | 12 / 16 | Système 600 | Badges, temps sur les tuiles |
| Onglet | 11 / 13 | — | Système 600 | Libellés de la barre d'onglets |
| Chiffre Top 10 | 112 de haut | 160 de haut | Archivo 800, contour de 2 px `--text-muted`, intérieur couleur du fond | Rang dans la rangée Top 10 |

**Réglages**

- Chiffres tabulaires (`font-variant-numeric: tabular-nums`) pour les temps, compteurs et durées.
- `text-wrap: balance` sur les titres, `pretty` sur les paragraphes ; 70 caractères par ligne au plus.
- Casse de phrase partout (« Ma liste », « Bientôt sur E-Ciné »), jamais de capitales espacées ; seule exception, le mot « TOP » du badge.
- Les chiffres du Top 10 sont décoratifs (`aria-hidden`) ; le rang est annoncé dans le libellé de la tuile (« Numéro 3 du Top 10 : {titre} »).
- Le texte grossit avec le réglage de taille du téléphone : toutes les tailles sont en `rem`, et les mises en page tiennent jusqu'à 200 %.

## Formes, espacements, élévation, matériaux

Les rayons suivent la taille des éléments et s'emboîtent : un élément intérieur prend le rayon de son conteneur moins la marge qui les sépare. C'est ce qui donne l'allure « Apple » sans copier Apple.

| Jeton | Valeur | Usage |
| --- | --- | --- |
| `--radius-xs` | 4 px | Barres de progression, badges (avec coin coupé) |
| `--radius-sm` | 8 px | Affiches et vignettes dans les rangées |
| `--radius-md` | 12 px | Boutons, champs, cartes d'actualité, menus |
| `--radius-lg` | 16 px | Affiche à la une sur mobile, grandes cartes paysage, image de l'aperçu rapide |
| `--radius-xl` | 24 px | Coins hauts des feuilles, panneaux centrés sur PC |
| `--radius-full` | 9999 px | Barre d'onglets, bouton Recherche, pastilles, portraits, boutons icônes ronds |

**Coin coupé des badges** : hauteur 20 px, marges internes de 8 px, coin inférieur gauche coupé de 6 px (`clip-path: polygon(0 0, 100% 0, 100% 100%, 6px 100%, 0 calc(100% - 6px))`), trois autres coins à 4 px.

**Espacements** (grille de 4 px) : 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96. Marge de page 16 px sur mobile, 32 px sur tablette, 48 px au-delà de 1 056 px, 64 px au-delà de 1 312 px. 8 px entre deux affiches d'une rangée, 32 px entre deux rangées. Les rangées vont jusqu'au bord de l'écran ; seul le texte long est limité à 70 caractères.

**Largeur des affiches en rangée** : 112 px sur mobile (soit 3 affiches entières et le bord de la 4e sur un écran de 390 px, ce qui invite à glisser), 148 px sur tablette, 184 px sur PC.

| Niveau | Éléments | Nuit | Jour |
| --- | --- | --- | --- |
| 0 | Page | `--bg` | `--bg` |
| 1 | Feuilles, cartes de texte, champs | `--surface-1`, sans ombre | `--surface-1`, sans ombre |
| 2 | Barre d'onglets, en-tête après défilement | Matériau `--chrome`, liseré haut blanc à 8 % | `--chrome` + ombre `0 8px 24px` à 12 % |
| 3 | Menus, notifications, infobulles | `--surface-3`, bordure `--border`, ombre `0 12px 32px` noire à 24 % | Blanc, ombre `0 12px 32px` à 16 % |
| 4 | Feuilles modales | `--surface-1` sur `--overlay` | `--surface-1` sur `--overlay` |

Aucune ombre sur une affiche, une carte ou un bouton.

**Matériau translucide** : `background: var(--chrome)`, `backdrop-filter: blur(24px) saturate(160%)`, bordure de 1 px blanche à 8 %. Il est remplacé par `--chrome-solid` dans quatre cas : navigateur sans `backdrop-filter`, `prefers-reduced-transparency: reduce`, mode allégé (`data-perf="lite"`), économie de données active. Il ne s'applique qu'à la barre d'onglets, au bouton Recherche, à l'en-tête après défilement et à la barre de navigation PC.

**Cibles tactiles** : 44 × 44 px au minimum, 8 px entre deux cibles voisines. Une icône de 24 px reçoit une zone de toucher invisible de 44 px.

## Iconographie Solar

L'icône fournie par le client est « Home Smile » du jeu Solar, en style Bold Duotone (le calque à 50 % d'opacité crée le deuxième ton). Solar est publié par 480 Design sous licence CC BY 4.0 : usage commercial libre, attribution obligatoire. Il propose six styles (Linear, Line Duotone, Bold, Bold Duotone, Broken, Outline) dessinés avec des angles adoucis à 100 % ([dépôt 480 Design](https://github.com/480-Design/Solar-Icon-Set), [fiche Eagle](https://community-en.eagle.cool/resource/solar-icons)).

| Contexte | Style | Taille | Couleur |
| --- | --- | --- | --- |
| Onglet ou élément au repos | Linear (trait 1,5 px) | 24 px | `--text-muted` |
| Onglet ou élément actif | Bold Duotone | 24 px | `--accent-text`, calque secondaire à 50 % |
| J'aime actif | Bold | 24 px | `--signal` |
| Ma liste active, rappel actif | Bold Duotone | 24 px | `--accent-text` |
| Icône dans un bouton ou une pastille | Linear | 20 px | Couleur du texte du bouton |
| Commandes du lecteur | Bold | 28 px, 40 px pour lecture et pause au centre | `--player-fg` |
| Métadonnée en ligne (durée, date) | Linear | 16 px | `--text-subtle` |
| Administration | Linear ; Bold Duotone pour l'entrée de menu active | 20 px | `--text-muted` / `--accent-text` |

**Passage au repos → actif** : fondu croisé entre les deux styles en 150 ms et légère mise à l'échelle de 0,88 à 1 avec le ressort « vif » ; pour J'aime, montée à 1,2 puis retour à 1 en 240 ms.

**Correspondance** : noms pressentis à confirmer dans `@iconify-json/solar` (suffixes `-linear`, `-bold`, `-bold-duotone`). Si un nom n'existe pas, l'agent choisit l'icône la plus proche du même jeu et met ce tableau à jour ; il ne mélange jamais deux jeux d'icônes.

| Sens | Nom Solar pressenti | Remplace l'icône maison |
| --- | --- | --- |
| Accueil | `home-smile` | accueil |
| Découvrir | `clapperboard-play` | film |
| Nouveautés | `fire` | actualités |
| Moi | `user-circle` | utilisateur |
| Recherche | `magnifer` | recherche |
| Ma liste | `bookmark` | marque-page |
| J'aime | `heart` | cœur |
| Partager | `share` | partage |
| Me le rappeler | `bell` | — (nouveau) |
| Lecture, pause | `play`, `pause` | lecture, pause |
| Reculer, avancer de 10 s | `rewind-10-seconds-back`, `rewind-10-seconds-forward` | ±10 s |
| Son, muet | `volume-loud`, `volume-cross` | volume |
| Plein écran | `full-screen-square` / `quit-full-screen-square` | plein écran |
| Réglages, sous-titres | `settings`, `subtitles` | réglages, sous-titres |
| Fermer, retour, suite | `close-circle`, `alt-arrow-left`, `alt-arrow-right` | — |
| Signaler, surprise | `flag`, `magic-stick-3` | drapeau, surprise |
| Thème, économie de données | `sun`, `moon`, `leaf` | soleil, lune, économie |
| Administration | `widget`, `users-group-rounded`, `gallery`, `tag`, `document-text`, `chart-2`, `shield-check`, `eye`, `trash-bin-trash`, `pen`, `upload-minimalistic`, `calendar` | icônes d'administration |

**Fabrication, sans appel réseau** : `@iconify-json/solar` en dépendance de développement ; un script `scripts/build-icons.ts` lit `packages/design-tokens/icons.json` (sens → nom Solar → styles utilisés) et génère `apps/web/src/components/ui/icons/solar.generated.tsx`, en `currentColor`. Le composant `Icon` garde son API (`name`, `variant`, `size`) pour que les écrans changent peu. Aucun chargement depuis l'API Iconify au runtime (CSP, données, vie privée).

**Attribution** : « Icônes : Solar Icon Set par 480 Design, licence CC BY 4.0 », avec lien, dans À propos, dans les mentions légales et dans `THIRD_PARTY_NOTICES.md`.

## Mouvement

Le mouvement répond à la main et montre ce qui a changé ; il ne décore jamais. Seules deux choses bougent sans geste de la personne : l'avancée de l'affiche à la une et les aperçus muets autorisés.

| Jeton | Valeur | Usage |
| --- | --- | --- |
| `--dur-press` | 100 ms | Enfoncement au toucher |
| `--dur-fast` | 150 ms | Couleur, fondu, changement d'icône |
| `--dur-base` | 250 ms | Passage d'un écran à l'autre, sortie de feuille |
| `--dur-slow` | 400 ms | Affiche qui devient la fiche, changement d'affiche à la une |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Entrées et déplacements |
| `--ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Sorties |
| `--ease-emphasized` | `cubic-bezier(0.05, 0.7, 0.1, 1)` | Transition partagée affiche → fiche |
| `--spring-smooth` | Ressort raideur 170, amortissement 26, masse 1 : sans dépassement, ≈ 500 ms | Feuilles, indicateur d'onglet |
| `--spring-snappy` | Ressort raideur 400, amortissement 30, masse 1 : dépassement ≈ 3 %, ≈ 350 ms | Relâchement d'un appui, icône d'onglet, clap |

Les ressorts sont écrits en CSS avec la fonction `linear()` (48 points), générés par `scripts/springs.ts` à partir des paramètres ci-dessus et stockés dans `tokens.css`. Aucune bibliothèque d'animation n'est nécessaire pour eux.

| Interaction | Animation |
| --- | --- |
| Appui sur une affiche ou une carte | Échelle 0,97 en 100 ms, retour en `--spring-snappy` au relâchement |
| Appui sur un bouton icône | Échelle 0,92, même retour |
| Changement d'onglet | Icône qui passe en Bold Duotone, pastille d'indicateur qui glisse sous l'onglet en `--spring-smooth` ; contenu en fondu de 150 ms |
| Ouverture d'une feuille | Montée depuis le bas en `--spring-smooth` ; pendant le glissement, la feuille suit le doigt au pixel près ; au lâcher, elle rejoint le point d'arrêt le plus proche selon la vitesse |
| Approfondissement (liste → détail) | Nouvel écran depuis 30 % à droite avec fondu, ancien écran vers −10 % et assombri, 250 ms |
| Affiche → fiche | L'affiche s'agrandit jusqu'à l'image de la fiche, 400 ms |
| Notification | Montée de 12 px et fondu en 200 ms, sortie en fondu de 150 ms |
| Image qui arrive | Fondu de 240 ms depuis l'aperçu flou |
| J'aime | Cœur qui se remplit de rouge, échelle 1 → 1,2 → 1 en 240 ms |
| Skeleton | Pulsation d'opacité de 0,55 à 1 en 1,2 s |
| Barre d'onglets au défilement | Contenu de la pastille réduit à 0,85 et libellés en fondu, 250 ms ; la hauteur de la boîte ne change pas |

**Le clap, signature de marque** : au toucher de « Regarder », les deux barres inclinées du logo pivotent de −5° à 0° et descendent de 2 px en `--spring-snappy`, avec une vibration de 12 ms et le son « clap » si les sons sont actifs. L'ensemble dure 240 ms au plus et se joue pendant que la vidéo se prépare : il ne retarde jamais la première image.

**Règles** : seules `transform` et `opacity` s'animent (jamais `height`, `top` ou `width`) ; en mouvement réduit, tout déplacement passe à 0 ms, seuls les fondus de 150 ms au plus restent, le skeleton et le clap sont figés, les transitions de page deviennent instantanées.

## Composants

Les primitives restent dans `apps/web/src/components/ui/` et gardent leurs noms quand ils existent, pour limiter les changements dans les écrans. Chacune est présentée dans tous ses états sur la page `/design`, en Nuit et en Jour, avant d'être utilisée ailleurs.

| Composant | Anatomie et tailles | États | Règle clé |
| --- | --- | --- | --- |
| Bouton (`button.tsx`) | Hauteurs 52 (affiche à la une), 44, 36 (admin) ; rayon 12 ; icône 20 à gauche ; variantes `primary`, `secondary` (`--surface-2`), `on-image` (blanc à 16 % + flou), `ghost`, `danger` | Appuyé (`--accent-pressed`, échelle 0,97), désactivé (opacité 0,4), en cours (libellé gardé, loader de 20 px après 300 ms) | Un seul `primary` visible, `data-cta="primary"` conservé |
| Bouton icône | Rond de 44, icône 24, fond transparent ou `--surface-2` ; libellé visible dessous dans les rangées d'actions | Repos, appuyé, actif (`aria-pressed`) | Toujours un `aria-label` |
| Tuile affiche | Image 2:3 rayon 8, titre dessous sur 2 lignes (style Note) sauf si l'affiche porte déjà le titre ; badge en haut à gauche ; barre de progression en bas pour Reprendre | Appuyé, focus, en chargement (aperçu flou) | Toute la tuile est le lien ; appui long = menu contextuel |
| Tuile paysage | Image 16:9 rayon 12, titre et « 38 min restantes » dessous | Idem | Pour Reprendre et Courts-métrages |
| Tuile Top 10 | Chiffre Archivo de 112 px à gauche, affiche 2:3 qui le chevauche de 16 px | Idem | Rang annoncé dans le libellé accessible |
| Affiche à la une | Mobile : carte 4:5 rayon 16, marges 16, voile bas, titre, genres, boutons. PC : plein cadre 16:9, texte aligné à gauche dans les 40 % de gauche | Avance toutes les 7 s si visible, pause au geste ; tirets de progression | 5 titres au plus |
| Rangée | Titre 2 + lien « Tout voir » (icône chevron, cible 44) ; défilement horizontal natif avec `scroll-snap-type: x proximity` | Skeleton, vide (rangée masquée) | `content-visibility: auto` au-delà de la 3e rangée |
| Pastille | Hauteur 36, rayon complet, `--surface-2` ; sélectionnée : `--accent` et texte blanc | Repos, appuyé, sélectionnée | Défilement horizontal si trop nombreuses |
| Contrôle segmenté | Conteneur rayon complet `--surface-2`, curseur qui glisse en `--spring-smooth` | Segment actif | 2 à 4 segments |
| Badge | 20 px, coin coupé ; `signal` (Nouveau, TOP 10), `neutral` (Court-métrage), `accent` (Bientôt) | — | Jamais plus de 2 badges par tuile |
| Barre de progression | 3 px, piste blanc à 24 %, partie lue `--signal` | — | Masquée sous 2 min et au-delà de 95 % |
| Feuille (`sheet.tsx`) | Poignée 36 × 5, coins hauts 24, points d'arrêt 60 % et 92 % ; titre + bouton Fermer 44 ; sur PC panneau centré de 560 px | Ouverte, glissée, fermée (glisser vers le bas au-delà de 30 % ou vite) | Base Radix Dialog conservée : piège du focus, Échap |
| Notification (`toast.tsx`) | Pastille `--surface-3` au-dessus de la barre d'onglets + 12 px ; icône, texte, action facultative « Annuler » | 4,5 s, 6 s avec action ; glisser pour fermer | Une à la fois, `role=status` |
| Champ de recherche | Hauteur 44, rayon complet, `--surface-2`, icône loupe, bouton Effacer | Focus, saisie, chargement | Fonctionne sans JavaScript, comme aujourd'hui |
| Portrait | Rond de 72 (mobile) ou 96 (PC), nom sur 2 lignes, rôle en `--text-subtle` | Appuyé | Lien vers la fiche talent |
| Interrupteur | 51 × 31, curseur en `--spring-snappy`, vert `--success` actif | Activé, désactivé, verrouillé | `role="switch"`, libellé cliquable |
| Menu contextuel | Affiche agrandie au-dessus, liste `--surface-3` rayon 12, lignes de 44 | Ouvert par appui long (500 ms) ou clic droit | Toujours un équivalent visible (bouton « … ») |
| État vide (`empty-state.tsx`) | Illustration construite avec les blocs du logo, Titre 2, une phrase, un bouton | — | Dit quoi faire, jamais « rien ici » seul |
| Skeleton (`loader.tsx`) | Formes `--surface-2` aux dimensions exactes : ligne de texte, affiche, tuile paysage, rangée, affiche à la une | Pulsation, figé en mouvement réduit | Jamais de décalage de mise en page au remplacement |
| Loader orbital | Inchangé (imposé par le propriétaire), 45 px, couleur par `--loader-color` | — | Seulement pour les attentes de plus de 300 ms qui n'ont pas de skeleton |

## Fichier `tokens.css` cible

Ce fichier remplace `packages/design-tokens/tokens.css` au lot 1. Les valeurs des ressorts sont générées par `scripts/springs.ts` ; tout le reste est à recopier tel quel, puis à relier à Tailwind v4 dans `apps/web/src/app/globals.css` (points de rupture inchangés : attention, `sm:` s'applique dès 320 px).

```css
/* packages/design-tokens/tokens.css — E-Ciné v2 « Nuit de Kin » */
:root {
  /* Marque (logo et aplats uniquement, jamais en couleur de texte) */
  --brand-blue: #1e76bc;
  --brand-red: #d7262b;

  /* Typographie */
  --font-ui: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", "Helvetica Neue", Arial, sans-serif;
  --font-display: var(--font-archivo), var(--font-ui); /* --font-archivo posé par next/font */

  /* Rayons */
  --radius-xs: 4px; --radius-sm: 8px; --radius-md: 12px;
  --radius-lg: 16px; --radius-xl: 24px; --radius-full: 9999px;

  /* Espacements */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-5: 20px;
  --space-6: 24px; --space-8: 32px; --space-10: 40px; --space-12: 48px; --space-16: 64px; --space-24: 96px;

  /* Ergonomie */
  --target: 44px; --tabbar-h: 64px; --tabbar-h-compact: 48px; --header-h: 56px;
  --safe-bottom: env(safe-area-inset-bottom, 0px);

  /* Mouvement */
  --dur-press: 100ms; --dur-fast: 150ms; --dur-base: 250ms; --dur-slow: 400ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);
  --ease-emphasized: cubic-bezier(0.05, 0.7, 0.1, 1);
  --spring-smooth: linear(/* généré : k=170, c=26, m=1 */);
  --spring-smooth-dur: 500ms;
  --spring-snappy: linear(/* généré : k=400, c=30, m=1 */);
  --spring-snappy-dur: 350ms;

  /* Lecteur, identique dans les deux thèmes */
  --player-bg: #000000; --player-fg: #ffffff;
  --player-track: rgb(255 255 255 / 0.24);
  --player-buffered: rgb(255 255 255 / 0.48);
  --player-played: var(--brand-red);
}

[data-theme="dark"] {
  color-scheme: dark;
  --bg: #0a0f16; --surface-1: #111823; --surface-2: #1a2330; --surface-3: #243042;
  --border: rgb(255 255 255 / 0.10); --border-strong: #5b6b80;
  --text: #f4f6fa; --text-muted: #a7b1c2; --text-subtle: #7d8899;
  --accent: #1e76bc; --accent-pressed: #17629e; --accent-text: #6ab0f3; --on-accent: #ffffff;
  --signal: #d7262b; --signal-text: #ff6b6f;
  --success: #3fb97a; --danger: #f2685c; --warning: #f2b33d;
  --focus: #ffffff; --overlay: rgb(0 0 0 / 0.60);
  --chrome: rgb(17 24 35 / 0.72); --chrome-solid: #111823; --chrome-edge: rgb(255 255 255 / 0.08);
  --shadow-float: none;
  --shadow-menu: 0 12px 32px rgb(0 0 0 / 0.24);
  --scrim-bottom: linear-gradient(to top, rgb(10 15 22 / 1) 0%, rgb(10 15 22 / 0.8) 35%, rgb(10 15 22 / 0) 75%);
  --scrim-top: linear-gradient(to bottom, rgb(10 15 22 / 0.6), rgb(10 15 22 / 0));
}

[data-theme="light"] {
  color-scheme: light;
  --bg: #f5f7fa; --surface-1: #ffffff; --surface-2: #ebeff5; --surface-3: #ffffff;
  --border: rgb(10 15 22 / 0.10); --border-strong: #7a8699;
  --text: #0a0f16; --text-muted: #4a5568; --text-subtle: #5f6b7d;
  --accent: #1e76bc; --accent-pressed: #17629e; --accent-text: #17629e; --on-accent: #ffffff;
  --signal: #d7262b; --signal-text: #c41e24;
  --success: #1e7a4c; --danger: #b3261e; --warning: #8a5a00;
  --focus: #0a0f16; --overlay: rgb(10 15 22 / 0.50);
  --chrome: rgb(255 255 255 / 0.72); --chrome-solid: #ffffff; --chrome-edge: rgb(10 15 22 / 0.06);
  --shadow-float: 0 8px 24px rgb(10 15 22 / 0.12);
  --shadow-menu: 0 12px 32px rgb(10 15 22 / 0.16);
  --scrim-bottom: linear-gradient(to top, rgb(245 247 250 / 1) 0%, rgb(245 247 250 / 0.8) 35%, rgb(245 247 250 / 0) 75%);
  --scrim-top: linear-gradient(to bottom, rgb(245 247 250 / 0.6), rgb(245 247 250 / 0));
}

/* Halo d'ambiance : --ambient-color posé par l'écran (ou classe quantifiée si la CSP l'exige) */
.ambient { background: radial-gradient(120% 60% at 50% 0%, color-mix(in oklab, var(--ambient-color, transparent) 35%, transparent), transparent 70%); }

/* Matériau de navigation et ses replis */
.chrome { background: var(--chrome); backdrop-filter: blur(24px) saturate(160%); -webkit-backdrop-filter: blur(24px) saturate(160%); border: 1px solid var(--chrome-edge); box-shadow: var(--shadow-float); }
@supports not (backdrop-filter: blur(1px)) { .chrome { background: var(--chrome-solid); } }
@media (prefers-reduced-transparency: reduce) { .chrome { background: var(--chrome-solid); backdrop-filter: none; } }
[data-perf="lite"] .chrome, [data-savedata="on"] .chrome { background: var(--chrome-solid); backdrop-filter: none; }
[data-perf="lite"] .ambient, [data-savedata="on"] .ambient { background: none; }

/* Mouvement réduit */
@media (prefers-reduced-motion: reduce) {
  :root { --dur-press: 0ms; --dur-base: 0ms; --dur-slow: 0ms; --spring-smooth-dur: 0ms; --spring-snappy-dur: 0ms; }
}
```

Après recopie, `check:gradient` doit accepter `--scrim-bottom`, `--scrim-top` et `.ambient`, et refuser tout autre dégradé dans `apps/web/src`.
