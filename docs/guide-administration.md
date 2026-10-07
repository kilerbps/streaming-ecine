# Guide d’administration E-Ciné

> Pour l’équipe éditoriale, la modération et les administrateurs. Aucune connaissance technique n’est nécessaire.
> Adresse de l’administration : **`/admin`** (par exemple `https://[À COMPLÉTER : domaine]/admin`).
> Les emplacements `[Capture à ajouter : …]` indiquent où insérer une capture d’écran.

---

## Sommaire

1. [Qui peut faire quoi](#1-qui-peut-faire-quoi)
2. [Se connecter et activer la double authentification](#2-se-connecter-et-activer-la-double-authentification)
3. [Se repérer dans l’administration](#3-se-repérer-dans-ladministration)
4. [Publier un film de A à Z](#4-publier-un-film-de-a-à-z)
5. [Ajouter une actrice, un acteur ou un réalisateur et le créditer](#5-ajouter-une-actrice-un-acteur-ou-un-réalisateur-et-le-créditer)
6. [Publier une actualité, une annonce ou un événement](#6-publier-une-actualité-une-annonce-ou-un-événement)
7. [Gérer les publications du fil et l’épinglage](#7-gérer-les-publications-du-fil-et-lépinglage)
8. [Équipe, pages, catégories et redirections](#8-équipe-pages-catégories-et-redirections)
9. [Modérer les signalements et lire les messages](#9-modérer-les-signalements-et-lire-les-messages)
10. [Gérer les utilisateurs et les rôles](#10-gérer-les-utilisateurs-et-les-rôles)
11. [Lire les statistiques et exporter en CSV](#11-lire-les-statistiques-et-exporter-en-csv)
12. [Paramètres du site et journal d’audit](#12-paramètres-du-site-et-journal-daudit)
13. [Que faire si un film fuite](#13-que-faire-si-un-film-fuite)
14. [Corbeille, sauvegardes et problèmes fréquents](#14-corbeille-sauvegardes-et-problèmes-fréquents)

---

## 1. Qui peut faire quoi

Chaque compte a un **rôle**. Un rôle comprend les droits des rôles situés en dessous de lui.

| Rôle | Ce qu’il peut faire dans l’administration |
|---|---|
| **Modérateur** | Tableau de bord, file des **signalements** (résoudre, rejeter, masquer un contenu). |
| **Éditeur** | Tout ce que fait le modérateur, plus : films, personnes, actualités, publications du fil, catégories, équipe, pages, redirections, messages de contact. |
| **Administrateur** | Tout ce que fait l’éditeur, plus : utilisateurs et rôles, paramètres du site, statistiques, journal d’audit. **Double authentification obligatoire.** |
| **Super-administrateur** | Tout, y compris gérer les comptes administrateurs et attribuer le rôle de super-administrateur. |

Le menu n’affiche que les écrans autorisés pour votre rôle. Si vous ouvrez un lien vers un écran non autorisé, la page « Accès refusé » s’affiche : demandez à un administrateur de vérifier votre rôle.

Un membre du public (rôle « Membre ») qui ouvre `/admin` voit un message lui indiquant que l’espace est réservé à l’équipe.

---

## 2. Se connecter et activer la double authentification

### Se connecter

1. Ouvrez `/admin`. Si vous n’êtes pas connecté, la page de connexion du site s’ouvre.
2. Saisissez votre adresse e-mail et votre mot de passe, puis **Se connecter**.
3. Si la double authentification est activée sur votre compte, un champ « Code » apparaît : saisissez le code à 6 chiffres affiché par votre application.
4. Vous arrivez sur le **tableau de bord** de l’administration.

[Capture à ajouter : page de connexion avec le champ du code à 6 chiffres]

### Activer la double authentification (obligatoire pour les administrateurs)

Si votre compte est administrateur et que la double authentification n’est pas active, l’administration affiche l’écran **« Double authentification requise »**.

1. Installez sur votre téléphone une application d’authentification (par exemple une application de type « Authenticator » ; [À COMPLÉTER : application recommandée par l’équipe]).
2. Cliquez sur **Activer la double authentification** : la page *Réglages* de votre compte s’ouvre (`/fr/moi/reglages`).
3. Dans « Sécurité », cliquez sur **Activer la double authentification**, ajoutez la clé affichée dans l’application, puis saisissez le code à 6 chiffres et confirmez.
4. **Déconnectez-vous, puis reconnectez-vous** en saisissant le code : c’est cette nouvelle connexion qui ouvre l’administration.

[Capture à ajouter : écran « Double authentification requise »]
[Capture à ajouter : réglages du compte, section Sécurité]

> Conservez votre téléphone en lieu sûr. En cas de perte, prévenez immédiatement un super-administrateur.

### Se déconnecter

Bouton **Se déconnecter** en haut à droite (sur téléphone : dans le menu ☰). La déconnexion efface aussi de l’appareil les brouillons non enregistrés : pensez à enregistrer avant.

---

## 3. Se repérer dans l’administration

[Capture à ajouter : tableau de bord sur ordinateur, menu latéral déplié]

- **Menu latéral** (à gauche) organisé en quatre parties : **Contenu**, **Communauté**, **Site**, **Suivi**. Sur tablette, le menu est réduit à des icônes ; le bouton en bas du menu le déplie. Sur téléphone, il s’ouvre avec le bouton ☰ en haut à gauche.
- **Barre du haut** : **Voir le site**, changement de thème (sombre / clair), votre nom et votre rôle, **Se déconnecter**.
- **Tableau de bord** : ce qui attend une action (signalements ouverts, messages à traiter, brouillons, contenus planifiés) et, pour les administrateurs, la fréquentation.

### Les états d’un contenu

| Pastille | Signification |
|---|---|
| **Brouillon** | En préparation, invisible sur le site. |
| **Planifié** | Sera mis en ligne automatiquement à la date indiquée. |
| **Publié** | Visible sur le site. |
| **Archivé** | Retiré du site mais conservé (peut être republié). |
| **Supprimé** | Dans la corbeille : invisible, restaurable. |

### Les listes

Chaque liste (films, personnes, actualités, publications…) propose une **recherche**, un **filtre par état** et la case **Afficher la corbeille**. Les éléments les plus récemment modifiés apparaissent en premier ; **Voir plus** affiche la suite.

### Les boutons

- Il y a toujours **un seul bouton principal** (bleu) par écran : c’est l’action conseillée à ce moment-là. Pendant que vous modifiez une fiche, c’est **Enregistrer** ; une fois tout enregistré et prêt, c’est **Publier**.
- Les actions dangereuses (supprimer, désactiver) sont en rouge et demandent toujours une **confirmation**. Pour une suppression, vous devez **recopier le titre** (ou le nom) du contenu.
- Chaque action affiche un message de confirmation en bas de l’écran.

### Les brouillons automatiques

Pendant la saisie, le formulaire est **sauvegardé automatiquement sur votre appareil**. Si la page se ferme ou si la connexion coupe, à votre retour sur la même fiche un bandeau propose **Restaurer le brouillon** ou **Ignorer**. Ce brouillon reste sur l’appareil utilisé : il n’est pas partagé avec vos collègues tant que vous n’avez pas cliqué sur **Enregistrer**.

[Capture à ajouter : bandeau « Un brouillon non enregistré… a été retrouvé »]

---

## 4. Publier un film de A à Z

Menu **Contenu → Films**, puis **Nouveau film**.

### Étape 1 — Créer la fiche

1. **Titre** : l’adresse (slug) se remplit automatiquement à partir du titre (lettres minuscules, chiffres et tirets).
2. **Type** : long-métrage, court-métrage, documentaire ou épisode.
3. **Année**, **Durée (minutes)**, **Classification d’âge** : facultatifs.
4. **Résumé (synopsis)** : obligatoire, en français.
5. **Bande-annonce (URL)** : facultatif, adresse complète commençant par `https://`.
6. **Preuve d’autorisation** : obligatoire. Décrivez précisément le document qui autorise la diffusion (ex. : « contrat signé le 12/09/2026 avec la réalisatrice, conservé au secrétariat de l’INA, réf. 2026-031 »).
7. Cliquez sur **Créer le brouillon**. La fiche s’ouvre : le film est en **Brouillon**, invisible sur le site.

[Capture à ajouter : formulaire « Nouveau film », section Informations]

### Étape 2 — Ajouter l’affiche (avec son texte alternatif)

Section **Affiche** :

1. **Choisir une image** : JPEG, PNG, WebP ou AVIF, **4 Mo au plus**, format portrait (2:3) conseillé.
2. Remplissez le **texte alternatif** : une phrase qui décrit l’affiche à une personne qui ne la voit pas (ex. : « Affiche du film : une femme en pirogue au coucher du soleil sur le fleuve Congo »). Il est **obligatoire** pour une affiche.
3. Cliquez sur **Envoyer l’image**, puis sur **Enregistrer** en bas de la page.

Vous pouvez corriger le texte alternatif plus tard (**Enregistrer le texte alternatif**), **remplacer** l’image ou la **retirer**.

[Capture à ajouter : envoi de l’affiche avec le champ texte alternatif]

### Étape 3 — Confirmer les droits, choisir les catégories, compléter le générique

- **Droits de diffusion** : cochez « Je confirme qu’E-Ciné détient l’autorisation de diffuser ce film » **seulement si** la preuve décrite existe. Décocher cette case sur un film publié le **retire immédiatement du site** (retour en brouillon).
- **Catégories** : cochez jusqu’à 10 catégories.
- **Générique** : voir [section 5](#5-ajouter-une-actrice-un-acteur-ou-un-réalisateur-et-le-créditer).
- **Référencement (SEO)** : facultatif. Le compteur indique la longueur (60 caractères au plus pour le titre, 160 pour la description). Laissez vide pour utiliser le titre et le résumé du film.

Cliquez sur **Enregistrer**.

### Étape 4 — Envoyer la vidéo et attendre le transcodage

Panneau **Vidéo du film** (à droite sur ordinateur, en bas sur téléphone) :

1. **Choisir le fichier vidéo** : MP4, MOV, MKV ou WebM.
2. Cliquez sur **Envoyer la vidéo**. Une barre indique la progression en pourcentage.
3. Vous pouvez **Mettre en pause** puis **Reprendre l’envoi**. Gardez l’onglet ouvert pendant l’envoi.
4. **Si la connexion coupe ou si la page se ferme** : revenez sur la fiche du film. Un message indique « Envoi interrompu ». **Sélectionnez à nouveau le même fichier** puis **Reprendre l’envoi** : l’envoi repart là où il s’était arrêté.
5. À la fin, le message « Envoi terminé » s’affiche et la vidéo passe en **Transcodage** (préparation pour la lecture sécurisée). L’avancement se met à jour tout seul toutes les 3 secondes.
6. Quand la pastille indique **Prête**, la vidéo peut être publiée.

Si la pastille indique **Échec**, lisez le message affiché puis cliquez sur **Relancer le transcodage**. Si l’échec se répète, le fichier est probablement abîmé : supprimez la vidéo et envoyez une autre copie.

[Capture à ajouter : panneau Vidéo du film pendant l’envoi (barre de progression)]
[Capture à ajouter : panneau Vidéo du film, pastille « Prête »]

### Étape 5 — Vérifier les contrôles avant publication

Le panneau **Publication** affiche **Contrôles avant publication** : la liste, en clair, de ce qui manque encore. Par exemple :

- « Ajoutez une affiche. » / « Décrivez l’affiche (texte alternatif). »
- « Confirmez les droits de diffusion. »
- « Ajoutez une vidéo prête (transcodage terminé) ou une bande-annonce. »
- « Ce titre SEO est déjà utilisé par un autre film. »

Quand tout est complet, le panneau indique **Tout est prêt pour la publication**. Les contrôles portent sur la version **enregistrée** : enregistrez d’abord vos modifications.

[Capture à ajouter : panneau Publication avec la liste des éléments manquants]

### Étape 6 — Publier ou planifier

- **Publier** : le film est en ligne immédiatement.
- **Planifier** : choisissez la date et l’heure (**heure de Kinshasa**) ; le film passe en **Planifié** et sera mis en ligne automatiquement. **Changer la date** ou **Annuler la planification** restent possibles.
- **Voir sur le site** apparaît une fois le film publié.

### Plus tard : modifier, retirer, archiver, supprimer

- **Modifier** : changez les champs puis **Enregistrer**. Changer l’adresse (slug) crée automatiquement une **redirection** depuis l’ancienne adresse : les anciens liens continuent de fonctionner.
- **Dépublier** : retire le film du site (retour en brouillon).
- **Archiver** : retire le film du site en le conservant (republiable avec **Republier**).
- **Supprimer** : met le film à la **corbeille** après confirmation (recopier le titre). **Restaurer** le remet en brouillon.

---

## 5. Ajouter une actrice, un acteur ou un réalisateur et le créditer

### Créer la fiche de la personne

Menu **Contenu → Personnes → Nouvelle personne** :

1. **Nom** (l’adresse est proposée automatiquement), **année de naissance** (facultative), **biographie** (texte simple).
2. **Photo** : portrait sur fond uni de préférence, avec son **texte alternatif** (ou cochez « image décorative » si la photo n’apporte aucune information).
3. **Réseaux sociaux** : adresses complètes commençant par `https://` (Instagram, Facebook, X, YouTube, TikTok, LinkedIn, site web).
4. **Créer la fiche**, puis **Publier** dans le panneau Publication quand la fiche est prête.

[Capture à ajouter : fiche personne avec la photo et les réseaux sociaux]

### Créditer la personne sur un film

Sur la fiche du film, section **Générique (crédits)** :

1. Choisissez d’abord le **Rôle de la personne ajoutée** (réalisation, interprétation, scénario, image, montage, musique, production, autre).
2. Dans **Ajouter une personne**, tapez au moins 2 lettres du nom, puis cliquez sur la personne dans les résultats.
3. Pour une interprète, indiquez le **Personnage** joué.
4. Réordonnez avec les flèches ↑ ↓ (l’ordre est celui de l’affichage public) ; retirez un crédit avec la corbeille.
5. **Enregistrer**.

Personne absente des résultats ? Le lien **Créer sa fiche** ouvre un nouvel onglet ; revenez ensuite sur le film et recherchez-la à nouveau.

[Capture à ajouter : section Générique avec la recherche de personne]

---

## 6. Publier une actualité, une annonce ou un événement

Menu **Contenu → Actualités → Nouvelle actualité**.

1. **Type** : *Actualité*, *Annonce* ou *Événement*. Pour un événement, une section **Événement** apparaît : **date et heure** (heure de Kinshasa) et **lieu**.
2. **Titre** (l’adresse est proposée automatiquement) et **Chapeau** (1 à 2 phrases, 300 caractères au plus, affiché dans les listes).
3. **Texte** : la mise en forme se fait avec quelques signes simples. L’**aperçu** à côté (ou l’onglet **Aperçu** sur téléphone) montre le rendu exact du site.

| Vous tapez | Résultat |
|---|---|
| `## Titre` | titre de section |
| `### Sous-titre` | sous-titre |
| `**gras**` | **gras** |
| `*italique*` | *italique* |
| `[texte du lien](https://…)` | lien (adresse en `https://` ou chemin du site comme `/fr/films`) |
| `- élément` | liste à puces (une ligne par élément) |
| `1. élément` | liste numérotée |
| `> citation` | citation |

Laissez une ligne vide entre deux paragraphes. Le HTML n’est pas interprété.

4. **Image de couverture** (format paysage 16:9 conseillé) avec son texte alternatif.
5. **Film mis en avant** (facultatif) : recherchez un film du catalogue pour le présenter sous le texte.
6. **Référencement (SEO)** : facultatif, avec compteurs de caractères.
7. **Créer le brouillon**, relisez l’aperçu, puis **Publier** ou **Planifier**.

[Capture à ajouter : éditeur d’actualité avec l’aperçu Markdown côte à côte]

---

## 7. Gérer les publications du fil et l’épinglage

Menu **Contenu → Publications → Nouvelle publication**. Les publications (photos + texte court) se mêlent aux films dans le fil d’accueil.

1. **Texte de la publication** (2 200 caractères au plus ; les retours à la ligne sont conservés).
2. **Images** : de 1 à 10. Pour chacune : **Choisir une image**, écrire son **texte alternatif** (ou cocher « image décorative »), **Envoyer l’image**. La **première image** sert de vignette dans le fil ; changez l’ordre avec les flèches ↑ ↓.
3. **Épinglage** (facultatif) : choisissez une date dans **Épinglée jusqu’au** ; la publication reste en tête du fil jusqu’à cette date. **Ne plus épingler** retire l’épinglage.
4. **Créer le brouillon**, puis **Publier** ou **Planifier**.

Pour supprimer une publication, recopiez le mot `supprimer` dans la fenêtre de confirmation.

[Capture à ajouter : éditeur de publication avec trois images et les flèches de réordonnancement]

---

## 8. Équipe, pages, catégories et redirections

### Équipe dirigeante (menu Site → Équipe)

Les personnes présentées sur la page « À propos ».

- **Ajouter un membre** : nom, fonction, présentation, photo (texte alternatif exigé si le membre est visible), case **Visible sur la page « À propos »**.
- **Monter / Descendre** : change l’ordre d’affichage.
- **Masquer / Afficher** : retire ou remet le membre sur la page sans le supprimer.
- Les modifications sont **visibles immédiatement** sur le site. La suppression est définitive (recopier le nom).

[Capture à ajouter : liste de l’équipe avec les boutons Monter / Descendre / Masquer]

### Pages du site (menu Site → Pages)

À propos, mentions légales, confidentialité, conditions générales, cookies. Le texte utilise la même mise en forme que les actualités, avec aperçu. **Chaque enregistrement crée une nouvelle version** (le numéro est affiché). Les pages légales ont des adresses fixes : ne modifiez pas leur slug. **Publier** / **Dépublier** depuis le panneau Publication.

> Les textes juridiques doivent être validés par le responsable juridique avant publication.

### Catégories (menu Contenu → Catégories)

Ajoutez une catégorie (nom + adresse proposée), **Modifier** pour la renommer. Une catégorie ne peut être supprimée que si **aucun film** ne l’utilise (retirez-la d’abord des films concernés).

### Redirections (menu Site → Redirections)

Une redirection envoie une ancienne adresse vers une nouvelle. Les changements de slug des films, personnes, actualités et catégories créent leurs redirections **automatiquement**. Ajoutez ici les cas particuliers (anciens liens imprimés, ancien site) : chemins internes commençant par `/` (ex. : `/fr/films/ancien-titre` → `/fr/films/nouveau-titre`), type **301 (définitive)** dans la plupart des cas, **302** pour une redirection temporaire.

---

## 9. Modérer les signalements et lire les messages

### Signalements (menu Communauté → Signalements)

Les membres peuvent signaler un film, une publication, une actualité ou une personne (droits d’auteur, contenu inapproprié, spam, autre). Le nom du signaleur n’est jamais affiché.

Pour chaque signalement ouvert :

- **Résoudre** : le signalement est fondé et a été traité (par exemple, une correction faite par un éditeur).
- **Rejeter (non fondé)** : le signalement ne demande aucune action.
- **Masquer le contenu** : le contenu est **archivé** (il disparaît immédiatement du site) et le signalement est résolu ; les autres signalements ouverts sur ce même contenu sont clos. Un éditeur pourra le republier après vérification.

Les onglets **Ouverts / Résolus / Rejetés** permettent de consulter l’historique. Les éditeurs voient un lien **Ouvrir le contenu** vers la fiche concernée.

[Capture à ajouter : file des signalements avec les trois actions]

### Messages de contact (menu Communauté → Messages)

Les messages envoyés depuis la page Contact. **Répondre par e-mail** ouvre votre messagerie ; **Marquer comme traité** une fois la réponse envoyée. Ces messages contiennent des données personnelles : ne les recopiez pas ailleurs.

---

## 10. Gérer les utilisateurs et les rôles

Menu **Communauté → Utilisateurs** (administrateurs).

- **Rechercher par adresse e-mail**.
- La colonne **Sécurité** indique si la double authentification est activée (« 2FA activée ») et si l’e-mail est vérifié. Un administrateur « Sans 2FA » est signalé en rouge.
- **Changer un rôle** : choisissez le nouveau rôle dans la liste, puis confirmez. Une rétrogradation **ferme toutes les sessions** de la personne. Règles :
  - personne ne peut modifier son propre compte ;
  - un administrateur ne peut attribuer que les rôles inférieurs au sien et ne peut pas modifier un autre administrateur ;
  - seul un super-administrateur attribue les rôles administrateur et super-administrateur.
- **Désactiver** : la personne ne peut plus se connecter et ses sessions sont fermées immédiatement. **Réactiver** pour annuler.

Chaque changement est inscrit au **journal d’audit**. Aucune donnée sensible (mot de passe, code de sécurité) n’est jamais affichée.

[Capture à ajouter : liste des utilisateurs avec la colonne Sécurité et le choix du rôle]

---

## 11. Lire les statistiques et exporter en CSV

Tableau de bord (partie **Fréquentation**) et menu **Suivi → Statistiques** (administrateurs).

- Choisissez la période : **7**, **30** ou **90 jours**.
- **Visites** : pages vues sur la période. **Lectures lancées** / **Lectures terminées** (avec le pourcentage de lectures menées jusqu’au bout). **Membres inscrits** : total des comptes membres.
- **Visites par jour** et **Lectures lancées par jour** : survolez une barre pour lire la valeur exacte, ou dépliez **Voir les données** pour le tableau complet.
- **Films les plus regardés**, **Appareils**, **Sources de trafic** : classements de la période.
- **Exporter en CSV** télécharge un fichier (une ligne par jour : visites, lectures lancées, lectures terminées) à ouvrir dans un tableur.

Les données sont **agrégées et anonymes** et respectent le consentement des visiteurs. Les jours sont comptés en temps universel (UTC).

[Capture à ajouter : écran Statistiques sur 30 jours]

---

## 12. Paramètres du site et journal d’audit

### Paramètres (menu Site → Paramètres, administrateurs)

- **Adresse e-mail de contact** et **téléphone**, affichés sur la page Contact et dans le pied de page.
- **Réseaux sociaux** : adresses complètes ; laissez vide pour masquer un réseau.
- **Publicité** : en version 1, **aucune publicité n’est diffusée**, même si la case est cochée. Cette option prépare la version 2.

**Enregistrer les paramètres** : le site est mis à jour.

### Journal d’audit (menu Suivi → Journal, administrateurs)

Toutes les actions d’administration : date, auteur, action (ex. « Film · publication »), élément concerné. Le journal ne peut pas être modifié. Utilisez-le pour savoir qui a publié, supprimé ou modifié un contenu.

---

## 13. Que faire si un film fuite

Une copie d’un film circule sans autorisation, ou un lien de lecture est partagé hors du site. Agissez dans cet ordre :

1. **Dépublier immédiatement** : fiche du film → panneau Publication → **Dépublier**. Le film disparaît du site et du catalogue.
2. **Supprimer la vidéo** : panneau **Vidéo du film** → **Supprimer la vidéo** (recopier `supprimer`). La clé de chiffrement de cette vidéo est **révoquée** : les lectures en cours s’arrêtent et les liens de lecture copiés ne fonctionnent plus.
3. **Prévenir** l’administrateur technique et les ayants droit : [À COMPLÉTER : noms et contacts].
4. **Consulter le journal d’audit** (menu Suivi → Journal) pour retrouver les actions récentes sur ce film.
5. **Renvoyer la vidéo** depuis la source originale (section [4, étape 4](#étape-4--envoyer-la-vidéo-et-attendre-le-transcodage)) : une **nouvelle clé** est créée au transcodage.
6. Quand la situation est réglée avec les ayants droit, **republier** le film (contrôles avant publication, puis **Publier**).

> Une copie déjà téléchargée hors d’E-Ciné ne peut pas être rappelée techniquement : la suite relève d’une démarche juridique ([À COMPLÉTER : procédure et contact juridique]).

---

## 14. Corbeille, sauvegardes et problèmes fréquents

### Corbeille et restauration

Les films, personnes, actualités et publications supprimés vont dans la **corbeille** : cochez **Afficher la corbeille** dans la liste, ouvrez l’élément (pastille « Supprimé ») et cliquez sur **Restaurer**. Il revient en **brouillon** : il faut le republier. Les membres de l’équipe, les catégories et les redirections sont, eux, supprimés définitivement.

### Sauvegardes

Les sauvegardes de la base de données et des vidéos sont gérées par l’administrateur technique : [À COMPLÉTER : fréquence, durée de conservation, contact pour une restauration].

### Problèmes fréquents

| Message ou situation | Que faire |
|---|---|
| « Double authentification requise » | Voir [section 2](#activer-la-double-authentification-obligatoire-pour-les-administrateurs) ; reconnectez-vous avec le code. |
| « Accès refusé » | Votre rôle ne permet pas cet écran : demandez à un administrateur. |
| Une fenêtre de connexion s’ouvre pendant le travail | Votre session a expiré : reconnectez-vous, puis refaites la dernière action. Le brouillon de votre formulaire est conservé sur l’appareil. |
| « Ce slug est déjà utilisé » | Une autre fiche a déjà cette adresse : modifiez le slug (ajoutez l’année, par exemple). |
| « Image trop lourde » | Réduisez l’image sous 4 Mo (export JPEG ou WebP de qualité moyenne). |
| « Format refusé » (image) | Seuls JPEG, PNG, WebP et AVIF sont acceptés (pas de GIF ni de SVG). |
| L’envoi vidéo s’est arrêté | Revenez sur la fiche, resélectionnez le même fichier et cliquez sur **Reprendre l’envoi**. |
| Vidéo en **Échec** | **Relancer le transcodage** ; si l’échec persiste, supprimez la vidéo et envoyez une autre copie. |
| « Publication impossible » | Le panneau Publication liste ce qui manque : complétez, enregistrez, puis publiez. |
| Écran « momentanément indisponible » | Le serveur ne répond pas : **Réessayer** après quelques instants ; si cela dure, prévenez l’administrateur technique. |
