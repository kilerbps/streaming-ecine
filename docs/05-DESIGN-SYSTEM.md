# 05 — Design system E-Ciné

Style : **structure Carbon** (grille 2x, rigueur, tokens, états explicites) + **identité artistique congolaise** (typographie éditoriale, motifs géométriques inspirés des textiles d'Afrique centrale, photographie de plateau). Sombre par défaut, mode clair complet.

> Les couleurs ci-dessous sont **provisoires** (Q1 du README : le logo décide). Remplacer les accents par ceux du logo, puis **revérifier tous les contrastes**.

## 1. Principes

1. **Un seul CTA principal par écran.** Les autres actions sont des liens texte ou des boutons discrets.
2. **Aplats uniquement : aucun dégradé** (ni CSS, ni image, ni skeleton, ni voile sur affiche). Lisibilité sur image = bandeau plein ou texte sous l'image.
3. **Angles droits** (rayon 0 à 2 px), bordures 1 px, **pas d'ombres décoratives**.
4. **Contraste d'abord** : texte ≥ 4,5:1, grands textes et composants ≥ 3:1, focus visible ≥ 3:1.
5. **Contenu réel** : affiches, visages, plans de films. Pas d'illustrations génériques.
6. **Mouvement utile** : 150–250 ms, jamais bloquant, respect de `prefers-reduced-motion`.
7. **Sons et haptique** présents mais jamais imposés.
8. **Application en main** sur mobile : navigation en bas, gestes, zones tactiles ≥ 44 px, `safe-area`.

## 2. Anti « look IA » (liste de refus)

Refuser : dégradés violet/bleu · effets verre (glassmorphism) · cartes aux coins très arrondis avec ombre douce · icônes dans des pastilles colorées · hero centré « Bienvenue sur… » · texte de remplissage · emojis comme icônes · grille de 3 cartes identiques · police Inter par défaut · animations de rebond partout · badges « New » partout · mockups d'appareils.

Exiger : composition asymétrique éditoriale · grands titres en serif · métadonnées en monospace (année, durée, timecode) · photos cadrées sans filtre · motifs graphiques utilisés avec parcimonie · textes écrits pour E-Ciné (pas de lorem).

## 3. Tokens

### 3.1 Couleurs (CSS variables, thème par `data-theme="dark|light"`)

| Token | Sombre « Encre » | Clair « Papier » | Usage |
|---|---|---|---|
| `--bg` | `#121110` | `#F6F1EA` | Fond de page |
| `--surface-1` | `#1B1917` | `#FFFFFF` | Tuiles, cartes |
| `--surface-2` | `#25221F` | `#EDE6DC` | Zones imbriquées, survol |
| `--border` | `#3A3531` | `#CFC6B9` | Séparateurs, champs |
| `--text` | `#F2EDE6` | `#1A1714` | Texte principal |
| `--text-muted` | `#B3AA9F` | `#5E564E` | Texte secondaire |
| `--accent` | `#E4572E` | `#B8431F` | CTA principal, liens actifs |
| `--accent-text` | `#121110` | `#FFFFFF` | Texte sur `--accent` |
| `--highlight` | `#D9A21B` | `#8A5F00` | Étiquettes, notes, focus secondaire |
| `--success` | `#4CAF7A` | `#1E6B45` | Validation |
| `--danger` | `#F0675B` | `#B3261E` | Erreur, suppression |
| `--focus` | `#FFFFFF` | `#1A1714` | Anneau de focus 2 px + décalage 2 px |

Valeurs **à vérifier** avec un outil de contraste avant validation (liens dans `11`). Un second sombre optionnel « Cinéma » (`--bg: #000000`, écrans OLED) peut être proposé dans les réglages ; ne pas multiplier les thèmes en V1.

### 3.2 Typographie

| Rôle | Police (proposée) | Notes |
|---|---|---|
| Titres éditoriaux | **IBM Plex Serif** (500/600, italique pour les accroches) | Caractère artistique, cohérent avec Carbon |
| Interface et texte | **IBM Plex Sans** (400/500/600) | Excellente lisibilité mobile, accents français |
| Métadonnées | **IBM Plex Mono** (400) | Année, durée, timecodes |

Auto-hébergées via `next/font`. Alternative display à tester avec le propriétaire : une police à fort caractère pour les très grands titres (max 1 par page). Échelle (px, mobile → desktop) : 12 · 14 · 16 · 20 · 24 · 32 · 44 · 64. Corps 16 px minimum, interligne 1,5.

### 3.3 Espacement, grille, rayons

- Unité **8 px** (mini-unité 4 px) : 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96.
- Points de rupture (repris de Carbon) : `sm 320` · `md 672` · `lg 1056` · `xlg 1312` · `max 1584`.
- Grille : 4 colonnes (sm), 8 (md), 16 (lg+). Gouttières 16 px.
- Rayons : 0 par défaut ; 2 px max (champs). Bordures : 1 px ; focus : 2 px.

### 3.4 Mouvement

`--ease: cubic-bezier(0.2, 0, 0.38, 0.9)` (productif) · durées 70 / 150 / 240 ms. Transitions de page via View Transitions API quand disponible. Avec `prefers-reduced-motion: reduce` : fondus courts uniquement.

## 4. Mises en page par appareil

| Appareil | Navigation | Particularités |
|---|---|---|
| Mobile (< 672) | **Barre d'onglets en bas** (Accueil, Films, Rechercher, Actualités, Moi) · en-tête minimal | Feed plein écran vertical, feuilles modales (bottom sheets), gestes (balayage retour), `100dvh`, `env(safe-area-inset-*)`, pas de survol |
| Tablette (672–1055) | Rail latéral compact | Grille 8 colonnes, lecteur + infos en vignette |
| PC (≥ 1056) | En-tête fixe + navigation latérale repliable | Grille 16 colonnes, raccourcis clavier (espace, flèches, `f`, `m`) |

## 5. Composants (primitives accessibles + style maison)

Boutons (principal / secondaire / fantôme / danger) · Tag · Tuile contenu (affiche, titre, méta mono) · Tuile publication (images + légende) · Lecteur · Onglets · Fil d'Ariane · Champs de formulaire (étiquette visible, aide, erreur liée par `aria-describedby`) · Feuille modale · Toast · Barre de recherche · Pagination par curseur / bouton « Voir plus » · Bannière cookies · `AdSlot` · Page 404 · État vide.

**Un seul CTA** : le bouton principal est unique par vue ; le composant `Button variant="primary"` journalise un avertissement en développement s'il en détecte deux dans la même vue.

## 6. Loader (imposé)

Le propriétaire a choisi ce loader orbital. **Règles** : couleur = token `--text` (pas de noir en dur) ; classe renommée pour éviter les collisions (`.ecine-loader`) ; accessible (`role="status"`, texte masqué) ; arrêt de l'animation en mouvement réduit. Utilisation : chargements de plus de ~300 ms, transitions de lecteur, actions serveur longues. **Pas en boucle plein écran inutile.**

```html
<div class="ecine-loader" role="status" aria-live="polite">
  <span class="ecine-loader__label">Chargement…</span>
  <div class="particle"></div><div class="particle"></div><div class="particle"></div>
  <div class="particle"></div><div class="particle"></div><div class="particle"></div>
  <div class="particle"></div><div class="particle"></div><div class="particle"></div>
  <div class="particle"></div><div class="particle"></div><div class="particle"></div>
  <div class="particle"></div>
</div>
```

```css
.ecine-loader {
  --uib-size: 45px;
  --uib-color: var(--text);
  --uib-speed: 1.75s;
  position: relative;
  height: var(--uib-size);
  width: var(--uib-size);
  animation: ecine-rotate calc(var(--uib-speed) * 4) linear infinite;
}
.ecine-loader__label {
  position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
@keyframes ecine-rotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

.ecine-loader .particle {
  position: absolute; top: 0; left: 0; display: flex;
  align-items: center; justify-content: center; height: 100%; width: 100%;
}
.ecine-loader .particle:nth-child(1)  { --uib-delay: 0;    transform: rotate(8deg); }
.ecine-loader .particle:nth-child(2)  { --uib-delay: -0.4; transform: rotate(36deg); }
.ecine-loader .particle:nth-child(3)  { --uib-delay: -0.9; transform: rotate(72deg); }
.ecine-loader .particle:nth-child(4)  { --uib-delay: -0.5; transform: rotate(90deg); }
.ecine-loader .particle:nth-child(5)  { --uib-delay: -0.3; transform: rotate(144deg); }
.ecine-loader .particle:nth-child(6)  { --uib-delay: -0.2; transform: rotate(180deg); }
.ecine-loader .particle:nth-child(7)  { --uib-delay: -0.6; transform: rotate(216deg); }
.ecine-loader .particle:nth-child(8)  { --uib-delay: -0.7; transform: rotate(252deg); }
.ecine-loader .particle:nth-child(9)  { --uib-delay: -0.1; transform: rotate(300deg); }
.ecine-loader .particle:nth-child(10) { --uib-delay: -0.8; transform: rotate(324deg); }
.ecine-loader .particle:nth-child(11) { --uib-delay: -1.2; transform: rotate(335deg); }
.ecine-loader .particle:nth-child(12) { --uib-delay: -0.5; transform: rotate(290deg); }
.ecine-loader .particle:nth-child(13) { --uib-delay: -0.2; transform: rotate(240deg); }

.ecine-loader .particle::before {
  content: ''; position: absolute; height: 17.5%; width: 17.5%;
  border-radius: 50%; background-color: var(--uib-color); flex-shrink: 0;
  transition: background-color 0.3s ease;
  --uib-d: calc(var(--uib-delay) * var(--uib-speed));
  animation: ecine-orbit var(--uib-speed) linear var(--uib-d) infinite;
}

@keyframes ecine-orbit {
  0%   { transform: translate(calc(var(--uib-size) * 0.5))  scale(0.73684); opacity: 0.65; }
  5%   { transform: translate(calc(var(--uib-size) * 0.4))  scale(0.684208); opacity: 0.58; }
  10%  { transform: translate(calc(var(--uib-size) * 0.3))  scale(0.631576); opacity: 0.51; }
  15%  { transform: translate(calc(var(--uib-size) * 0.2))  scale(0.578944); opacity: 0.44; }
  20%  { transform: translate(calc(var(--uib-size) * 0.1))  scale(0.526312); opacity: 0.37; }
  25%  { transform: translate(0%) scale(0.47368); opacity: 0.3; }
  30%  { transform: translate(calc(var(--uib-size) * -0.1)) scale(0.526312); opacity: 0.37; }
  35%  { transform: translate(calc(var(--uib-size) * -0.2)) scale(0.578944); opacity: 0.44; }
  40%  { transform: translate(calc(var(--uib-size) * -0.3)) scale(0.631576); opacity: 0.51; }
  45%  { transform: translate(calc(var(--uib-size) * -0.4)) scale(0.684208); opacity: 0.58; }
  50%  { transform: translate(calc(var(--uib-size) * -0.5)) scale(0.73684); opacity: 0.65; }
  55%  { transform: translate(calc(var(--uib-size) * -0.4)) scale(0.789472); opacity: 0.72; }
  60%  { transform: translate(calc(var(--uib-size) * -0.3)) scale(0.842104); opacity: 0.79; }
  65%  { transform: translate(calc(var(--uib-size) * -0.2)) scale(0.894736); opacity: 0.86; }
  70%  { transform: translate(calc(var(--uib-size) * -0.1)) scale(0.947368); opacity: 0.93; }
  75%  { transform: translate(0%) scale(1); opacity: 1; }
  80%  { transform: translate(calc(var(--uib-size) * 0.1))  scale(0.947368); opacity: 0.93; }
  85%  { transform: translate(calc(var(--uib-size) * 0.2))  scale(0.894736); opacity: 0.86; }
  90%  { transform: translate(calc(var(--uib-size) * 0.3))  scale(0.842104); opacity: 0.79; }
  95%  { transform: translate(calc(var(--uib-size) * 0.4))  scale(0.789472); opacity: 0.72; }
  100% { transform: translate(calc(var(--uib-size) * 0.5))  scale(0.73684); opacity: 0.65; }
}

@media (prefers-reduced-motion: reduce) {
  .ecine-loader, .ecine-loader .particle::before { animation: none; }
  .ecine-loader .particle::before { opacity: 0.65; }
}
```

## 7. Chargement : quand utiliser un skeleton

Règle de fluidité : **d'abord éviter l'attente** (cache, préchargement, Instant Navigations, mises à jour optimistes).
- **Pas de skeleton** si la donnée arrive en < 300 ms ou si la navigation est instantanée.
- **Skeleton autorisé** seulement pour une zone à hauteur connue qui évite un saut de mise en page (liste de tuiles, lecteur).
- Skeleton = **aplat `--surface-2` avec pulsation d'opacité** (0,6 ↔ 1, 1,2 s). **Pas de shimmer** (c'est un dégradé).
- Chargement long (> 1 s) → loader du §6 + texte utile.

## 8. Sons et haptique

| Événement | Son (≤ 400 ms) | Haptique mobile |
|---|---|---|
| Tap sur élément principal | Clic doux | 8 ms |
| J'aime | Note courte montante | 12 ms |
| Ajout à Ma liste | Deux notes | 12 ms |
| Ouverture du lecteur | Claquette courte (clin d'œil cinéma) | — |
| Succès (connexion, envoi) | Accord bref | 15 ms |
| Erreur | Note basse sèche | 25 ms ×2 |
| Changement de thème | Interrupteur | — |
| Nouveau contenu dans le feed | Discret | — |

Règles :
- **Le son démarre après un geste de l'utilisateur** (politique d'autoplay des navigateurs) ; le contexte audio est repris au premier toucher.
- **Réglage « Sons » visible** (activé par défaut, une icône dans l'en-tête / Moi), état **sauvegardé**. Respecter le mode silencieux de l'appareil quand détectable.
- Sprite audio unique **≤ 100 Ko** (mp3 + ogg/aac), préchargé après l'interaction. Volume maître plus bas que le contenu vidéo. Jamais de musique ni de boucle sonore automatique.
- La lecture vidéo ne démarre jamais avec le son sans geste ; les aperçus du feed sont **muets** jusqu'au tap.
- `navigator.vibrate` quand disponible ; jamais essentiel.
- Sound design créé par un humain (ou libre de droits **avec licence tracée** dans `docs/licences.md`).

## 9. Motifs artistiques

- Famille de **3 à 5 motifs géométriques** en SVG (aplat, 1 couleur : `--border` ou `--highlight`), inspirés de la tradition textile d'Afrique centrale — **à faire valider avec des étudiants/enseignants de l'INA** pour éviter toute appropriation ou contresens.
- Usage : séparateurs de section, page 404, états vides, écran de démarrage PWA, fond de la bannière cookies. **Jamais** derrière du texte long. Jamais en dégradé ni en transparence qui nuit au contraste.
- Photographie : portraits d'acteurs sur fond uni, fotogrammes de films ; recadrages francs ; pas de filtre uniformisant.

## 10. Accessibilité (rappel)

Clavier complet · focus visible · ordre logique · `alt` utile · sous-titres du lecteur · pas d'information portée par la seule couleur · cibles tactiles ≥ 44 × 44 px · annonces `aria-live` pour toasts · tester avec lecteur d'écran (TalkBack sur Android).

## 11. Livrables design attendus de l'IA

1. `packages/design-tokens` (CSS variables dark/light).
2. Page « Kitchen sink » `/design` (désactivée en production) avec tous les composants, états et thèmes.
3. Vérification de contraste automatisée (script) sur les paires de tokens.
4. Captures mobile / tablette / PC des écrans clés **soumises à validation** avant d'aller plus loin.
