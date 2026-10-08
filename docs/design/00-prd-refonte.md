# E-Ciné — PRD de la refonte design (UI/UX)

Oct 8, 2026 · @Jérémie

## Résumé

La refonte fait d'E-Ciné une application de streaming premium sur téléphone : les mécanismes d'engagement de Netflix, la clarté et le bleu de Prime Video, la finition d'Apple TV. Elle remplace le style « Carbon artistique » provisoire par une direction nommée **« Nuit de Kin »**, dérivée du logo.

La promesse produit tient en une phrase : ouvrir l'app, voir un film qui donne envie en moins de 3 secondes, le lancer en un geste, et avoir une raison d'y revenir le lendemain.

| Domaine | Aujourd'hui | Après la refonte |
| --- | --- | --- |
| Style | Angles droits, aucune ombre, aplats, texte sur bandeau plein | Fond nuit bleuté, coins arrondis, images plein cadre avec voile de lisibilité, matériaux translúcides sur la navigation |
| Navigation mobile | Barre plate de 5 onglets, Courts-métrages et Talents absents | Barre flottante arrondie de 4 onglets + bouton Recherche détaché, Explorer regroupe tout le catalogue |
| Accueil | Fil vertical de cartes éditoriales | Grande affiche à la une, puis rangées : Reprendre, Top 10 en RDC, Nouveautés, Pour vous |
| Chargement | Aucun skeleton, aucun `loading.tsx` | Skeleton à la forme exacte sur chaque route, aperçu flou des images avant chargement |
| Mouvement | Fondus de 150 ms | Transition affiche → fiche, ressorts, feuilles glissables, gestes natifs |
| Icônes | 64 icônes maison à angles vifs | Jeu Solar : trait arrondi au repos, duotone plein quand l'onglet est actif |
| Typographie | IBM Plex en 3 familles | Police système (SF Pro, Roboto) pour l'interface, Archivo pour les grands titres |
| Administration | Coquille complète mais écrans chargés | Palette de commandes, tableaux denses, actions instantanées, édition en panneau latéral |

Ce qui ne change pas : données rendues côté serveur, un seul bouton principal par écran, accessibilité WCAG AA, aucun motif sombre, logique réseau du lecteur (ADR-0006). Quatorze règles de `docs/05` changent ; elles sont listées dans la section « Règles produit modifiées » et doivent être validées par le client avant le lot 1.

## Constat de l'existant

Le site actuel est solide techniquement mais se lit comme un magazine, pas comme une application de streaming : sur l'accueil mobile, un écran montre une seule œuvre, et aucun écran public sauf la fiche film ne propose de lancer une lecture. Les constats ci-dessous viennent de l'inventaire du 8 octobre 2026 (commit `68a9441`).

| # | Constat | Effet sur l'utilisateur | Réponse de la refonte |
| --- | --- | --- | --- |
| 1 | Accueil = fil vertical de cartes (affiche 4:5 + texte en grille 5/7) | Une œuvre par hauteur d'écran, il faut lire pour choisir | Grande affiche + rangées horizontales : 8 à 12 affiches visibles en deux glissements |
| 2 | Accueil, Films, Talents : « Action principale : aucune » | Aucun chemin vers la lecture en un geste | « Regarder » sur l'affiche à la une, aperçu rapide au toucher d'une affiche |
| 3 | Aucun `loading.tsx`, skeleton jamais utilisé, rendu dynamique imposé par la CSP (ADR-0004) | Écran figé à chaque navigation en 4G, impression de panne | Skeleton à la forme exacte sur chaque route, aperçu flou des images |
| 4 | Courts-métrages et Talents absents de la barre mobile ; sons et thème dans l'en-tête | Une partie du catalogue est invisible ; l'en-tête est occupé par des réglages | Onglet Explorer ; réglages déplacés dans Moi |
| 5 | Texte sur image = bandeau plein, aucun dégradé, angles droits, aucune ombre | Affiches encadrées comme des documents ; style « outil d'entreprise » (Carbon vient d'IBM) | Images plein cadre, voile de lisibilité, coins arrondis |
| 6 | Aucune transition de page, aucun geste | Sensation de site web, pas d'application | Transitions partagées, feuilles glissables, double tap dans le lecteur |
| 7 | Son à chaque toucher, activé par défaut ; vibration sans effet sur iPhone | Bruit inhabituel pour une app native, réglage unique son + vibration | Sons réservés aux moments forts, réglages séparés |
| 8 | « Surprise » tirée au hasard, aucune personnalisation | Rien ne dit « cette app me connaît » | Rangée « Parce que vous avez regardé… » calculée côté serveur |
| 9 | Images de partage sans affiche ni portrait | Liens WhatsApp peu attirants | Gabarit avec l'affiche ou le portrait |
| 10 | Seuls les lancements et fins de lecture sont mesurés | Impossible de prouver l'effet de la refonte | Lot 0 : plan de mesure avant tout changement visuel |

## Objectifs et indicateurs

L'objectif est d'augmenter de 30 % le nombre de lectures par visiteur actif et de 25 % le temps de visionnage par session, 90 jours après le passage à 100 % des visiteurs. Les bases de référence n'existent pas encore : le lot 0 les mesure pendant 14 jours avant toute modification visuelle.

| Indicateur | Définition | Cible à J+90 | Source |
| --- | --- | --- | --- |
| Lectures par visiteur actif | Lectures lancées / visiteurs actifs sur 7 jours | +30 % | Événement `play_start` |
| Temps de visionnage par session | Médiane des minutes lues par session | +25 % | `play_progress` toutes les 10 s |
| Taux de lecture depuis l'accueil | Sessions ouvertes sur l'accueil avec au moins une lecture | +10 points | `session_start`, `play_start` |
| Taux d'achèvement | Lectures atteignant 90 % de la durée | ≥ 50 % | `play_complete` |
| Retour à 7 jours | Visiteurs revenus entre J+1 et J+7 | +5 points | Identifiant d'appareil anonyme |
| Temps avant première image | Toucher « Regarder » → première image, p75 en 4G | < 3 s | `play_first_frame` |
| Abandon à la connexion | Feuilles de connexion ouvertes sans connexion réussie | −20 % | `auth_sheet_open`, `auth_success` |
| Passage Découvrir → film | Lectures de film issues d'un extrait | 1 pour 15 extraits vus | `clip_view`, `play_start.source` |
| Installation de l'app | Visiteurs de 3 visites et plus ayant installé la PWA | ≥ 10 % | `appinstalled` |

**Indicateurs garde-fous** : ils ne doivent pas se dégrader, sinon le déploiement s'arrête.

| Garde-fou | Seuil d'alerte |
| --- | --- |
| Données mobiles consommées hors lecture de film, par session | > 15 Mo en médiane |
| Part du temps passé dans Découvrir par rapport aux films | > 40 % du temps total |
| Signalements par 1 000 lectures | Hausse de plus de 50 % |
| Désactivation de la lecture automatique | > 30 % des membres |
| Accessibilité (audit axe) | Une seule violation grave |

Le garde-fou sur Découvrir protège la raison d'être d'E-Ciné : faire regarder des films congolais, pas des extraits en boucle.

## Utilisateurs et contexte RDC

Le public cible est jeune, sur Android, habitué au fil vertical de TikTok, et paie ses données mobiles : chaque choix de design est jugé sur un Android de milieu de gamme en 4G instable, pas sur un iPhone en Wi-Fi.

| Donnée | Valeur | Conséquence pour le design |
| --- | --- | --- |
| Internautes en RDC, fin 2025 | 34,7 millions, 30,5 % de la population ([DataReportal](https://datareportal.com/reports/digital-2026-democratic-republic-of-the-congo)) | Marché en croissance, beaucoup de premiers usages du streaming |
| Âge médian | 15,8 ans ([DataReportal](https://datareportal.com/reports/digital-2026-democratic-republic-of-the-congo)) | Codes visuels des applications sociales, phrases courtes |
| Utilisateurs adultes de TikTok | 10,4 millions, soit 30 % des internautes ([DataReportal](https://datareportal.com/reports/digital-2026-democratic-republic-of-the-congo)) | Le fil vertical est un geste déjà appris : Découvrir le reprend |
| Connexions mobiles en 3G, 4G ou 5G | 79,6 % ([DataReportal](https://datareportal.com/reports/digital-2026-democratic-republic-of-the-congo)) | La 4G est la norme de test, la 3G le cas dégradé |
| Systèmes mobiles, juin 2026 | Android 85 %, iOS 15 % ([StatCounter](https://gs.statcounter.com/os-market-share/mobile/congo-democratic-republic-of-the)) | Android d'abord : vibrations, invite d'installation, bouton retour |

**Personas**

| Persona | Contexte | Ce qu'il attend | Ce qui le fait partir |
| --- | --- | --- | --- |
| Grace, 22 ans, étudiante à Kinshasa | Android d'entrée de gamme, forfait journalier, regarde le soir, partage sur WhatsApp | Trouver vite un film congolais qui lui parle, savoir ce qu'il va lui coûter en données | Un écran figé, une vidéo qui démarre seule et mange son forfait |
| Patrick, 35 ans, cadre à Lubumbashi | Bon Android ou iPhone, Wi-Fi à la maison, films entiers le week-end | Qualité d'image, reprise exacte, Ma liste | Une app qui « fait site web », des menus confus |
| Nadège, 30 ans, diaspora à Bruxelles | PC et mobile, fibre | Le cinéma du pays en qualité, les nouveautés, les talents | Un catalogue difficile à parcourir sur grand écran |
| Ruth, éditrice E-Ciné | Ordinateur au bureau, téléphone en déplacement | Publier un film et programmer l'accueil en quelques minutes | Des formulaires longs, des enregistrements perdus |

Trois contraintes s'appliquent à tous les écrans : le téléphone est parfois partagé, le réseau coupe sans prévenir (ADR-0006) et rien ne doit démarrer en vidéo sans que la personne puisse le prévoir.

## Benchmark : ce que la refonte emprunte

Les trois références du client convergent en 2026 vers le même modèle mobile : peu d'onglets, une découverte visuelle et verticale, des transitions fluides. E-Ciné prend à chacune ce qui sert un catalogue congolais regardé sur Android ; l'analyse complète et sourcée est dans 01 · Benchmark et psychologie.

| Référence | Ce qu'E-Ciné prend | Exigences |
| --- | --- | --- |
| Netflix (refonte mobile du 30 avril 2026) | Barre du bas réduite à l'essentiel, fil vertical d'extraits avec ajout à Ma liste sans quitter le fil, rangées, Top 10, aperçu rapide au toucher d'une affiche | R-ENG-01 à R-ENG-06 |
| Prime Video | Top 10 très visuel, grandes affiches mises en avant, signalétique claire de ce qui est disponible, interface pensée pour les appareils anciens | R-ENG-07, R-PERF-01 |
| Apple TV (iOS 26) | Barre d'onglets flottante qui se rétracte au défilement, coins concentriques, matériaux translucides, typographie et silences | R-NAT-01 à R-NAT-04 |

Ce qu'E-Ciné n'emprunte pas : les aperçus vidéo qui démarrent partout sans condition (coût des données) et l'effet de verre réfractif complet d'Apple (trop coûteux pour un Android modeste).

## Psychologie de l'engagement

La plateforme retient par la valeur, pas par la contrainte : chaque levier réduit l'effort pour trouver et lancer un film, ou donne une raison de revenir. Les 14 exigences ci-dessous sont obligatoires ; leurs mécanismes, mesures et lignes rouges sont détaillés dans 01 · Benchmark et psychologie.

| ID | Exigence | Levier psychologique | Garde-fou |
| --- | --- | --- | --- |
| R-ENG-01 | Accueil = une grande affiche à la une puis des rangées de 10 à 20 titres | Loi de Hick : un choix évident, des alternatives à portée de pouce | 5 titres au plus à la une |
| R-ENG-02 | Rangée « Reprendre » en premier, barre de progression rouge, reprise en un geste | Effet Zeigarnik : une tâche inachevée reste en tête | Exclure les lectures de moins de 2 min ; bouton « Retirer » |
| R-ENG-03 | Toucher une affiche ouvre un aperçu rapide ; lecture en 2 gestes au plus depuis l'accueil | Modèle de Fogg : baisser l'effort plutôt que pousser la motivation | Toujours un lien vers la fiche complète |
| R-ENG-04 | Onglet Découvrir : fil vertical d'extraits, ajout à Ma liste et « Regarder le film » sans quitter le fil | Récompense variable, écart de curiosité | Pause après 20 extraits (R-ENG-13) |
| R-ENG-05 | Ma liste et J'aime en un geste partout, réponse visuelle et vibration en moins de 100 ms | Seuil de Doherty, investissement | Annulation possible depuis la notification |
| R-ENG-06 | Fin de film : compte à rebours de 10 s vers une suite, annulable | Effet de la valeur par défaut | 2 enchaînements au plus, puis « Toujours là ? » ; désactivé en économie de données |
| R-ENG-07 | Rangée « Top 10 en RDC cette semaine » avec grands chiffres | Preuve sociale | Données réelles uniquement, jamais d'ordre manuel ; masquée sous 10 titres vus |
| R-ENG-08 | Rangée « Parce que vous avez regardé {titre} » calculée côté serveur | Personnalisation (effet cocktail party) | Toujours dire pourquoi ; action « Pas pour moi » |
| R-ENG-09 | « Bientôt sur E-Ciné » avec date de sortie et « Me le rappeler » | Anticipation | Un seul rappel par titre ; permission de notification demandée à ce moment-là seulement |
| R-ENG-10 | Animation du clap au lancement ; écran de fin avec une seule suite | Règle pic-fin | Le clap dure 240 ms au plus et ne retarde pas la vidéo |
| R-ENG-11 | Après la première lecture : « Choisissez 3 genres » pour affiner l'accueil | Effet IKEA | Facultatif, jamais avant la première lecture |
| R-ENG-12 | Langue du film, lieu de tournage et talents congolais visibles sur les tuiles et fiches | Identité et fierté d'appartenance | Informations exactes saisies en administration |
| R-ENG-13 | Après 20 extraits : « Envie d'un film entier ? » avec 3 propositions | Pause éthique tournée vers la valeur | Bouton « Continuer » de même poids |
| R-ENG-14 | Partage prêt pour WhatsApp : image avec l'affiche, texte court, lien direct vers la lecture | Déclencheur externe | Le lien n'expose aucune donnée du compte |

## Direction artistique et charte

« Nuit de Kin » est une salle de cinéma la nuit : un fond bleu nuit qui laisse toute la place aux affiches, le bleu du logo pour agir, le rouge du logo pour signaler un moment. La spécification complète, jetons compris, est dans 02 · Charte et design system.

| Élément | Décision |
| --- | --- |
| Fond (thème Nuit, par défaut) | `#0A0F16`, surfaces `#111823`, `#1A2330`, `#243042` |
| Bleu d'action | `#1E76BC` du logo, texte blanc dessus (4,8:1) : boutons principaux, sélection, liens |
| Rouge de moment | `#D7262B` du logo : progression de lecture, Top 10, « Nouveau », J'aime |
| Texte | `#F4F6FA`, secondaire `#A7B1C2` |
| Typographie | Police du système (SF Pro sur iPhone, Roboto sur Android) pour l'interface ; Archivo variable pour les titres, chiffres du Top 10 et affiche à la une |
| Formes | Coins arrondis concentriques de 8 à 24 px, pastilles entièrement arrondies ; aucune bordure sur les affiches |
| Icônes | Jeu Solar (480 Design, licence CC BY 4.0) : style Linear au repos, Bold Duotone quand l'élément est actif |
| Signatures de marque | Le **clap** (les deux barres inclinées du logo se referment au lancement d'un film) et le **coin coupé** du badge rouge, repris sur les badges « Nouveau », « Top 10 » et « Court-métrage » |
| Thème Jour | Complet et accessible, fond `#F5F7FA` ; le lecteur reste noir dans les deux thèmes |

Le bleu et le rouge ont chacun un seul rôle : une personne apprend en quelques minutes que le bleu « fait » et que le rouge « se passe ».

## Expérience native mobile

Sur téléphone, E-Ciné doit se comporter comme une application installée : navigation au pouce, réponse immédiate à chaque toucher, écrans qui glissent au lieu de clignoter. Les spécifications détaillées sont dans 03 · Expérience native mobile.

| ID | Exigence |
| --- | --- |
| R-NAT-01 | Barre d'onglets flottante en pastille arrondie : Accueil, Découvrir, Nouveautés, Moi, plus un bouton Recherche rond détaché à droite. Elle se rétracte quand on descend et revient quand on remonte. |
| R-NAT-02 | En-tête transparent sur l'affiche à la une, qui devient une surface translucide après 24 px de défilement. |
| R-NAT-03 | Transitions : l'affiche se transforme en image de la fiche, les écrans d'approfondissement glissent depuis la droite, les feuilles montent du bas, les onglets changent en fondu court. |
| R-NAT-04 | Rayons concentriques et matériaux translucides réservés à la navigation, avec une version pleine de remplacement. |
| R-NAT-05 | Gestes : feuilles glissables avec points d'arrêt, double toucher à gauche ou à droite pour reculer ou avancer de 10 s, tirer pour rafraîchir sur l'accueil, appui long sur une affiche. |
| R-NAT-06 | Chaque toucher répond en moins de 100 ms : légère réduction de taille, vibration courte sur Android, retour haptique sur iPhone quand le navigateur le permet. |
| R-NAT-07 | Chaque route a un `loading.tsx` dont le skeleton reproduit exactement la mise en page finale ; chaque image affiche un aperçu flou et sa couleur dominante avant chargement. |
| R-NAT-08 | Invite d'installation discrète après 2 visites ou après un film terminé ; écran de démarrage ; commandes de lecture sur l'écran verrouillé (Media Session). |
| R-NAT-09 | Mode allégé automatique sur les téléphones modestes et en économie de données : pas de flou, pas d'aperçu vidéo automatique, animations simplifiées. |

Sur PC (≥ 1 056 px), le rail latéral laisse la place à une barre de navigation en haut, transparente sur l'affiche à la une, comme sur Netflix et Prime Video.

## Exigences par écran public et lecteur

Deux écrans sont créés (Découvrir et Nouveautés) et tous les autres sont redessinés ; aucune URL existante ne change, pour préserver le référencement et les liens déjà partagés. Maquettes et états détaillés : 04 · Écrans publics et lecteur.

| Écran (URL) | Action principale | Ce qui change | Lot |
| --- | --- | --- | --- |
| Accueil `/fr` | Regarder (affiche à la une) | Affiche à la une, pastilles Films / Courts-métrages / Catégories, rangées ordonnées côté serveur | 3 |
| Aperçu rapide (feuille) | Regarder | Nouveau : feuille au toucher d'une affiche, aperçu vidéo sous conditions | 3 |
| Fiche film `/fr/films/{slug}` | Regarder / Reprendre | Image plein cadre avec voile, rangée d'actions en icônes, distribution en portraits ronds, bande-annonce lue dans la page | 3 |
| Découvrir `/fr/decouvrir` | Regarder le film | Nouveau : fil vertical plein écran d'extraits, publications et actualités ; remplace le fil de l'accueil | 4 |
| Nouveautés `/fr/nouveautes` | Aucune (« Me le rappeler » en secondaire sur chaque carte) | Nouveau : Bientôt, Événements, Actualités ; `/fr/actualites` reste accessible | 3 |
| Recherche `/fr/recherche` | Aucune (résultats) | Vide : catégories en vignettes, talents, recherches fréquentes ; saisie : suggestions instantanées | 3 |
| Films, Courts-métrages, Catégorie, Talents | Aucune | Grilles d'affiches et de portraits redessinées, filtres en pastilles | 3 |
| Moi `/fr/moi` | Se connecter (visiteur) | Reprendre, Ma liste, Mes rappels, Réglages regroupés ; À propos et Contact déplacés ici | 3 |
| Lecteur | Lecture / pause | Commandes redessinées, double toucher ±10 s, suite automatique, « Avec » (distribution) à la pause, écran verrouillé | 4 |
| Connexion, inscription, mot de passe | Se connecter / Créer un compte | Feuille à la demande conservée, redessinée ; choix des goûts après la première lecture | 3 |
| Hors ligne, 404, erreur, états vides | Un seul bouton | Illustrations tirées du logo au lieu des motifs provisoires | 2 |

## Exigences du back-office admin

L'administration doit permettre de publier un film complet en moins de 10 minutes et de programmer l'accueil en moins de 2 minutes, sans jamais perdre une saisie. Elle hérite des jetons de la charte mais reste plus dense et plus sobre que le site public ; détail dans 05 · Back-office admin.

| ID | Exigence |
| --- | --- |
| R-ADM-01 | Palette de commandes (Ctrl K ou ⌘ K) : aller à un écran, créer un contenu, chercher un film ou un utilisateur. |
| R-ADM-02 | Actions instantanées (publier, archiver, résoudre) avec notification « Annuler » pendant 6 s, au lieu de feuilles de confirmation, sauf pour la suppression définitive. |
| R-ADM-03 | Tableaux denses : tri, filtres dans l'URL, sélection multiple et actions groupées, densité confortable ou compacte. |
| R-ADM-04 | Édition rapide en panneau latéral (560 px) depuis une liste ; éditeur pleine page pour les films. |
| R-ADM-05 | Recadrage et point focal par ratio (2:3, 4:5, 16:9, 1:1, 9:16) ; aperçu flou et couleur dominante calculés à l'envoi. |
| R-ADM-06 | Nouvel écran « Programmation de l'accueil » : affiches à la une planifiées, ordre des rangées éditoriales, aperçu téléphone et PC. |
| R-ADM-07 | Nouvel écran « Extraits » : envoi de vidéos verticales de 60 s au plus, choix de l'image de couverture, lien vers le film. |
| R-ADM-08 | Envoi vidéo avec débit et temps restant ; suivi du transcodage en temps réel. |
| R-ADM-09 | Tableau de bord d'engagement : lectures par visiteur, achèvement, retour à 7 jours, clics par rangée, passage extrait → film. |
| R-ADM-10 | Skeletons sur chaque écran, raccourcis clavier documentés, double authentification avec QR code et parcours de désactivation. |

Le Top 10 n'est jamais modifiable en administration : il est calculé, et c'est ce qui le rend crédible.

## Exigences non fonctionnelles

Une belle interface qui rame sur un Android modeste est un échec : les budgets ci-dessous sont bloquants en CI et sur l'appareil de référence (Android de milieu de gamme à 4 Go de RAM, Chrome, 4G réelle à Kinshasa).

| ID | Domaine | Budget ou règle |
| --- | --- | --- |
| R-PERF-01 | Affichage | LCP p75 < 2,5 s en 4G, < 4 s en 3G simulée ; CLS < 0,1 |
| R-PERF-02 | Réactivité | INP p75 < 200 ms ; retour visuel d'un toucher < 100 ms |
| R-PERF-03 | Animations | 60 images/s sur l'appareil de référence ; seules `transform` et `opacity` sont animées |
| R-PERF-04 | Poids | JavaScript de la première page ≤ version actuelle + 10 % ; polices ≤ 45 Ko ; images de l'accueil au premier écran ≤ 400 Ko, ≤ 250 Ko en économie de données |
| R-PERF-05 | Données vidéo hors film | Aperçu automatique ≤ 1,5 Mo, en 240p, uniquement sous les conditions de R-NAT-09 |
| R-A11Y-01 | Accessibilité | WCAG 2.2 AA ; contrastes de la charte vérifiés par `pnpm check:contrast` ; cibles de 44 px |
| R-A11Y-02 | Mouvement | Tout mouvement décoratif coupé en mouvement réduit ; transparences coupées en transparence réduite |
| R-A11Y-03 | Recette | TalkBack (Android) et VoiceOver (iPhone) sur les 5 parcours clés ; zoom à 200 % sans perte de contenu |
| R-DATA-01 | Données | Toujours rendues côté serveur ; aucun appel de données depuis le navigateur hors actions utilisateur |
| R-PRIV-01 | Vie privée | Historique anonyme sur l'appareil seulement ; personnalisation et mesures soumises au choix cookies existant |
| R-I18N-01 | Textes | Toutes les chaînes dans `messages/fr.json`, aucune locale écrite en dur (dette n° 18) |

## Règles produit modifiées

Quatorze règles de `docs/05` changent ; le lot 1 ne commence qu'une fois chaque ligne passée à « Validée » ou « Refusée » par le client. Une ligne refusée garde la règle actuelle et l'agent adapte la spécification concernée.

| # | Règle actuelle | Nouvelle règle | Pourquoi | Décision |
| --- | --- | --- | --- | --- |
| D-01 | Aucun dégradé, texte sur image = bandeau plein | Dégradés autorisés pour trois usages seulement : voile de lisibilité sur image, halo d'ambiance tiré de la couleur de l'affiche, badge du logo. `check:gradient` passe en liste blanche de jetons | Une affiche plein cadre lisible exige un voile ; c'est la base de Netflix, Prime et Apple | Validée le 8 oct. 2026 |
| D-02 | Angles droits, rayons de 0 à 2 px | Rayons concentriques de 8 à 24 px, pastilles entièrement arrondies | Les angles droits donnent l'allure d'un outil d'entreprise | Validée le 8 oct. 2026 |
| D-03 | Aucune ombre | Une ombre douce réservée aux couches flottantes (barre d'onglets, feuilles, menus, notifications), surtout utile en thème Jour | Distinguer ce qui flotte de ce qui défile | Validée le 8 oct. 2026 |
| D-04 | Verre dépoli interdit | Matériau translucide sur la navigation uniquement, repli plein en mode allégé | Code natif d'iOS 26 ; jamais sur le contenu | Validée le 8 oct. 2026 |
| D-05 | IBM Plex en 3 familles, titres en serif, métadonnées à chasse fixe | Police du système + Archivo pour les titres ; plus de chasse fixe ; Inter reste interdite | Sensation native, 0 Ko pour le texte courant | Validée le 8 oct. 2026 |
| D-06 | 64 icônes dessinées à la main, angles vifs | Jeu Solar, Linear au repos, Bold Duotone actif ; attribution CC BY 4.0 obligatoire | Demande du client, cohérence avec les barres arrondies | Validée le 8 oct. 2026 |
| D-07 | Aucune animation de rebond | Ressorts avec dépassement ≤ 3 %, uniquement quand la personne manipule (appui, onglet, feuille) | C'est ce qui donne la sensation physique d'iOS et d'Android | Validée le 8 oct. 2026 |
| D-08 | Son à chaque toucher, activé par défaut ; un seul réglage son et vibration | Sons d'interface coupés par défaut, clap au lancement conservé ; réglages Sons et Vibrations séparés | Les apps natives sont silencieuses au toucher | Validée le 8 oct. 2026 |
| D-09 | Thème sombre forcé, thème du système ignoré | Nuit par défaut sur le site, choix « Automatique » proposé ; administration en Automatique ; couleur de la barre du navigateur suivant le thème | Le cinéma se regarde dans le noir, l'administration se travaille de jour | Validée le 8 oct. 2026 |
| D-10 | Accueil = fil de découverte vertical | Accueil en rangées ; le fil devient l'onglet Découvrir, en plein écran | Deux usages distincts : choisir un film, flâner | Validée le 8 oct. 2026 |
| D-11 | 5 onglets mobiles, rail sur PC | 4 onglets + recherche dans une barre flottante ; navigation haute sur PC | Courts-métrages et Talents redeviennent accessibles par Accueil et Recherche | Validée le 8 oct. 2026 |
| D-12 | Aucun aperçu vidéo | Aperçus muets automatiques sous conditions de réseau et d'appareil | Premier levier de découverte des plateformes, à coût de données maîtrisé | Validée le 8 oct. 2026 |
| D-13 | Motifs textiles provisoires partout | Motifs retirés ; illustrations construites avec la géométrie du logo, en attendant une validation culturelle | Un motif « inspiré » non validé est un risque d'image | Validée le 8 oct. 2026 |
| D-14 | Surtitres en capitales à chasse fixe | Casse normale partout, sauf le mot « TOP » des badges | Lecture plus rapide, ton moins technique | Validée le 8 oct. 2026 |

Restent inchangés : un seul bouton principal par écran (contrôlé par `data-cta="primary"`), accessibilité, aucun motif sombre, rendu des données côté serveur, loader orbital pour les attentes de plus de 300 ms.

## Livraison, critères d'acceptation, risques

La refonte se livre en 7 lots derrière un indicateur de déploiement (`refonte_v2`) : aucun visiteur ne voit le nouveau design avant la porte G3, et chaque porte se franchit sur une mesure, pas sur une date. Les tâches de chaque lot sont dans le guide d'exécution des agents.

&#91;embedded content: feuille de route · 7 lots, 7 portes de validation\]

Le lot 5 ne bloque pas le site public : il démarre après G1 et rejoint la recette finale.

**Critères d'acceptation de la refonte**

- [x] Les 14 décisions D-01 à D-14 sont tranchées par le client (validées le 8 octobre 2026).
- [ ] Chaque écran public a un skeleton, un état vide, un état d'erreur et un seul bouton principal.
- [ ] `check:contrast`, `check:gradient`, `check:icons`, `check:tokens`, `lint`, `typecheck` et `test:e2e` passent.
- [ ] Les budgets R-PERF-01 à R-PERF-05 sont tenus sur l'appareil de référence.
- [ ] Les 5 parcours clés passent avec TalkBack et VoiceOver : lancer un film depuis l'accueil, reprendre, ajouter à Ma liste, trouver un talent, se connecter au moment d'agir.
- [ ] Test avec 5 personnes à Kinshasa sur leur propre téléphone : au moins 4 lancent un film en moins de 30 s sans aide.
- [ ] L'attribution Solar figure dans À propos et dans `THIRD_PARTY_NOTICES.md`.
- [ ] `docs/05` v2 et les 18 captures du guide d'administration sont à jour.

**Risques**

| Risque | Probabilité | Parade |
| --- | --- | --- |
| Catalogue trop petit pour remplir les rangées et le Top 10 | Élevée | Rangée masquée sous 6 titres, Top 10 sous 10 titres vus ; rangées éditoriales en complément |
| Pas assez d'extraits verticaux pour nourrir Découvrir | Élevée | Onglet ouvert seulement avec 30 extraits ; production des extraits lancée dès le lot 0 |
| Coût des données des aperçus et extraits | Moyenne | Conditions R-NAT-09, plafond par session, réglage visible, garde-fou de 15 Mo |
| Flou et transitions lents sur Android modeste | Moyenne | Mode allégé automatique ; porte G2 bloquante |
| View Transitions encore expérimentales dans Next.js ([doc 16.2](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition)) | Moyenne | Derrière un drapeau, repli en fondu, vérification sur 16.3 avant activation |
| Rejet d'une navigation trop changée, comme après la refonte TV de Netflix en 2025 ([TechRadar](https://www.techradar.com/streaming/netflix/netflix-says-a-big-mobile-app-redesign-is-coming-and-subscribers-are-bracing-themselves-for-another-ui-nightmare)) | Moyenne | Déploiement 10 / 50 / 100 %, URL inchangées, bouton « Donner mon avis » |
| Haptique iPhone obtenue par un contournement non officiel | Moyenne | Amélioration facultative, désactivable, aucun parcours n'en dépend |
| Personnalisation perçue comme intrusive | Faible | Calcul côté serveur, « Parce que… » toujours affiché, respect du choix cookies |

## Index des documents pour les agents

Un agent commence toujours par le guide d'exécution, qui lui dit quels autres onglets ouvrir pour son lot. Chaque onglet s'exporte en Markdown vers le chemin indiqué ; ce PRD va dans docs/design/00-prd-refonte.md, et les sources sont dans l'onglet Sources.

| Onglet | Fichier dans le dépôt | Sert à |
| --- | --- | --- |
| 06 · Guide des agents | `docs/AGENTS-REFONTE.md` | Ordre des lots, tâches, contrôles, prompts |
| 01 · Benchmark et psychologie | `docs/design/01-benchmark-psychologie.md` | Justifier chaque choix d'engagement |
| 02 · Charte et design system | `docs/05-DESIGN-SYSTEM.md` (v2) | Jetons, typographie, icônes, composants |
| 03 · Expérience native mobile | `docs/design/03-experience-native.md` | Navigation, transitions, gestes, skeletons, PWA |
| 04 · Écrans publics et lecteur | `docs/design/04-ecrans-publics.md` | Maquette et états de chaque écran |
| 05 · Back-office admin | `docs/design/05-admin.md` | Back-office |

L'inventaire du 8 octobre 2026 reste la référence de l'existant ; ce PRD prime sur lui en cas de contradiction, et `docs/05` v2 prime sur l'ADR-0003.
