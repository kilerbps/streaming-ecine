# 04 · Écrans publics et lecteur

Fichier cible : `docs/design/04-ecrans-publics.md`. Chaque écran donne sa maquette, son contenu dans l'ordre, son action principale et ses états.

## Accueil `/fr`

L'accueil répond en une seconde à « qu'est-ce que je regarde ce soir ? » : une affiche à la une avec un seul bouton « Regarder », puis des rangées que l'on parcourt au pouce. Le fil vertical actuel quitte l'accueil pour l'onglet Découvrir.

```text
┌─ 390 px ────────────────────────────┐
│ ÉC                                │ en-tête transparent, halo d'ambiance
│ (Films) (Courts-métrages) (Catégories ▾)
│ ╭────────────────────────────╮ │
│ │        affiche à la une        │ │ carte 4:5, rayon 16
│ │           (image)              │ │
│ │ ░░░░░░░░░░ voile ░░░░░░░░░░░░ │ │
│ │ Titre du film                  │ │ Archivo 34 (ou titre dessiné)
│ │ Drame   Lingala   1 h 42       │ │
│ │ [ ▶ Regarder ]  [ ⊕ Ma liste ] │ │ principal + secondaire
│ │ ━  ─  ─  ─  ─                 │ │ 5 tirets, avance toutes les 7 s
│ ╰────────────────────────────╯ │
│ Reprendre                       › │
│ [▀▀▀▀▀] [▀▀▀▀▀] [▀▀            │ tuiles 16:9 + barre rouge
│ Top 10 en RDC cette semaine     › │
│ 1▌▀▀  2▌▀▀  3▌▀▀               │
│ Nouveautés sur E-Ciné           › │
│ ▀▀▀ ▀▀▀ ▀▀▀ ▀                   │ 112 px, le bord de la 4e dépasse
╰── barre d'onglets flottante ─────╯
```

**Ordre des rangées** (calculé côté serveur, 12 rangées au plus)

| # | Rangée | Affichée si | Contenu et tri |
| --- | --- | --- | --- |
| 1 | Reprendre | Au moins une lecture entre 2 min et 95 % | Tuiles paysage, plus récente d'abord, 10 au plus, « 38 min restantes » |
| 2 | Top 10 en RDC cette semaine | Au moins 10 titres lus sur 7 jours | Visiteurs uniques ayant lancé le titre sur 7 jours glissants, recalcul quotidien |
| 3 | Nouveautés sur E-Ciné | 6 titres publiés depuis moins de 30 jours | Date de publication, la plus récente d'abord, badge « Nouveau » |
| 4 | Parce que vous avez regardé {titre} | Un film regardé au-delà de 10 min | Catégories et talents en commun, titres déjà vus exclus |
| 5 | Courts-métrages : 15 minutes ou moins | 6 courts-métrages | Tuiles paysage, éditorial puis récents |
| 6 | Bientôt sur E-Ciné | Un titre annoncé | Date de sortie la plus proche d'abord, badge « Bientôt », cloche « Me le rappeler » |
| 7 | Talents à l'honneur | 6 talents programmés | Portraits ronds |
| 8 | Rangées éditoriales | Programmées en administration | Ordre choisi par l'équipe |
| 9 | Rangées par catégorie | 6 titres dans la catégorie | Catégories classées par affinité de la personne |
| 10 | Pépite des archives | Une par session (tirage à graine actuel) | Une tuile, badge « Surprise » |
| — | Fin de page | Toujours | « Vous avez tout vu pour l'instant. » et bouton secondaire « Ouvrir Découvrir » |

**Règles**

- Un même titre n'apparaît pas deux fois dans les trois premières rangées.
- Historique de personnalisation : identifiants des 20 derniers films vus dans un cookie de l'appareil (`ecine_hist`), lu par le serveur ; pour un membre, l'historique du compte. Soumis au choix cookies existant (R-PRIV-01).
- L'affiche à la une (5 titres au plus, programmée en administration) avance toutes les 7 s seulement si elle est visible et sans geste en cours ; elle s'arrête définitivement au premier glissement.
- Toucher une affiche ouvre l'aperçu rapide ; appui long, le menu contextuel ; « › » ouvre la grille complète de la rangée.
- Pastille « Catégories ▾ » : feuille listant les catégories avec leur nombre de titres.
- **PC** : affiche à la une plein cadre 16:9 (80 % de la hauteur au plus), texte dans les 40 % de gauche ; rangées de 6 à 7 affiches, flèches de défilement au survol ; au survol d'une affiche, échelle 1,04 et titre.

## Aperçu rapide et menu contextuel

L'aperçu rapide permet de décider sans quitter l'accueil : toucher une affiche, lire trois lignes, lancer le film. C'est le raccourci qui met la lecture à 2 gestes de l'accueil.

```text
╭────────────── ━━ ──────────────╮  poignée, feuille à 60 %
│ ╭──────────────────────────╮  │
│ │ image 16:9 (aperçu muet)  │  │  rayon 16, aperçu sous conditions
│ ╰──────────────────────────╯  │
│ Titre du film                    │  Titre 2
│ 2024   1 h 42   Drame   [13+] [HD]│
│ Lingala, sous-titres français    │
│ Synopsis sur trois lignes, coupé │
│ au bon endroit… plus             │
│ [ ▶ Regarder                  ]  │  pleine largeur, 52 px
│  ⊕ Ma liste   ♡ J'aime   ↗ Partager   …  │  boutons ronds + libellés
│ Qualité auto : de 91 Mo à 1,2 Go par heure │
│ Voir la fiche complète         › │
╰─────────────────────────────────╯
```

| Élément | Spécification |
| --- | --- |
| Route | `/fr/films/{slug}/apercu`, interceptée en feuille depuis les rangées ; une visite directe affiche la fiche complète |
| Action principale | « Regarder », ou « Reprendre · 38 min restantes » s'il y a une progression ; lance le lecteur directement, après le clap |
| Film sans vidéo prête | « Ce film arrive bientôt » et « Me le rappeler » devient le bouton principal |
| Ligne de consommation | Calculée avec les débits du lecteur (144p ≈ 91 Mo/h, 720p ≈ 1,2 Go/h) ; en économie de données : « 360p au plus » |
| Aperçu vidéo | Conditions du mode allégé (onglet 03) ; sinon image fixe |
| Glissement vers le haut | La feuille passe à 92 % et affiche la distribution et « Vous aimerez aussi » |
| PC | Panneau centré de 640 px, mêmes contenus |

**Menu contextuel** (appui long de 500 ms sur une affiche, ou bouton « … ») : affiche agrandie au-dessus d'une liste de 4 lignes de 44 px — Ajouter à Ma liste (ou Retirer), Partager, Pas pour moi (retire le titre des rangées personnalisées pendant 90 jours, notification « Compris · Annuler »), Voir la fiche. Vibration de 20 ms à l'ouverture ; fermeture au toucher hors du menu ou par la touche retour.

## Fiche film `/fr/films/{slug}`

La fiche est l'écran où l'on décide pour de bon : image immersive, un bouton « Regarder » impossible à manquer, puis tout ce qui rassure (durée, langue, qui joue dedans, ce que d'autres ont aimé).

```text
┌──────────────────────────────────┐
│ (←)                        (↗)  │ boutons ronds on-image
│        image 4:5 (mobile)        │ point focal choisi en admin
│ ░░░░░░░░░░ voile ░░░░░░░░░░░░░░░ │
│ Titre du film                    │ Archivo 34
│ 2024   1 h 42   Drame   [13+] [HD]│
│ [ ▶ Reprendre · 38 min restantes ]│ principal, pleine largeur
│ ━━━━━━━━━───────────────────── │ progression rouge
│  ⊕        ♡        ▷        ↗    │ Ma liste, J'aime,
│ Ma liste J'aime Bande-annonce Partager
│ Synopsis sur 4 lignes… plus      │
│ Langue : lingala · Tourné à Kinshasa
│ Avec                             │
│ ◯  ◯  ◯  ◯  ◯                   │ portraits ronds → talent
│ Vous aimerez aussi            ›  │
│ ▀▀▀ ▀▀▀ ▀▀▀ ▀                  │
│ Détails : réalisation, scénario,  │
│ production, sous-titres, Signaler │
└──────────────────────────────────┘
```

| Élément | Spécification |
| --- | --- |
| Image | Mobile : 4:5 tirée de l'image 16:9 avec le point focal saisi en administration ; PC : plein cadre 16:9, texte dans les 40 % de gauche, lecteur qui s'ouvre à la place |
| Transition | L'affiche touchée devient cette image (onglet 03) |
| Action principale | Regarder / Reprendre · temps restant ; film sans vidéo : « Me le rappeler » |
| Métadonnées | Année, durée, catégorie principale en texte ; classification d'âge et qualité en badges bordés ; langue, sous-titres et lieu de tournage sur une ligne dédiée (R-ENG-12) |
| Rangée d'actions | 4 boutons ronds de 44 avec libellé visible ; même ordre partout |
| Bande-annonce | Lue dans la page (lecteur compact, muet au départ) si elle est hébergée par E-Ciné. Si c'est un lien externe, bouton « Voir la bande-annonce » avec icône de sortie. Recommandation : héberger les bandes-annonces dans la chaîne vidéo actuelle |
| Distribution | Portraits ronds, nom, rôle ; « Voir tout » au-delà de 8 |
| Vous aimerez aussi | Même catégorie puis mêmes talents, 10 titres, déjà vus exclus |
| Fil d'Ariane | Retiré de l'affichage mobile (une app n'en a pas) ; gardé en données structurées `BreadcrumbList` pour le référencement, et visible en petit sur PC |
| Signaler | Dans les détails et dans le menu « … » ; étendu aux extraits et publications de Découvrir |
| En-tête au défilement | Matériau et titre du film quand l'image sort de l'écran |
| Image de partage | Gabarit refait avec l'affiche à gauche et le titre à droite (dette n° 13) |

## Découvrir `/fr/decouvrir`

Découvrir reprend le geste du fil vertical de TikTok et des Clips de Netflix, mais chaque carte mène à un film entier en un toucher. Il remplace le fil de découverte actuel et en garde les règles (surprise 1 sur 6, pause éthique).

```text
┌──────────────────────────────────┐
│                           (son)  │ bouton rond, haut droite
│                                  │
│      extrait 9:16 plein écran    │ lu muet à 80 % de visibilité
│                                  │
│                            ♡ 128 │ colonne d'actions
│                            ⊕     │ Ma liste
│                            ↗     │ Partager
│ ░░░░░░░░░ voile bas ░░░░░░░░░░░ │
│ Titre du film   Drame            │
│ Phrase d'accroche sur une ligne  │
│ [ ▶ Regarder le film ]           │ principal
│ ━━━━━━━━━━───────────────────── │ progression de l'extrait
╰── barre d'onglets (matériau) ────╯
```

| Type de carte | Contenu | Action principale |
| --- | --- | --- |
| Extrait | Vidéo verticale de 60 s au plus, liée à un film | Regarder le film |
| Bande-annonce recadrée | Bande-annonce en 9:16 avec point focal | Regarder le film |
| Publication | Carrousel de 1 à 10 images 4:5 sur la couleur dominante, légende | Aucune (J'aime, Partager) |
| Actualité ou événement | Couverture, titre, date et lieu | Lire |
| Pause éthique (après 20 cartes) | « Envie d'un film entier ? » et 3 affiches | Aucune ; « Continuer » en secondaire de même poids |

**Comportement**

- Une carte par écran (`scroll-snap-type: y mandatory`) ; lecture muette quand la carte est visible à 80 %, pause dès qu'elle sort.
- Le son est coupé au départ ; après un premier toucher sur le bouton son, les extraits suivants gardent le son pour la session.
- Toucher simple : pause ou lecture. Double toucher : J'aime. Appui long : menu Pas intéressé, Signaler, Voir la fiche.
- « Regarder le film » ouvre le lecteur au début du film, ou à la reprise ; la source de lecture est enregistrée (`play_start.source = clip`).
- Ordre : catégories préférées, une carte surprise sur six (graine actuelle), une publication ou actualité toutes les cinq cartes.
- Extraits encodés en HLS 240p et 360p seulement ; seul le premier segment de la carte suivante est préchargé, et seulement hors mode allégé et hors économie de données. En économie de données : image de couverture et lecture au toucher.
- Ouverture de l'onglet conditionnée à 30 extraits publiés ; en dessous, le fil se complète avec les bandes-annonces recadrées et les publications.
- **PC** : colonne 9:16 centrée (hauteur de la fenêtre moins la barre de navigation), actions à droite de la vidéo, flèches haut et bas, Espace pour la pause, M pour le son.

## Nouveautés `/fr/nouveautes`

Nouveautés rassemble ce qui arrive et ce qui se passe : les films à venir avec rappel, les événements (avant-premières, projections, festivals) et les actualités. C'est le moteur d'anticipation de la plateforme (R-ENG-09).

```text
 Nouveautés                          Titre 1, se réduit au défilement
 ( Bientôt | Événements | Actualités )   contrôle segmenté
 ╭────────────────────────────────╮
 │ image 16:9 (aperçu muet)       │
 ╰────────────────────────────────╯
  24      Titre du film     [Bientôt]
  oct.    Drame, lingala
          Synopsis sur deux lignes…
          [ cloche  Me le rappeler ]   [ ↗ ]   secondaires
```

| Segment | Contenu | Tri | Actions |
| --- | --- | --- | --- |
| Bientôt | Films annoncés : image 16:9, bloc date (« 24 oct. »), titre, genre, langue, synopsis sur 2 lignes | Date de sortie la plus proche d'abord | « Me le rappeler » (secondaire, devient « Rappel activé »), Partager. Le jour de la sortie : « Disponible · Regarder » |
| Événements | Avant-premières, projections, festivals : date, heure de Kinshasa, lieu, film lié | Prochain d'abord, passés masqués | « Ajouter au calendrier » (fichier `.ics`), Partager |
| Actualités | Article à la une puis liste ; pastilles Tout, Actualité, Annonce, Publication | Plus récent d'abord | Lire |

**Règles**

- L'écran n'a pas de bouton principal : chaque carte a des actions secondaires, pour respecter la règle d'un seul bouton principal.
- Premier « Me le rappeler » : feuille courte qui explique le rappel, puis demande de permission de notification ; un refus garde le rappel dans Moi → Mes rappels et la pastille de l'onglet.
- La pastille rouge de l'onglet disparaît dès la visite de l'écran.
- `/fr/actualites` et les articles gardent leurs URL ; Nouveautés → Actualités y mène.

## Recherche et exploration `/fr/recherche`

L'onglet Recherche sert aussi à explorer : vide, il montre tout le catalogue par catégories et par talents ; dès deux lettres, il propose des résultats. C'est par lui que Talents et Courts-métrages restent à un toucher sur mobile.

| État | Contenu dans l'ordre |
| --- | --- |
| Vide | Champ (curseur placé seulement si l'on vient de toucher l'onglet), recherches récentes de l'appareil (5 au plus, « Effacer »), recherches fréquentes, « Explorer par catégorie » en vignettes 16:9 sur 2 colonnes (nom sur voile), rangée de talents en portraits ronds, lien Courts-métrages |
| Saisie (2 caractères, 180 ms) | Suggestions instantanées, 8 au plus, groupées Films, Talents, Catégories, avec vignette ; comportement actuel conservé, sans JavaScript compris |
| Résultats | Groupes Catégories, Films, Talents, Actualités ; nombre de résultats annoncé aux lecteurs d'écran |
| Aucun résultat | « Aucun résultat pour « … ». Essayez le nom d'un acteur ou un genre. » puis la rangée Top 10 |

**Règles**

- Les recherches fréquentes ne montrent que des requêtes qui correspondent exactement à un titre, un talent ou une catégorie, pour ne jamais afficher un texte saisi par quelqu'un d'autre.
- Les recherches récentes restent sur l'appareil (stockage local) et s'effacent à la déconnexion, car le téléphone peut être partagé.
- Pages de catalogue (`/fr/films`, `/fr/courts-metrages`, catégories, `/fr/personnes`) : même grille d'affiches 2:3 (3 colonnes sur mobile, 4 sur tablette, 6 à 7 sur PC), pastilles de filtre collantes sous l'en-tête, « Voir plus » avec skeleton de 6 tuiles. Talents en portraits 4:5 (2, 4 puis 6 colonnes).
- Fiche talent : portrait 4:5 plein cadre avec voile, nom en Archivo, rôles, année de naissance, biographie avec « plus », réseaux, filmographie en rangée d'affiches ; la bande de motif provisoire est retirée.

## Moi `/fr/moi`

Moi est l'espace de la personne et le seul endroit des réglages ; il reste utile sans compte, pour qu'un visiteur puisse régler ses données et son thème avant de s'inscrire.

| Visiteur | Membre |
| --- | --- |
| « Votre espace », phrase « Connectez-vous pour retrouver Ma liste et vos reprises sur tous vos appareils. », bouton principal Se connecter, lien Créer un compte | Avatar à initiales (`--surface-3`), « Bonjour, {prénom} », bannière de vérification d'e-mail si besoin |
| Reprendre (lectures de l'appareil) | Rangées Reprendre, Ma liste, Mes rappels, J'aime |
| Liste de réglages et liens (ci-dessous) | Même liste + Compte et sécurité, Administration (équipe), Se déconnecter |

**Liste des entrées** (lignes de 52 px, icône Solar Linear à gauche, chevron à droite) : Réglages, Installer l'application (tant qu'elle ne l'est pas), Aide et contact, À propos, Mentions légales et confidentialité, Gérer les cookies.

**Réglages**

| Groupe | Réglage | Valeurs | Par défaut |
| --- | --- | --- | --- |
| Affichage | Thème | Nuit, Jour, Automatique | Nuit |
| Affichage | Mode allégé | Automatique, Activé, Désactivé | Automatique |
| Sons et vibrations | Vibrations | Interrupteur | Activé |
| Sons et vibrations | Son au lancement d'un film | Interrupteur | Activé |
| Sons et vibrations | Sons de l'interface | Interrupteur | Désactivé |
| Données | Économiser les données | Interrupteur | Désactivé (activé si le téléphone le demande) |
| Données | Aperçus automatiques | Interrupteur | Activé |
| Données | Données utilisées aujourd'hui | Lecture seule, estimée par le lecteur (souhaitable) | — |
| Lecture | Lecture automatique du film suivant | Interrupteur | Activé |
| Lecture | Qualité préférée | Automatique, puis 720p à 144p avec consommation | Automatique |
| Lecture | Sous-titres | Langue par défaut, taille Petite, Moyenne, Grande | Français, Moyenne |
| Compte | Profil, mot de passe, double authentification, téléchargement des données, suppression | — | — |

**Double authentification** (dette n° 15) : QR code généré côté serveur en SVG, secret en texte en dessous pour la saisie manuelle, codes de secours, et parcours de désactivation qui demande le mot de passe.

## Lecteur vidéo v2

Le lecteur garde toute sa logique réseau (ADR-0006 du 7 octobre : qualité adaptative, 60 s de réserve, reprise après coupure, messages de connexion lente) ; la refonte change ce que l'on voit et touche. Fichiers : `components/features/player/player.tsx`, `player-controls.tsx`.

```text
┌──────────────────────────────────────────────┐
│ (←) Titre du film                    (⚙)  (⛶) │ voile haut
│                                              │
│        (↺ 10)        ( ▶ )        (10 ↻)    │ 40 px au centre
│                                              │
│ Avec  ◯ ◯ ◯      (à la pause)    Auto (720p) │
│ 12:34 ━━━━━━━●──────────────────────── 1:42:10 │ voile bas
└──────────────────────────────────────────────┘
```

| Élément | Avant | Après |
| --- | --- | --- |
| Disposition des commandes | Barre unique en bas, bandeau noir plein | Commandes principales au centre (lecture, ±10 s), barre haute (retour, titre, réglages, plein écran), barre basse (temps, progression) ; voiles haut et bas affichés seulement avec les commandes (D-01) |
| Barre de progression | Curseur natif + ligne de 3 px | Piste dessinée de 4 px qui passe à 8 px pendant le glissement, curseur de 16 px ; l'`input type=range` natif reste en dessous pour l'accessibilité et le clavier (dette n° 11) ; vignettes au glissement si le transcodage produit une planche d'images (souhaitable) |
| Avancer, reculer | Boutons | Boutons + double toucher à gauche ou à droite, cumulable, onde et « +20 s » affiché |
| À la pause | Rien | « Avec » : 3 à 5 portraits de la distribution ; toucher ouvre la fiche du talent dans une feuille, sans quitter le lecteur |
| Fin du film | « Merci d'avoir regardé » + un lien | Dès le début du générique (horodatage saisi en administration, sinon 30 s avant la fin) : carte « À suivre · {titre} · dans 10 s » avec « Regarder maintenant » et « Annuler » ; après 2 enchaînements, « Toujours là ? » avec Continuer et Arrêter. Écran final : « Merci d'avoir regardé », « Vous avez aimé ? » (J'aime), une suite, Partager |
| Menu Réglages | Feuille ou menu flottant, boutons radio natifs | Même contenu (qualité avec consommation, vitesse, sous-titres), lignes de 48 px avec coche, feuille glissable sur mobile |
| Sous-titres | — | Police du système, fond noir à 60 %, taille réglable (Petite, Moyenne, Grande) |
| Démarrage | Loader « Préparation de la lecture… » | Clap (240 ms) pendant la préparation, puis loader seulement si l'attente dépasse 300 ms |
| Hors de l'app | — | Media Session (écran verrouillé, notification Android), Screen Wake Lock |

**Plein écran** : sur Android, API Fullscreen sur le conteneur puis verrouillage en paysage ; sur iPhone, l'API Fullscreen n'existe que pour l'élément vidéo et affiche les commandes d'iOS. Le bouton plein écran y bascule donc vers le lecteur natif, tandis que la rotation du téléphone en paysage agrandit le conteneur (élément fixé) en gardant les commandes E-Ciné.

**Inchangé** : textes de mise en tampon, de connexion lente et d'erreur ; raccourcis clavier (Espace ou K, flèches, M, F) ; menu contextuel, téléchargement et image dans l'image désactivés ; position enregistrée toutes les 10 s.

## Connexion à la demande et choix des goûts

Le principe actuel est gardé, car il est bon : tout se regarde sans compte, la connexion n'est demandée qu'au moment d'agir et l'action reprend toute seule ensuite. La refonte améliore la feuille et ajoute le choix des goûts.

| Étape | Spécification |
| --- | --- |
| Déclenchement | Ma liste, J'aime, Me le rappeler, Signaler, ou session expirée pendant une action |
| Titre de la feuille | Dit pourquoi : « Connectez-vous pour ajouter ce film à Ma liste », « … pour être prévenu de sa sortie » |
| Contenu | E-mail, mot de passe avec bouton Afficher, « Mot de passe oublié ? », bouton principal Se connecter ; lien « Créer un compte » qui bascule l'inscription dans la même feuille |
| Saisie | `autocomplete` correct (`email`, `current-password`, `new-password`), clavier e-mail, erreurs sous chaque champ après la sortie du champ et non à chaque frappe |
| Inscription | Compteur visible pour le mot de passe (« 7 sur 12 caractères »), anti-spam invisible inchangé |
| Double authentification | Code à 6 chiffres en un seul champ `one-time-code`, collage accepté |
| Après succès | Feuille fermée, action rejouée, notification « Ajouté à Ma liste », vibration de succès |
| PC | Panneau centré de 440 px ; les pages `/fr/connexion` et `/fr/inscription` restent pour les liens directs, sans la bande de motif |

**Choix des goûts** (R-ENG-11) : après 10 minutes de lecture d'un premier film, au retour sur l'accueil, une feuille « Qu'aimez-vous regarder ? » propose les catégories en pastilles à sélection multiple, 3 pré-suggérées selon ce qui vient d'être vu. Boutons « Valider » et « Plus tard » de même poids. Le choix est stocké sur l'appareil ou dans le compte et modifiable dans Réglages. La feuille n'apparaît qu'une fois ; « Plus tard » la repousse de 7 jours, une seule fois.

## États vides, erreurs, hors ligne

Un état vide ou une erreur dit ce qui se passe et propose une seule chose à faire. Les illustrations sont construites avec les blocs du logo (une caméra à laquelle il manque un bloc pour la 404, une caméra sans objectif pour le hors-ligne), en `--surface-3` avec un seul bloc en `--accent`.

| État | Titre | Phrase | Bouton |
| --- | --- | --- | --- |
| Hors ligne | Vous êtes hors ligne | Vos films vous attendent. Ils reviendront dès que le réseau sera de retour. | Réessayer |
| 404 | Cette page n'existe pas | Le lien est peut-être ancien ou mal saisi. Cherchez un film ou un talent. | Revenir à l'accueil (+ champ de recherche) |
| Erreur | Quelque chose s'est mal passé | Réessayez dans un instant. Si ça continue, écrivez-nous depuis Aide et contact. | Réessayer |
| Ma liste vide | Votre liste est vide | Touchez ⊕ sur un film pour le garder ici. | Parcourir l'accueil |
| Mes rappels vide | Aucun rappel | Les films à venir sont dans Nouveautés. | Voir ce qui arrive |
| Recherche sans résultat | Aucun résultat pour « … » | Essayez le nom d'un acteur ou un genre. | Aucun (Top 10 affiché dessous) |
| Fin de Découvrir | Vous avez tout vu pour l'instant | De nouveaux extraits arrivent chaque semaine. | Revenir à l'accueil |
| Catalogue vide | Aucun film dans cette sélection pour le moment | D'autres catégories vous attendent. | Voir les catégories |

Le message d'erreur actuel « L'équipe a été prévenue » est retiré tant qu'aucun suivi d'erreurs n'est branché (dette n° 17). Les messages du lecteur (connexion lente, film indisponible, lecture échouée) restent ceux du 7 octobre. Une rangée de l'accueil sans contenu est masquée, jamais affichée vide.

## Microcopie

E-Ciné parle comme un ami cinéphile de Kinshasa : poli, direct, chaleureux sans en faire trop. Le vouvoiement des 267 chaînes actuelles est gardé ; les phrases sont courtes, au présent, et un bouton dit exactement ce qu'il fait.

**Règles**

- Une phrase fait 5 à 12 mots, rarement plus de 20. Pas de point d'exclamation, pas d'emoji.
- Une action garde le même verbe du bouton à la notification : « Ajouter à Ma liste » → « Ajouté à Ma liste ».
- Les tournures de France qui sonnent faux à Kinshasa sont bannies : « du coup », « carrément », « trop bien », « c'est ouf », « accrochez-vous », « attachez vos ceintures », « oups ».
- Les mots techniques sont expliqués à leur première apparition : « Qualité automatique : l'image s'adapte à votre réseau. »
- Les données s'écrivent en Mo et Go, les durées « 1 h 42 », les dates « 24 oct. », les heures « 20 h 30 » (heure de Kinshasa).
- Un message d'erreur dit le problème puis la solution, et l'interface dit « nous » quand c'est sa faute.
- Chaque nouveau texte va dans `messages/fr.json`, avec une clé par écran (`home.rows.top10`, `player.nextUp.cancel`).

| Situation | À écrire | À ne pas écrire |
| --- | --- | --- |
| Bouton de lecture | Regarder | Lancer la lecture maintenant |
| Reprise | Reprendre · 38 min restantes | Continuer votre visionnage |
| Ajout à Ma liste | Ajouté à Ma liste · Annuler | Super, c'est dans ta liste ! |
| Connexion demandée | Connectez-vous pour garder ce film dans Ma liste. | Oups ! Vous devez être connecté. |
| Pause dans Découvrir | Envie d'un film entier ? En voici trois pour ce soir. | Accrochez-vous, le meilleur arrive ! |
| Rappel de sortie | « {titre} » est disponible sur E-Ciné. Bon film. | Ne ratez surtout pas ça !!! |
| Invite d'installation | Installez E-Ciné sur votre téléphone. Il s'ouvre comme une app. | Téléchargez vite notre super app ! |
| Erreur de champ | L'adresse doit contenir « @ ». Exemple : grace@gmail.com | E-mail invalide. |
| Enchaînement | Vous regardez toujours ? | Vous êtes encore là ou vous dormez ? |
| Consommation | Environ 1,2 Go par heure en 720p. | Attention à votre forfait ! |
| Échec serveur | Nous n'avons pas pu enregistrer. Réessayez dans un instant. | Erreur 500. |
| Choix des goûts | Qu'aimez-vous regarder ? Choisissez trois genres. | Personnalisez votre expérience utilisateur |

**Test avant validation** : lire la phrase à voix haute et se demander si quelqu'un à Bandal ou à la Gombe la dirait à un ami. Sinon, la réécrire.
