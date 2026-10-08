# 03 · Expérience native mobile

Fichier cible : `docs/design/03-experience-native.md`. Décrit ce qui donne la sensation d'une application iOS ou Android dans le navigateur.

## Architecture de navigation

Quatre onglets et un bouton Recherche donnent accès à tout le site ; Courts-métrages et Talents, absents de la barre actuelle, sont atteints par les pastilles de l'accueil et par la recherche. Aucune URL existante ne change.

&#91;embedded content: architecture de navigation · 4 onglets + Recherche\]

Toutes les routes convergent vers la fiche film, puis le lecteur : c'est le chemin que la refonte raccourcit (lecture en 2 gestes depuis l'accueil grâce à l'aperçu rapide).

## Barre d'onglets flottante

La barre est une pastille flottante de 64 px qui contient quatre onglets, avec à sa droite un bouton Recherche rond et détaché, comme dans les apps d'iOS 26 ; elle reste au pouce, se rétracte pendant la lecture d'une page et ne disparaît jamais complètement. Elle remplace `components/layout/navigation.tsx` sous 1 056 px.

```text
 ┌────────────────────────────────────────┐  ╭────╮
 │ ⌂ Accueil  ▶ Découvrir  ✷ Nouveautés  ☺ Moi │  │ ⌕  │
 └────────────────────────────────────────┘  ╰────╯
   pastille 64 px, rayon complet, matériau --chrome     56 px, détaché de 8 px
   bas : max(12 px, zone sûre) · côtés : 12 px
```

| Propriété | Valeur |
| --- | --- |
| Position | Fixe, à `max(12px, env(safe-area-inset-bottom))` du bas, 12 px des côtés ; contenu des pages décalé de la hauteur de la barre + 16 px |
| Onglet | Icône 24 + libellé 11/13, largeur minimale 64, zone de toucher sur toute la hauteur |
| Onglet actif | Icône Bold Duotone et libellé en `--accent-text` ; une « lentille » `--surface-2` à 80 % derrière l'onglet glisse d'un onglet à l'autre en `--spring-smooth` |
| Rétraction | Après 8 px de défilement vers le bas : contenu à l'échelle 0,85, libellés en fondu, bouton Recherche réduit à 48 px. Retour à la remontée, en haut de page et en bas de page |
| Clavier ouvert | Barre masquée quand le clavier occupe l'écran (API `visualViewport`) |
| Nouveautés | Pastille rouge de 8 px, sans chiffre, s'il y a du nouveau depuis la dernière visite (date de dernière visite en cookie) |
| Nouveau toucher sur l'onglet actif | Remonte en haut de la page ; sur Recherche, place le curseur dans le champ |
| Retour tactile | Vibration de 8 ms sur Android au changement d'onglet, aucun son |
| Lecteur plein écran | Barre masquée |
| Découvrir | Barre conservée, posée sur la vidéo avec le matériau ; repli plein en mode allégé |
| Accessibilité | `<nav aria-label="Navigation principale">`, `aria-current="page"`, libellés toujours présents pour les lecteurs d'écran même rétractés |

**Tablette (672 à 1 055 px)** : même barre, centrée, onglets plus larges (96 px).

**PC (≥ 1 056 px)** : barre de navigation en haut, 64 px, transparente sur l'affiche à la une puis en matériau après 24 px de défilement. À gauche le logo, puis Accueil, Découvrir, Nouveautés, Films, Courts-métrages, Talents ; à droite un champ de recherche qui s'élargit au focus et l'avatar Moi. Le rail latéral actuel est supprimé du site public (il reste dans l'administration).

## En-tête et défilement

L'en-tête disparaît quand on descend et revient quand on remonte, comme sur Netflix ; les écrans de premier niveau ont un grand titre qui se réduit dans l'en-tête, comme sur iOS. Les réglages Sons et Thème quittent l'en-tête pour l'espace Moi.

| Écran | En-tête mobile (56 px) |
| --- | --- |
| Accueil | Symbole du logo (28 px) à gauche ; dessous, rangée de pastilles Films, Courts-métrages, Catégories ▾. Transparent sur l'affiche à la une avec `--scrim-top`, en matériau après 24 px |
| Découvrir | Aucun en-tête ; seul un bouton son rond en haut à droite, sur la vidéo |
| Nouveautés, Moi, Recherche | Grand titre (Titre 1) dans la page, qui se réduit en titre centré de 17 px dans l'en-tête après 40 px de défilement |
| Écran d'approfondissement (catégorie, talent, article, réglages) | Bouton retour rond de 44 à gauche, titre centré, action facultative à droite (Partager) |
| Fiche film | Retour et Partager en boutons ronds `on-image` sur l'image ; l'en-tête prend le matériau et le titre du film quand l'image sort de l'écran |

**Comportement au défilement** : vers le bas au-delà de 56 px, l'en-tête et la rangée de pastilles glissent hors de l'écran en 250 ms ; au moindre défilement vers le haut, ils reviennent. La détection se fait par direction de défilement (un seul écouteur passif, `requestAnimationFrame`), jamais par animation liée pixel par pixel au défilement.

**Barre d'état du téléphone** : la balise `theme-color` suit le thème dès le rendu serveur (`#0A0F16` en Nuit, `#F5F7FA` en Jour, `#000000` dans le lecteur), ce qui corrige la couleur figée actuelle. Dans l'app installée sur iPhone, `apple-mobile-web-app-status-bar-style` vaut `black-translucent` et le contenu respecte `env(safe-area-inset-top)`.

**Mémoire de chaque onglet** : en revenant sur un onglet, la personne retrouve la position de défilement qu'elle avait quittée (position par onglet en `sessionStorage`, restaurée après le rendu). Si la version de React utilisée fournit `<Activity>` de façon stable, l'agent évalue de garder l'onglet monté plutôt que de restaurer la position.

## Transitions de page

Chaque type de navigation a sa transition, toujours la même, pour que la personne sache sans réfléchir si elle avance, recule, change d'onglet ou ouvre une couche. Elles reposent sur l'API View Transitions via le composant `<ViewTransition>` de React, que Next.js déclenche automatiquement à chaque navigation quand `experimental.viewTransition` est activé ([guide Next.js](https://nextjs.org/docs/app/guides/view-transitions)).

| Navigation | Animation | Mise en œuvre |
| --- | --- | --- |
| Changement d'onglet | Fondu de 150 ms, aucun glissement | Classe de transition `tab` sur le contenu principal |
| Approfondissement (accueil → catégorie, fiche → talent) | Poussée depuis la droite, 250 ms (voir Mouvement) | Classe `push`, sens déduit d'un index stocké dans `history.state` |
| Retour (bouton, geste ou touche retour Android) | Inverse de la poussée | Classe `pop` |
| Affiche → fiche film | L'affiche s'agrandit jusqu'à l'image de la fiche, 400 ms | `<ViewTransition name={"poster-" + id}>` sur l'image de la tuile et sur l'image de la fiche |
| Aperçu rapide | Feuille qui monte | Route interceptée `@modal/(.)films/[slug]/apercu` : l'URL change, le bouton retour ferme la feuille, le lien se partage |
| Ouverture du lecteur | Zoom de l'image de la fiche jusqu'au plein écran, après le clap | Nom de transition partagé entre l'image et le cadre du lecteur |

**Règles**

- La fonction est encore marquée expérimentale dans la documentation Next.js 16.2 ([référence](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition)) : elle est activée derrière l'indicateur `NEXT_PUBLIC_VIEW_TRANSITIONS`, et l'agent vérifie son statut dans la version 16.3 du dépôt avant de l'allumer en production.
- Navigateur sans View Transitions : navigation instantanée, aucun effet de remplacement en JavaScript.
- Quand le navigateur joue déjà sa propre animation de retour (glissement depuis le bord sur iPhone, signalé par `hasUAVisualTransition`), E-Ciné ne joue pas la sienne, pour éviter une double animation.
- Si la page suivante n'est pas prête en 100 ms, la transition se fait vers son skeleton (`loading.tsx`), jamais vers un écran figé.
- Aucune transition ne bloque un toucher : une nouvelle navigation interrompt la précédente.
- Mouvement réduit et mode allégé : fondu de 150 ms au plus, ou rien.

## Gestes

Les gestes sont ceux que les personnes pratiquent déjà sur TikTok, YouTube et Netflix ; chacun a un équivalent visible pour les lecteurs d'écran et pour qui ne le découvre pas. Le défilement s'appuie sur le défilement natif du navigateur (inertie, aimantation CSS), jamais sur une bibliothèque de carrousel.

| Geste | Où | Effet | Équivalent visible |
| --- | --- | --- | --- |
| Glisser horizontalement | Rangées, affiche à la une, carrousel d'images d'une publication | Défilement natif, aimantation `proximity` (rangées) ou `mandatory` (affiche à la une) | Lien « Tout voir », tirets de l'affiche à la une cliquables |
| Glisser verticalement | Découvrir | Un extrait par écran (`scroll-snap-type: y mandatory`) | Touches fléchées haut et bas sur PC |
| Glisser vers le bas | Feuilles | Suit le doigt ; fermeture au-delà de 30 % de la hauteur ou au-dessus de 0,5 px/ms | Bouton Fermer |
| Tirer pour rafraîchir | Accueil, Nouveautés | Seuil à 72 px, vibration au seuil, loader orbital, nouvelles rangées | Aucun nécessaire (le contenu se met aussi à jour à chaque visite) |
| Appui long (500 ms) | Affiches et tuiles | Menu contextuel : Ma liste, Partager, Pas pour moi, Voir la fiche | Bouton « … » dans l'aperçu rapide et sur la fiche |
| Double toucher à gauche ou à droite | Lecteur | −10 s ou +10 s, cumulable (+20, +30) avec onde visuelle et temps affiché | Boutons ±10 s |
| Toucher simple | Lecteur | Affiche ou masque les commandes | — |
| Double toucher | Découvrir | J'aime, avec cœur qui apparaît sous le doigt | Bouton J'aime |
| Pincer | Lecteur plein écran | Basculer entre image entière et image remplissant l'écran | Option dans Réglages du lecteur |
| Glisser vers le bas | Lecteur plein écran | Quitter le plein écran | Bouton plein écran |

**Conflits à éviter**

- Bord gauche de l'iPhone : le geste de retour du système n'est jamais intercepté ; les rangées commencent à 16 px du bord.
- Touche ou geste retour d'Android : il ferme d'abord la couche ouverte (feuille, menu), puis revient à l'écran précédent. Chaque feuille et chaque menu ajoute donc une entrée d'historique à l'ouverture.
- Tirer pour rafraîchir : le blocage du rebond (`overscroll-behavior-y: none`) reste actif partout ailleurs ; sur l'accueil et Nouveautés, le geste est géré par E-Ciné et le rafraîchissement natif du navigateur reste coupé pour ne pas en avoir deux.
- Les écouteurs de toucher sont passifs, sauf pendant un glissement de feuille.

## Retours tactiles, vibrations et sons

Chaque action reçoit un retour en moins de 100 ms : visuel toujours, vibration sur Android, son seulement si la personne l'a choisi. Les apps natives sont silencieuses au toucher ; E-Ciné réserve le son à son moment de marque, le clap.

| Événement | Visuel | Vibration Android (`navigator.vibrate`) | iPhone | Son, si activé |
| --- | --- | --- | --- | --- |
| Changement d'onglet | Icône et lentille | 8 ms | — | Aucun |
| Ajout à Ma liste | Icône pleine + notification « Ajouté à Ma liste · Annuler » | 12 ms | Retour haptique expérimental | `bookmark` |
| J'aime | Cœur rouge qui grossit | 12 ms | Retour haptique expérimental | `like` |
| Lancement d'un film | Clap | 12 ms | Retour haptique expérimental | `clap` (activé par défaut) |
| Seuil de tirer pour rafraîchir | Loader qui se remplit | 10 ms | — | Aucun |
| Point d'arrêt d'une feuille | — | 6 ms | — | Aucun |
| Ouverture du menu contextuel | Affiche qui s'agrandit | 20 ms | Retour haptique expérimental | Aucun |
| Succès (connexion, envoi, publication en admin) | Notification avec coche | 15 ms | — | `success` |
| Échec | Notification d'erreur ou message sous le champ | 25-40-25 ms | — | `error` |

**Réglages, dans Moi → Réglages** (remplacent le réglage unique actuel `ecine_sound`)

| Réglage | Cookie | Par défaut |
| --- | --- | --- |
| Vibrations | `ecine_haptics` | Activé |
| Son au lancement d'un film | `ecine_sound_clap` | Activé |
| Sons de l'interface | `ecine_sound_ui` | Désactivé |

**iPhone** : Safari ne gère pas `navigator.vibrate`. Depuis iOS 18, basculer un interrupteur natif (`<input type="checkbox" switch>`) produit un léger retour haptique, et certains sites s'en servent pour en déclencher un. C'est un contournement non documenté : il est testé sur iPhone réel, isolé dans `lib/haptics.ts`, désactivable, et aucun parcours n'en dépend.

**Sons** : la synthèse Web Audio actuelle (`lib/sound.ts`) est gardée pour `like`, `bookmark`, `success` et `error`. Le son `newContent` est supprimé (jamais joué). Le clap fait l'objet d'une commande à un sound designer : 600 ms au plus, 20 Ko au plus en Opus, joué après le geste de la personne, volume général 0,12 conservé.

## Skeletons et états de chargement

Le rendu dynamique imposé par la CSP (ADR-0004) rend chaque navigation dépendante du serveur ; la parade est d'afficher tout de suite la forme exacte de la page, puis de la remplir par morceaux grâce au streaming des composants serveur. La personne ne voit plus jamais un écran figé.

**Ordre d'apparition d'un contenu** : skeleton de la mise en page → couleur dominante de l'image → aperçu flou → image, en fondu de 240 ms.

| Route | `loading.tsx` affiche | Parties envoyées en streaming (`<Suspense>`) |
| --- | --- | --- |
| Accueil | Pastilles, affiche à la une, 3 rangées de 4 affiches | Rangées personnalisées et Top 10 après l'affiche à la une |
| Films, Courts-métrages, Catégorie | Pastilles, grille de 9 affiches | Grille, puis « Voir plus » |
| Fiche film | Image 16:9, 2 lignes de titre, rangée de 4 boutons ronds, 4 lignes de synopsis, rangée de 5 portraits | Distribution, « Vous aimerez aussi » |
| Découvrir | Panneau noir plein écran, 2 lignes de texte en bas, colonne de 3 boutons ronds | Extraits suivants |
| Nouveautés | Contrôle segmenté, 3 cartes 16:9 | Liste |
| Recherche | Champ, grille de 6 vignettes de catégories | Suggestions |
| Moi | En-tête de profil, 2 rangées | Reprendre, Ma liste |
| Talent, article, pages | Portrait ou couverture, 3 lignes de titre, 6 lignes de texte | Filmographie, film lié |
| Administration | Titre, barre de filtres, 10 lignes de tableau | Tableau |

**Règles**

- Le skeleton a les dimensions exactes du contenu final : CLS nul au remplacement.
- Il n'apparaît qu'après 150 ms (`animation-delay` sur son opacité) : une navigation rapide ne clignote pas.
- Le loader orbital ne sert qu'aux attentes de plus de 300 ms sans skeleton : suite d'une liste, préparation du lecteur, tirer pour rafraîchir.
- J'aime, Ma liste et les rappels sont instantanés (`useOptimistic`), annulés avec notification en cas d'échec, comme aujourd'hui.
- Aperçu flou et couleur dominante sont calculés une seule fois à l'envoi de l'image en administration et stockés avec elle (aperçu WebP de 16 px de large, moins de 500 octets).
- **À vérifier (ADR-0004)** : l'option `placeholder="blur"` de `next/image` pose l'aperçu en attribut `style`. Si la CSP le bloque, l'aperçu passe par un élément `<img>` dédié sous l'image.

## Application installable

L'installation transforme E-Ciné en icône sur l'écran d'accueil, ce qui crée un déclencheur quotidien ; l'invite arrive après une preuve de valeur, jamais à la première visite.

| Élément | Spécification |
| --- | --- |
| Moment de l'invite | 2e visite, ou juste après un film terminé ; une fois par période de 30 jours au plus ; « Plus tard » a le même poids que « Installer » |
| Android | Événement `beforeinstallprompt` gardé en mémoire, puis carte discrète au-dessus de la barre d'onglets : « Installez E-Ciné sur votre téléphone. Il s'ouvre comme une app et prend très peu de place. » |
| iPhone | Feuille en 3 étapes illustrées : bouton Partager, « Sur l'écran d'accueil », « Ajouter » |
| Toujours disponible | Ligne « Installer l'application » dans Moi tant que l'app n'est pas installée |
| Manifeste (`app/manifest.ts`) | `display: "standalone"` ; couleurs `#0A0F16` ; icônes refaites depuis le SVG officiel (192, 512, 512 maskable) ; raccourcis Reprendre, Rechercher, Ma liste |
| Orientation | Portrait pour l'interface ; dans le lecteur en plein écran, `screen.orientation.lock("landscape")` tenté sur Android, erreurs ignorées. À vérifier sur appareil : le passage en paysage avec le manifeste en portrait |
| Écran de démarrage | Logo complet centré sur `#0A0F16` ; images `apple-touch-startup-image` générées par script pour les tailles d'iPhone courantes |
| Écran verrouillé et notification de lecture | API Media Session : titre, réalisateur, affiche 512 px ; actions lecture, pause, −10 s, +10 s, position |
| Écran allumé | API Screen Wake Lock pendant la lecture, si disponible |
| Mise à jour | Notification « Nouvelle version disponible · Mettre à jour », textes déplacés dans `fr.json` |
| Rappels de sortie | Notification push uniquement après « Me le rappeler », avec une phrase qui dit à quoi elle sert ; sur iPhone, seulement dans l'app installée. Sinon, pastille dans Nouveautés et e-mail si la personne a un compte. Dépendance serveur à prévoir |
| Hors ligne | Politique inchangée (ADR-0009) : page « Vous êtes hors ligne » redessinée avec l'illustration du logo, bouton Réessayer |

## Mode allégé pour les téléphones modestes

Le mode allégé garde la même interface mais retire tout ce qui coûte en puissance ou en données ; il s'active seul, et la personne peut le forcer dans Réglages (Automatique, Activé, Désactivé).

**Détection**

| Signal | Où | Effet |
| --- | --- | --- |
| En-tête `Save-Data: on` ou cookie `ecine_savedata` | Serveur | `<html data-savedata="on">` dès le premier rendu |
| `navigator.deviceMemory` ≤ 2, ou `hardwareConcurrency` ≤ 4 | Petit script en ligne avec le nonce CSP, avant l'affichage | `data-perf="lite"` + cookie `ecine_perf=lite` pour les rendus suivants |
| `navigator.connection.effectiveType` en `slow-2g`, `2g` ou `3g` | Idem | `data-perf="lite"` pour la session |
| Réglage manuel | Cookie `ecine_perf` | Prioritaire sur la détection |

Ces API n'existent que sur les navigateurs Chromium (soit l'essentiel du parc Android) ; ailleurs, le mode reste désactivé sauf réglage manuel.

**Ce qui change**

| Effet | Normal | Allégé | Économie de données |
| --- | --- | --- | --- |
| Flou de la navigation | Oui | Plein | Plein |
| Halo d'ambiance | Oui | Non | Non |
| Aperçus vidéo automatiques | Sous conditions | Non | Non |
| Découvrir | Extrait lu automatiquement | Extrait lu automatiquement, préchargement coupé | Image de couverture, lecture au toucher |
| Transitions de page | Complètes | Fondu de 150 ms | Fondu de 150 ms |
| Ressorts | Oui | Courbe simple de 150 ms | Courbe simple de 150 ms |
| Taille des images | Normale | Normale | Une largeur en dessous dans `srcset` (dette n° 16) |
| Avance automatique de l'affiche à la une | Toutes les 7 s | Non | Non |
| Qualité vidéo maximale | Automatique | Automatique | 360p, comme aujourd'hui |

**Conditions d'un aperçu vidéo automatique** (affiche à la une et aperçu rapide) : réglage « Aperçus automatiques » actif, ni mode allégé ni économie de données, et connexion détectée en 4G ou Wi-Fi. Sans API réseau (iPhone), l'aperçu ne démarre qu'après 2 s de présence à l'écran, un seul par écran. Toujours muet, en 240p, 1,5 Mo au plus, arrêté dès qu'il sort de l'écran.
