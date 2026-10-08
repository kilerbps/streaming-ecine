# 01 · Benchmark streaming et psychologie de l'engagement

Fichier cible : `docs/design/01-benchmark-psychologie.md`. À lire avant de concevoir ou de modifier un écran public.

## Ce que font les leaders en 2026

En 2026, la plateforme de streaming mobile de référence a quatre onglets, un fil vertical d'extraits et une navigation qui s'efface pendant le défilement. Netflix l'a lancé le 30 avril 2026 ; la RDC ne figure pas encore parmi les pays servis au 14 juillet 2026, ce qui laisse à E-Ciné l'occasion d'apporter ce modèle en premier à son public.

| Dimension | Netflix | Prime Video | Apple TV (iOS 26) | Décision E-Ciné |
| --- | --- | --- | --- | --- |
| Navigation mobile | Barre du bas réduite à 4 destinations (Accueil, Clips, Recherche, Mon Netflix) ; types de contenus et Nouveautés déplacés en haut ([What's on Netflix](https://www.whats-on-netflix.com/news/netflix-mobile-updates-clips-new-navigation/)) | Navigation passée en haut en 2024, onglet dédié au contenu inclus ([heise](https://heise.de/-9810873)) | Barres d'onglets qui se rétractent au défilement et reviennent à la remontée ([Apple](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/)) | 4 onglets + Recherche, barre flottante qui se rétracte, pastilles de contenu en haut de l'accueil |
| Découverte | Clips : fil vertical personnalisé d'aperçus, ajout à Ma liste sans quitter le fil ([ETV Bharat](https://www.etvbharat.com/en/technology/netflix-overhauls-mobile-app-with-new-design-and-vertical-video-feed-enn26050104352)) | Rangées et suggestions de recherche pendant la saisie ([Trusted Reviews](https://www.trustedreviews.com/news/amazon-prime-video-app-gets-complete-redesign-4251027)) | Grandes images éditoriales, beaucoup d'espace | Onglet Découvrir vertical + rangées sur l'accueil |
| Mise en avant | Grande affiche à la une, rangées | « Super Carousel » à grandes affiches pour les titres phares ([Mediaweek](https://mediaweek.com.au/amazon-announces-redesign-for-prime-video-user-interface)) | Carrousel plein cadre | Affiche à la une de 5 titres au plus, programmée en administration |
| Preuve sociale | Top 10 | « Top 10 » très visuel sur l'accueil ([Mediaweek](https://mediaweek.com.au/amazon-announces-redesign-for-prime-video-user-interface)) | Classements discrets | Top 10 en RDC, calculé, jamais éditorialisé |
| Clarté de l'offre | — | Coche bleue pour le contenu inclus, sac doré pour l'achat ([BGR](https://bgr.com/tech/amazons-prime-video-redesign-makes-the-app-look-more-like-netflix/)) | — | Système de badges prêt pour une future offre payante, sans l'afficher aujourd'hui |
| Matière et mouvement | Interface sombre, aperçus vidéo | Animations, transitions douces et effets de zoom, optimisés pour les appareils anciens ([heise](https://heise.de/-9810873)) | Matériau Liquid Glass translúcide, commandes concentriques aux coins de l'écran ([Apple](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/)) | Fond nuit, transitions partagées, translucidité sur la navigation seulement |
| Point faible connu | Refonte TV de mai 2025 mal reçue par une partie des abonnés ([TechRadar](https://www.techradar.com/streaming/netflix/netflix-says-a-big-mobile-app-redesign-is-coming-and-subscribers-are-bracing-themselves-for-another-ui-nightmare)) | Réputation d'interface confuse avant 2022 | Translucidité critiquée pour sa lisibilité | Déploiement progressif, URL et parcours connus conservés |

L'objectif affiché par Netflix est de concurrencer YouTube, TikTok et Instagram sur l'usage quotidien, en augmentant le temps passé dans l'app ([Storyboard18](https://www.storyboard18.com/digital/netflix-plans-major-app-redesign-to-expand-short-form-video-and-podcasts-88020.htm)). C'est exactement la concurrence d'E-Ciné en RDC, où TikTok touche 30 % des internautes.

## Motifs à reprendre, à adapter, à éviter

Un motif est repris tel quel s'il réduit l'effort sans coûter de données ; il est adapté s'il coûte des données ou de la puissance ; il est évité s'il retient la personne contre son intérêt.

| Motif | Verdict | Règle E-Ciné |
| --- | --- | --- |
| Grande affiche à la une + rangées horizontales | Reprendre | Rangées de 10 à 20 titres, défilement natif avec aimantation |
| « Reprendre » en première rangée avec barre de progression | Reprendre | Barre rouge de 3 px, temps restant écrit (« 38 min restantes ») |
| Top 10 avec grands chiffres | Reprendre | Chiffres en Archivo, contour seul, affiche collée au chiffre |
| Aperçu rapide au toucher d'une affiche | Reprendre | Feuille à 60 % de hauteur, glissable jusqu'à 92 % |
| Ma liste en un geste, partout | Reprendre | Même icône, même vibration, même notification sur tous les écrans |
| Fil vertical d'extraits | Reprendre | Extraits de 60 s au plus, en 240p ou 360p, préchargement du suivant seulement |
| Barre d'onglets qui se rétracte au défilement | Reprendre | Passe de 64 px à 48 px, libellés masqués, jamais cachée entièrement |
| Aperçus vidéo automatiques | Adapter | Muets, 240p, 1,5 Mo au plus, seulement en 4G ou Wi-Fi détectés, jamais en économie de données |
| Lecture automatique de l'épisode ou du film suivant | Adapter | Compte à rebours de 10 s, 2 enchaînements puis « Toujours là ? » |
| Verre translúcide (Liquid Glass) | Adapter | Flou sur la navigation seulement ; plein en mode allégé et en transparence réduite |
| Personnalisation de l'accueil | Adapter | Côté serveur, à partir de l'historique de l'appareil ou du compte, toujours expliquée |
| Carrousel qui défile tout seul sans contrôle | Éviter | L'affiche à la une avance toutes les 7 s seulement si elle est visible, s'arrête au premier geste |
| Vignettes d'affiche choisies pour appâter | Éviter | Une seule affiche officielle par film, recadrée mais jamais détournée |
| Fausse urgence (« Disponible encore 2 h ») | Éviter | Une date de fin n'apparaît que si elle est réelle et saisie en administration |
| Refonte brutale des parcours connus | Éviter | URL conservées, déploiement 10 / 50 / 100 %, retour d'avis intégré |

## Boucle d'habitude E-Ciné

La rétention vient d'une boucle en quatre temps (modèle Hooked de Nir Eyal) : un déclencheur, l'action la plus simple possible, une récompense qui varie, puis un petit investissement qui rend le déclencheur suivant plus personnel.

&#91;embedded content: boucle d'habitude E-Ciné · 4 étapes\]

Chaque tour nourrit le suivant : Ma liste et la position de lecture alimentent « Reprendre », les genres choisis alimentent « Pour vous », un rappel devient une notification le jour de la sortie.

## Catalogue des leviers psychologiques

Dix-huit leviers sont retenus ; chacun est relié à une exigence du PRD et à un indicateur, pour qu'un agent puisse prouver qu'il fonctionne ou le retirer.

| Levier | Ce qui se passe dans la tête | Application précise | Indicateur | Exigence |
| --- | --- | --- | --- | --- |
| Loi de Hick | Plus il y a d'options égales, plus on hésite | Une affiche à la une avec un seul bouton « Regarder », puis des rangées | Lectures depuis l'accueil | R-ENG-01 |
| Effet Zeigarnik | Une histoire interrompue reste en tête | « Reprendre » en premier, temps restant écrit | Retour à J+1 | R-ENG-02 |
| Modèle de Fogg (B = MAP) | On agit quand c'est facile au moment où on en a envie | Aperçu rapide, lecture en 2 gestes | Gestes avant lecture | R-ENG-03 |
| Récompense variable | L'inattendu entretient l'attention | Fil Découvrir, « Pépite des archives » | Durée de session | R-ENG-04 |
| Écart de curiosité | On veut combler ce qu'on ne sait pas encore | Extrait qui s'arrête avant la résolution, synopsis sur 3 lignes avec « plus » | Extrait → film | R-ENG-04 |
| Seuil de Doherty | Sous 400 ms, la machine suit la pensée | Retour visuel < 100 ms, J'aime et Ma liste instantanés, skeletons | INP, abandons | R-ENG-05 |
| Investissement | Ce qu'on a construit, on y revient | Ma liste, J'aime, rappels, goûts | Taille de Ma liste, retour J+7 | R-ENG-05 |
| Effet de la valeur par défaut | On garde l'option proposée | Suite automatique, qualité automatique | Minutes par session | R-ENG-06 |
| Preuve sociale | Ce que les autres regardent rassure | Top 10 en RDC cette semaine | Clics sur le Top 10 | R-ENG-07 |
| Effet cocktail party | On réagit à ce qui nous concerne | « Parce que vous avez regardé {titre} », prénom dans l'espace Moi | Clics sur la rangée | R-ENG-08 |
| Anticipation | Attendre un plaisir est déjà un plaisir | Bientôt, compte des jours, « Me le rappeler » | Rappels, lectures le jour J | R-ENG-09 |
| Règle pic-fin | On se souvient du sommet et de la fin | Clap au lancement, écran « Merci d'avoir regardé » | Film suivant lancé | R-ENG-10 |
| Effet IKEA | On valorise ce qu'on a contribué à façonner | « Choisissez 3 genres » après la première lecture | Clics sur « Pour vous » | R-ENG-11 |
| Identité d'appartenance | On s'attache à ce qui nous ressemble | Langue, lieu de tournage, talents congolais visibles | Partages | R-ENG-12 |
| Réciprocité | On rend quand on a reçu | Tout se regarde sans compte, connexion demandée seulement pour agir | Inscriptions au moment d'agir | Existant |
| Loi de Jakob | On attend qu'une app marche comme celles qu'on connaît | Codes Netflix et TikTok : rangées, fil vertical, barre du bas | Erreurs de navigation au test | R-NAT-01 |
| Loi de Fitts | Une cible proche et grande se touche vite | Barre et boutons principaux dans la moitié basse, cibles de 44 px | Touches manquées | R-NAT-01 |
| Effet esthétique-utilisabilité | Ce qui est beau semble plus simple et plus fiable | Affiches plein cadre, typographie soignée, mouvement juste | Score de qualité perçue au test | Charte |

## Lignes rouges

Ces motifs sont interdits même s'ils améliorent un indicateur à court terme : une pull request qui en introduit un est refusée. Ils détruisent la confiance, et en RDC une app de streaming se recommande ou se déconseille de bouche à oreille.

| Interdit | Exemple à ne jamais écrire | Ce qu'on fait à la place |
| --- | --- | --- |
| Fausse urgence ou fausse rareté | « Plus que 2 h pour le voir ! » sans date réelle | Date de fin affichée seulement si elle existe |
| Culpabilisation du refus | « Non merci, je n'aime pas le cinéma » | « Plus tard », de même poids que l'acceptation |
| Fausse preuve sociale | Compteurs gonflés, « 1 000 personnes regardent » inventé | Top 10 calculé, J'aime affichés seulement au-dessus de 0 |
| Enchaînement sans fin | Lecture automatique illimitée, extraits sans pause | 2 films enchaînés puis « Toujours là ? » ; pause après 20 extraits |
| Son imposé | Aperçu qui démarre avec le son | Toujours muet ; le son se met d'un toucher |
| Permission demandée à froid | Notification demandée à l'ouverture | Demande uniquement après « Me le rappeler » |
| Sortie cachée | Déconnexion ou suppression du compte enfouie | En un geste depuis Moi, comme aujourd'hui |
| Message de départ | « Vous allez rater la suite… » en quittant | Aucune interruption à la sortie |
| Consentement précoché | Mesure d'audience activée d'office | « Tout refuser » et « Tout accepter » de même poids, comme aujourd'hui |
| Position piège des boutons | « Annuler » à la place habituelle de « Regarder » | Positions fixes d'un écran à l'autre |
| Séries à entretenir | « Vous allez perdre votre série de 5 jours » | Aucune mécanique de série ni de pénalité |

## Audit psychotechnique des cinq écrans clés

Les cinq écrans où l'on perd le plus de monde sont ceux où la personne attend ou hésite : l'arrivée, le choix, le chargement, la connexion et le fil. Chacun a son risque principal et trois interventions obligatoires.

| Écran | But de la personne | État probable | Risque principal | Interventions obligatoires |
| --- | --- | --- | --- | --- |
| Accueil, première visite | « Y a-t-il quelque chose pour moi ? » | Curieuse, peu engagée, réseau incertain | Page blanche ou trop de choix : départ en moins de 10 s | Skeleton immédiat ; affiche à la une avec un seul « Regarder » ; rangée « Top 10 en RDC » visible au premier glissement |
| Aperçu rapide | « Est-ce que ça vaut mes données et mon temps ? » | En train de comparer | Doute sur la durée et le coût | Durée, langue et qualité dans la première ligne ; consommation estimée avec les débits du lecteur (720p ≈ 1,2 Go/h) ; « Regarder » dans la zone du pouce |
| Lecteur en chargement | « Ça marche ou c'est cassé ? » | Impatiente, inquiète pour son forfait | Abandon pendant la mise en tampon | Clap puis loader en moins de 100 ms ; message honnête après 5 s ; bascule en qualité automatique proposée |
| Connexion à la demande | « Pourquoi me demande-t-on un compte ? » | Légèrement contrariée, en plein geste | Abandon de l'action et de la session | Phrase qui dit pourquoi (« Pour retrouver Ma liste sur tous vos appareils ») ; feuille, pas page ; action rejouée après connexion |
| Découvrir | « Me divertir quelques minutes » | Détendue, attention flottante | Flânerie sans fin qui ne mène à aucun film, données consommées | « Regarder le film » toujours visible ; préchargement d'un seul extrait ; pause après 20 extraits avec 3 films proposés |

**Contrôle en 60 secondes, obligatoire dans chaque pull request qui touche un écran**

- [ ] La personne peut dire en une phrase ce que l'écran lui propose.
- [ ] Il y a exactement un bouton principal.
- [ ] Si elle se trompe, elle comprend comment corriger.
- [ ] Elle sait qu'elle a réussi (retour visuel, vibration ou notification).
- [ ] Si elle part et revient, elle retrouve où elle en était.
- [ ] Rien ne consomme de données sans qu'elle puisse le prévoir.
- [ ] Une personne fatiguée, sur un Android modeste, termine sans froncer les sourcils.
