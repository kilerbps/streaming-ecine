# 05 · Back-office d'administration

Fichier cible : `docs/design/05-admin.md`. L'administration garde ses 23 écrans et ses rôles ; la refonte vise la vitesse d'exécution des équipes.

## Principes et mesures de fluidité

L'administration est un outil de travail : dense, calme, rapide. Elle partage les jetons du site mais renonce à ses effets (pas de flou, pas de halo, pas d'aperçu automatique), et son thème par défaut est « Automatique ».

1. **Annuler plutôt que confirmer.** Une action réversible s'exécute tout de suite et propose « Annuler » ; seule la suppression définitive demande une confirmation.
2. **Aucune saisie perdue.** Brouillons locaux conservés, barre d'enregistrement collante, alerte en quittant la page (existant), indicateur d'état toujours visible.
3. **Clavier sur PC, pouce sur téléphone.** Tout se fait au clavier sur PC ; sur téléphone, les tâches de modération et de publication rapide tiennent à une main.
4. **Voir ce que verra le public.** Chaque contenu se prévisualise dans les vrais composants du site, sur téléphone et sur PC.
5. **Un écran, une tâche.** Les listes servent à trouver, les panneaux à corriger vite, les éditeurs à créer.

| Mesure | Cible | Comment on la mesure |
| --- | --- | --- |
| Passage d'une liste à une autre | Skeleton en moins de 100 ms, contenu en moins de 1 s | Préchargement des liens du menu, `loading.tsx` par écran |
| Réponse d'une action (publier, archiver, résoudre) | Retour visuel en moins de 100 ms | `useOptimistic` + action serveur |
| Publication d'un film complet | Moins de 10 min, envoi vidéo non compris | Événement `admin_publish_duration` (de « Nouveau film » à « Publié ») |
| Programmation de l'accueil | Moins de 2 min pour changer l'affiche à la une | Chronométrage au test avec 3 éditeurs |
| Saisies perdues | Zéro | Signalements de l'équipe, test de coupure réseau en pleine saisie |

## Coquille et palette de commandes

La coquille actuelle (`app/admin/layout.tsx`, `components/admin/admin-shell.tsx`) garde sa structure et ses rôles ; elle gagne une palette de commandes qui permet d'aller partout et de tout créer sans souris.

| Zone | Spécification |
| --- | --- |
| Menu latéral | 3 modes conservés ; entrées groupées Contenu, Accueil et programmation (nouveau), Communauté, Site, Suivi ; entrée active : lentille `--surface-2`, icône Bold Duotone `--accent-text` |
| En-tête (56 px) | Fil d'Ariane (utile ici), déclencheur « Rechercher ou aller à… Ctrl K », compteur « À traiter », Voir le site, thème, menu du compte |
| Titre d'écran | Archivo 28, pastilles d'état, description, actions à droite (structure actuelle) |

**Palette de commandes** (Ctrl K ou ⌘ K, ou le déclencheur de l'en-tête)

| Section | Contenu |
| --- | --- |
| Aller à | Tous les écrans autorisés par le rôle, filtrés à la frappe |
| Créer | Nouveau film, Nouvelle actualité, Nouvelle publication, Nouvel extrait, Nouvelle rangée éditoriale |
| Chercher | Films, personnes, utilisateurs, articles : action serveur après 180 ms, 8 résultats par type |
| Sur cet élément | Actions de l'écran ouvert : Publier, Planifier, Archiver, Voir sur le site, Copier le lien |
| Récents | 5 derniers éléments ouverts |

Construite sur Radix Dialog et un champ `combobox` accessible ; flèches, Entrée, Échap ; ouverture en fondu et échelle 0,98 → 1 en 150 ms. Si l'agent choisit une bibliothèque de palette, il vérifie qu'elle est maintenue et compatible avec React 19.

**Raccourcis clavier** (feuille d'aide sur la touche `?`)

| Raccourci | Effet |
| --- | --- |
| Ctrl K | Palette de commandes |
| G puis F, P, A, S, U | Aller à Films, Personnes, Actualités, Signalements, Utilisateurs |
| N | Nouveau, dans une liste |
| / | Filtre de la liste |
| E | Éditer la ligne sélectionnée |
| Ctrl S | Enregistrer |
| Ctrl Entrée | Publier, si les contrôles sont au vert |
| Échap | Fermer le panneau ou la feuille |

## Listes et tableaux

Une liste sert à trouver vite et à agir sur plusieurs éléments à la fois ; la structure actuelle (filtres dans l'URL, colonnes Titre, Détails, État, Modifié le, « Voir plus ») est gardée et enrichie.

| Élément | Spécification |
| --- | --- |
| Densité | Confortable (lignes de 52 px) ou compacte (40 px), mémorisée par personne |
| Colonnes | Case à cocher, vignette 40 px au bon ratio, Titre (+ identifiant d'URL en dessous), État, Détails, Modifié le (« il y a 2 h », date complète en heure de Kinshasa au survol), menu « … » |
| Tri | Clic sur l'en-tête de colonne, gardé dans l'URL |
| Compteur | « 48 sur 312 » au-dessus du tableau, « Voir plus » en bas |
| Sélection multiple | Barre d'actions flottante en bas : Publier, Archiver, Mettre à la corbeille, Changer de catégorie ; notification « 12 films archivés · Annuler » |
| Clic sur une ligne | Panneau latéral d'édition rapide ; Ctrl clic ouvre l'éditeur complet dans un nouvel onglet |
| Vues enregistrées (souhaitable) | « Mes brouillons », « Planifiés cette semaine », « Films sans extrait » |
| En-tête | Collant au défilement |
| Chargement | Skeleton de 10 lignes |
| Vide | Illustration, phrase, bouton « Nouveau film » |
| Téléphone | Lignes transformées en cartes (vignette, titre, état, date), menu « … » pour les actions |

**Pastilles d'état** : bordure seule et casse normale (fin des petites capitales) — Brouillon neutre, Planifié accent, Publié succès, Archivé atténué, Corbeille danger, chacune avec son icône.

## Éditeurs et enregistrement

L'éditeur garde sa disposition (formulaire à gauche, colonne de 340 px à droite) et ses protections ; il gagne une navigation par sections, un indicateur d'état clair, un aperçu réel et les champs dont le nouveau design a besoin.

| Élément | Spécification |
| --- | --- |
| Navigation interne | Ancres collantes en haut : Informations, Synopsis, Distribution, Médias, Vidéo, Référencement ; sur téléphone, onglets Contenu, Médias, Publication |
| Indicateur d'enregistrement | Trois états dans la barre collante : « Modifications non enregistrées », « Enregistrement… », « Enregistré à 14 h 32 » ; brouillon local toutes les 600 ms (existant) |
| Contrôles avant publication | Liste à cocher avec icône verte ou rouge et lien « Aller au champ » ; « Publier » ne devient principal que si tout est au vert (existant) |
| Aperçu | Bouton « Aperçu » : panneau avec cadre téléphone de 390 px et bascule PC, qui affiche la tuile, l'aperçu rapide et la fiche avec les vrais composants et les données du brouillon (route `/admin/apercu/film/{id}`, non indexée) |
| Dates | Champs natifs date et heure, libellé « heure de Kinshasa » |
| Panneau d'édition rapide | 560 px depuis la droite : titre, état, catégories, image principale, dates ; « Ouvrir l'éditeur complet » |

**Nouveaux champs du film** (nécessaires aux écrans de la refonte)

| Champ | Utilisé par | Obligatoire |
| --- | --- | --- |
| Langues audio et sous-titres | Tuiles, fiche, aperçu rapide (R-ENG-12) | Oui |
| Lieu de tournage | Fiche | Non |
| Classification d'âge | Badges | Oui |
| Phrase d'accroche (80 caractères) | Affiche à la une, Découvrir | Oui pour l'affiche à la une |
| Titre dessiné (PNG ou SVG transparent) | Affiche à la une, fiche | Non |
| Début du générique (horodatage) | « À suivre » dans le lecteur | Non (repli : 30 s avant la fin) |
| Date de sortie annoncée | Bientôt, rappels | Pour les films à venir |
| Date de fin de disponibilité | Fiche, uniquement si elle est réelle | Non |
| Point focal par ratio, couleur dominante, aperçu flou | Toutes les images | Calculés à l'envoi, point focal réglable |

## Images et vidéos

Le nouveau design découpe chaque image en cinq formats ; sans recadrage ni point focal (dette n° 14), les visages seraient coupés. L'envoi devient donc : un point focal posé une fois, cinq recadrages déduits automatiquement, chacun ajustable.

| Étape | Spécification |
| --- | --- |
| Envoi | Glisser-déposer, coller, sélection multiple ; JPEG, PNG, WebP, AVIF, 4 Mo au plus (existant) |
| Point focal | Un toucher ou un clic sur le visage ou le sujet principal |
| Recadrages | Onglets 2:3 (affiche), 4:5 (fiche mobile, portrait), 16:9 (couverture, PC), 1:1 (crédits), 9:16 (Découvrir) ; chacun déduit du point focal, ajustable par glisser et zoom ; stocké comme un rectangle, l'image d'origine n'est jamais réécrite |
| Calculs à l'envoi | Couleur dominante et aperçu flou (16 px, moins de 500 octets) côté serveur ; variantes WebP en 5 largeurs par recadrage via le chargeur actuel (`lib/image-loader.ts`) |
| Texte alternatif | Obligatoire, case « Image décorative » (existant), interdite pour les affiches |
| Contrôle visuel | Aperçu immédiat de la tuile, de la fiche mobile et de l'affiche à la une avec le voile, pour juger la lisibilité du titre |

**Vidéo**

| Étape | Spécification |
| --- | --- |
| Envoi | Progression, pause et reprise, reprise après rechargement (existant) ; ajout du débit (Mo/s) et du temps restant (dette) |
| Transcodage | Suivi toutes les 3 s (existant), affiché qualité par qualité (144p → 720p) avec coche |
| Image de couverture | Choix parmi 6 images extraites automatiquement, ou envoi d'une image |
| Début du générique | Petit lecteur avec curseur pour poser l'horodatage |
| Bandes-annonces | Recommandation : envoyées dans la même chaîne vidéo plutôt qu'en lien externe, pour la lecture dans la page et la version 9:16 |
| Planche de vignettes (souhaitable) | Une image toutes les 10 s pour l'aperçu au glissement dans le lecteur, si le transcodage le permet |

## Programmation de l'accueil et gestion des extraits

Deux écrans sont créés, parce que le nouvel accueil et Découvrir n'existent que si l'équipe peut les nourrir. Ils sont livrés avec les écrans publics qui en dépendent (lots 3 et 4), pas avec le reste de l'administration.

**Accueil** `/admin/accueil` (Éditeur et Administrateur)

| Bloc | Ce que l'équipe fait | Ce qu'elle ne peut pas faire |
| --- | --- | --- |
| Affiche à la une | 5 emplacements : film, début et fin (heure de Kinshasa), phrase d'accroche, aperçu vidéo oui ou non ; ordre par glisser-déposer ; vue de la semaine à venir ; emplacement vide → dernier film publié | — |
| Rangées éditoriales | Créer une rangée nommée (« Spécial 30 juin »), choisir et ordonner ses titres, la programmer, choisir sa place parmi les positions éditoriales | Déplacer les rangées automatiques, affichées avec un cadenas et leur explication |
| Top 10 | Le consulter | Le modifier : il est calculé |
| Talents à l'honneur | Choisir 6 à 12 talents | — |
| Aperçu | Basculer téléphone ou PC et choisir une date (« l'accueil de samedi à 20 h »), rendu avec les vrais composants | — |

Toute modification s'applique immédiatement ou à l'heure programmée, avec notification « Accueil mis à jour · Annuler ». Chaque glisser-déposer a son équivalent clavier (boutons Monter et Descendre).

**Extraits** `/admin/extraits`

| Élément | Spécification |
| --- | --- |
| Liste | Grille de vignettes 9:16 avec état, film lié, vues, J'aime, taux de passage vers le film |
| Envoi | Vidéo verticale de 60 s au plus ; alerte si le ratio n'est pas 9:16, avec recadrage simple (position horizontale) ; transcodage en 240p et 360p seulement |
| Fiche d'un extrait | Film lié (obligatoire), phrase de 80 caractères, image de couverture parmi 6, programmation, catégories héritées du film |
| Indicateur d'ouverture | « 24 extraits publiés sur 30 nécessaires » tant que l'onglet Découvrir n'est pas ouvert |
| Films à venir | Nombre de rappels demandés par film (« 214 rappels »), pour planifier la communication |

## Tableau de bord et statistiques d'engagement

Le tableau de bord dit à l'équipe quoi faire aujourd'hui ; les statistiques disent si la refonte fonctionne. Elles reprennent exactement les indicateurs et garde-fous du PRD, pour qu'il n'y ait qu'une seule vérité.

**Tableau de bord**

| Bloc | Contenu |
| --- | --- |
| À traiter | Tuiles actuelles (signalements, messages, plafonnées à « 50+ ») + « Films sans extrait », « Films sans phrase d'accroche », « Emplacements à la une vides cette semaine » |
| Aujourd'hui (Administrateur) | Lectures, visiteurs, minutes regardées, taux d'achèvement, chacun comparé à la même journée de la semaine précédente |
| Raccourcis | Nouveau film, Nouvelle actualité, Nouvelle publication, Nouvel extrait, Programmer l'accueil |
| Alerte garde-fou | Bandeau si un garde-fou du PRD est dépassé depuis 3 jours (ex. « Données hors film : 17 Mo par session en médiane ») |

**Statistiques** (7, 30 ou 90 jours, export CSV conservé)

| Vue | Forme | Question à laquelle elle répond |
| --- | --- | --- |
| Lectures et minutes par jour | Colonnes (existant) | L'usage monte-t-il ? |
| Parcours accueil → aperçu → lecture → 90 % | Entonnoir avec pertes entre étapes | Où perd-on les gens ? |
| Clics par rangée de l'accueil | Barres classées | Quelles rangées travaillent ? |
| Passage extrait → film | Barres classées par extrait | Quels extraits donnent envie ? |
| Retour à J+1 et J+7 par semaine d'arrivée | Tableau de cohortes | Les gens reviennent-ils ? |
| Données consommées hors film par session | Ligne de la médiane | Le garde-fou de 15 Mo tient-il ? |
| Sources d'arrivée | Barres classées (WhatsApp, recherche, direct, réseaux) | D'où viennent les visiteurs ? |
| Appareils et systèmes | Barres classées (existant) | Sur quoi regardent-ils ? |

Chaque graphique garde « Voir les données » (tableau accessible, existant) et indique ses unités. Les mesures restent soumises au choix cookies « Mesure d'audience » : les chiffres sont des estimations sur les visiteurs qui l'ont acceptée, et l'écran le dit.

## Administration sur téléphone et micro-interactions

Sur téléphone, l'équipe modère, publie vite et consulte les chiffres ; l'administration y reprend la barre flottante du site, avec des onglets adaptés au rôle, au lieu du seul menu en feuille.

| Rôle | Onglets de la barre flottante |
| --- | --- |
| Modérateur | Tableau de bord, Signalements, Messages, Menu |
| Éditeur et Administrateur | Tableau de bord, Contenus, Signalements, Menu |

« Menu » ouvre la feuille actuelle (nom, rôle, Voir le site, déconnexion) avec toutes les autres entrées. Les listes deviennent des cartes ; les éditeurs passent en une colonne avec onglets ; la barre d'enregistrement reste au-dessus du clavier (API `visualViewport`).

**Micro-interactions**

| Moment | Retour |
| --- | --- |
| Action réversible (publier, archiver, résoudre, changer de rôle) | Effet immédiat, notification « … · Annuler » pendant 6 s, son et vibration de succès selon les réglages |
| Enregistrement | Indicateur à trois états, coche qui apparaît en 150 ms |
| Glisser-déposer (affiche à la une, rangées, ordre des photos) | Élément soulevé (échelle 1,02, ombre de menu), vibration de 8 ms sur Android, place d'arrivée marquée ; équivalent clavier |
| Validation de champ | À la sortie du champ, message qui dit le problème puis la solution, préfixe « ! » conservé |
| Perte de réseau | Bandeau « Hors ligne : vos modifications sont gardées sur cet appareil », enregistrement relancé au retour |
| Session expirée | Feuille de reconnexion, action rejouée (existant) |
| Erreur d'écran | Écran d'erreur avec illustration du logo et un seul bouton |

L'administration n'utilise ni le flou, ni le halo, ni les aperçus automatiques ; ses seules animations sont les retours ci-dessus, les feuilles et la palette de commandes.
