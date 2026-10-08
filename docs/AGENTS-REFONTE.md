# 06 · Guide d'exécution pour les agents

> **Adaptation au pré-lancement — décisions du propriétaire du 8 octobre 2026**
>
> - Les 14 règles D-01 à D-14 du PRD sont **validées**.
> - Le site n'est pas encore en ligne : **aucune attente**. Pas de mesure de base de 14 jours, pas d'indicateur `refonte_v2` ni de coexistence v1/v2 (`data-ui`), pas de déploiement 10 / 50 / 100 %. La v2 **remplace directement** la v1.
> - Les portes G0 à G6 se valident sur captures et mesures en laboratoire (profil Android de référence de Playwright, Lighthouse), puis sur le terrain après la mise en ligne. La base de laboratoire est dans `docs/design/base-2026-10.md`.
> - Le SVG officiel du logo sera fourni plus tard : en attendant, l'agent garde le SVG actuel et prépare le script de déclinaisons.
> - L'ADR « Charte Nuit de Kin » prend le numéro **0011** (l'ADR-0010 existe déjà : stockage objet et CDN).

Fichier cible : `docs/AGENTS-REFONTE.md`. C'est le seul document qu'un agent doit suivre pas à pas ; les autres onglets sont ses références.

## Mission et règles d'or

La mission : refaire toute la couche visuelle et d'interaction d'E-Ciné selon ce dossier, lot par lot, derrière l'indicateur `refonte_v2`, sans casser ce qui fonctionne ni les règles produit. Ordre de lecture pour chaque agent : ce guide, puis le PRD, puis l'onglet de référence de son lot.

**Stratégie de code** : pendant le déploiement, le serveur pose `data-ui="v1"` ou `data-ui="v2"` sur `<html>` selon l'indicateur. Les jetons v2 sont scopés sous `[data-ui="v2"]` et les jetons actuels sous `[data-ui="v1"]` ; les primitives (`Button`, `Icon`, `Sheet`…), qui ne lisent que des jetons et gardent leur API, s'affichent donc dans l'une ou l'autre version sans toucher aux écrans. Les écrans v2 (accueil, fiche, Découvrir…) vivent à côté des v1 et sont choisis par le même indicateur. À la porte G6, le scope v1, l'attribut et les écrans v1 sont supprimés. Aucun visiteur ne voit donc la v2 avant G3.

**Règles d'or**

1. **Un lot à la fois.** Le lot suivant ne commence qu'une fois la porte du lot précédent validée. Seule exception : le lot 5 démarre après G1.
2. **Les jetons d'abord.** Aucune couleur, taille, rayon ou durée écrits en dur dans un composant ; tout passe par `tokens.css` (`check:tokens`).
3. **Rien ne disparaît en silence.** Aucune URL publique ne change ; toute fonctionnalité retirée ou déplacée est listée dans la pull request.
4. **Les données restent côté serveur.** Composants serveur pour les données, composants client uniquement pour l'interaction ; aucun appel de données depuis le navigateur hors action de la personne.
5. **Un seul bouton principal par écran**, marqué `data-cta="primary"` et vérifié par les tests.
6. **L'accessibilité n'est pas une option.** Focus visible, libellés, annonce des changements, équivalent visible à chaque geste.
7. **Android modeste d'abord.** Chaque écran est essayé sur l'appareil de référence, ou à défaut avec processeur ralenti 4 fois et 4G lente, avant la pull request.
8. **Chaque effet coûteux a sa version allégée** : `data-perf="lite"`, `data-savedata="on"`, mouvement réduit, transparence réduite.
9. **Tous les textes dans `messages/fr.json`**, au ton défini dans l'onglet 04 (Microcopie).
10. **Aucun motif sombre** (lignes rouges de l'onglet 01). En cas de doute, l'agent s'arrête et demande.
11. **Ne rien inventer.** Une donnée manque (phrase d'accroche, langue, extrait) : l'agent crée le champ en administration et sa migration, ou le signale ; jamais de faux contenu en production.
12. **API expérimentales sous drapeau.** View Transitions, `<Activity>`, retour haptique iPhone : statut vérifié dans les versions installées, activation derrière un indicateur, repli défini.
13. **Le logo ne se redessine pas.** L'agent utilise le SVG officiel dès qu'il est fourni et génère les déclinaisons par script.
14. **La spécification gagne, sauf preuve.** Un agent qui pense qu'une règle est mauvaise la suit, mesure, et propose le changement dans sa pull request avec ses chiffres.

## Fiches de lot

Chaque fiche liste ce qu'il faut lire, les tâches à cocher et la porte qui clôt le lot. Une pull request par tâche ou groupe de tâches cohérent ; la porte est validée par le propriétaire du produit, chiffres à l'appui.

### Lot 0 · Mesure et cadrage

Lire : PRD (Objectifs, Règles produit modifiées), onglet 01.

- [ ] Ajouter les événements, sous le choix cookies existant : `session_start`, `home_row_impression`, `home_row_click` (rangée), `preview_open`, `play_start` (source), `play_first_frame` (ms), `play_progress`, `play_complete`, `clip_view`, `auth_sheet_open` (raison), `auth_success`, `list_add`, `like`, `reminder_set`, `appinstalled`, `admin_publish_duration`.
- [ ] Mesurer 14 jours de base et les consigner dans `docs/design/base-2026-10.md`.
- [ ] Créer l'indicateur `refonte_v2` : cookie pour l'équipe, pourcentage côté serveur stable par visiteur, attribut `data-ui`.
- [ ] Choisir l'appareil de référence (Android à 4 Go de RAM répandu à Kinshasa) et un profil Playwright équivalent (processeur ×4, 4G lente).
- [ ] Brancher Lighthouse CI sur 5 pages avec les budgets R-PERF.
- [ ] Faire trancher D-01 à D-14 et obtenir le SVG officiel du logo.
- [ ] Lancer côté contenu la production de 30 extraits verticaux et des phrases d'accroche.

Porte G0 : base mesurée, décisions tranchées.

### Lot 1 · Fondations

Lire : onglet 02 en entier.

- [ ] Recopier `tokens.css` v2 sous `[data-ui="v2"]`, mettre à jour `contrast-pairs.json` et `globals.css`.
- [ ] Écrire `scripts/springs.ts` et générer les deux ressorts.
- [ ] Retirer IBM Plex des deux mises en page, ajouter Archivo 700 et 800, mesurer le poids (≤ 45 Ko).
- [ ] Mettre en place Solar : `icons.json`, `scripts/build-icons.ts`, composant `Icon` inchangé en API, attribution.
- [ ] Construire ou restyler les primitives de l'onglet 02 (Composants), dont la feuille glissable et le badge à coin coupé.
- [ ] Créer la page `/design` (non indexée, réservée à l'équipe) : chaque composant, chaque état, Nuit et Jour, mouvement réduit, mode allégé.
- [ ] Ajouter `check:tokens`, `check:icons` et la liste blanche de `check:gradient`.
- [ ] Publier `docs/05-DESIGN-SYSTEM.md` v2 et un ADR-0010 « Charte Nuit de Kin » qui amende l'ADR-0003.

Porte G1 : contrastes conformes, `/design` validée par le client.

### Lot 2 · Coquille native

Lire : onglet 03 en entier.

- [ ] Barre d'onglets flottante et bouton Recherche (rétraction, pastille, retour en haut).
- [ ] Navigation haute sur PC, suppression du rail public.
- [ ] En-têtes : grand titre, transparent puis matériau, masquage au défilement ; `theme-color` rendu côté serveur.
- [ ] Transitions de page sous `NEXT_PUBLIC_VIEW_TRANSITIONS`, sens poussée ou retour, respect de `hasUAVisualTransition`.
- [ ] Gestes : feuilles glissables, appui long, tirer pour rafraîchir ; historique pour la touche retour d'Android.
- [ ] `lib/haptics.ts` et `lib/sound.ts` revus, trois réglages séparés.
- [ ] `loading.tsx` pour chaque route, skeleton après 150 ms, `<Suspense>` sur les parties lentes.
- [ ] Mode allégé : détection serveur et script avec nonce, attributs, réglage.
- [ ] Application installable : invite, manifeste, raccourcis, écran de démarrage, notification de mise à jour.
- [ ] Pages 404, erreur, hors ligne et états vides avec les illustrations du logo.
- [ ] Mémoire de défilement par onglet.

Porte G2 : sur l'appareil de référence, 60 images/s au défilement de l'accueil, à l'ouverture d'une feuille et au changement d'onglet ; INP < 200 ms.

### Lot 3 · Accueil et catalogue

Lire : onglet 04 (Accueil à Moi, Connexion), onglet 05 (Éditeurs, Images, Programmation).

- [ ] Migrations : nouveaux champs du film, recadrages et point focal, couleur dominante et aperçu flou, rangées éditoriales, emplacements à la une, rappels, goûts.
- [ ] Administration : `/admin/accueil`, recadrage et point focal, nouveaux champs dans l'éditeur.
- [ ] Accueil v2 : affiche à la une, rangées selon les règles, calcul quotidien du Top 10, personnalisation par `ecine_hist`.
- [ ] Aperçu rapide en route interceptée, menu contextuel.
- [ ] Fiche film v2, transition partagée, nouvelle image de partage avec affiche.
- [ ] Nouveautés : Bientôt avec rappels et permission, Événements avec `.ics`, Actualités.
- [ ] Recherche et exploration, catalogues, talents.
- [ ] Moi et Réglages, double authentification avec QR code et désactivation.
- [ ] Feuille de connexion v2 et choix des goûts.
- [ ] Aperçus vidéo automatiques sous conditions.

Porte G3 : 14 jours à 10 % des visiteurs, lectures par visiteur au moins égales à la base, aucun garde-fou franchi.

### Lot 4 · Découvrir et lecteur v2

Lire : onglet 04 (Découvrir, Lecteur), onglet 05 (Extraits).

- [ ] Administration `/admin/extraits` et transcodage 240p et 360p.
- [ ] `/fr/decouvrir` : fil, lecture automatique sous conditions, son de session, préchargement d'un seul extrait, pause après 20 cartes, ordre des cartes.
- [ ] Lecteur : nouvelles commandes, progression dessinée au-dessus du curseur natif, double toucher, « Avec », « À suivre » et « Toujours là ? », écran final, sous-titres, clap.
- [ ] Media Session, Screen Wake Lock, plein écran et orientation selon la plateforme.
- [ ] Estimation des données consommées (souhaitable).

Porte G4 : première image < 3 s en 4G (p75), données hors film ≤ 15 Mo par session (médiane).

### Lot 5 · Back-office v2 (après G1, en parallèle)

Lire : onglet 05 en entier.

- [ ] Coquille : menu groupé, en-tête, palette de commandes, raccourcis et feuille d'aide.
- [ ] Tableaux : densité, tri, sélection multiple et barre d'actions, panneau latéral, cartes sur téléphone.
- [ ] Actions instantanées avec « Annuler » (sauf suppression définitive).
- [ ] Éditeurs : ancres, indicateur à trois états, aperçu réel téléphone et PC.
- [ ] Envoi vidéo : débit, temps restant, image de couverture, début du générique.
- [ ] Tableau de bord, statistiques d'engagement, alertes garde-fous.
- [ ] Barre flottante sur téléphone selon le rôle.

Porte G5 : un film complet publié en moins de 10 min par une éditrice, envoi vidéo non compris.

### Lot 6 · Recette et lancement

Lire : PRD (Critères d'acceptation), section « Format des pull requests et de la recette » ci-dessous.

- [ ] TalkBack et VoiceOver sur les 5 parcours clés ; zoom à 200 % ; navigation au clavier sur PC.
- [ ] Test avec 5 personnes à Kinshasa sur leur propre téléphone, corrections.
- [ ] Essai sur 3 modèles d'Android d'entrée et de milieu de gamme.
- [ ] Déploiement à 10 %, puis 50 %, puis 100 %, garde-fous suivis chaque jour.
- [ ] Suppression des écrans v1, du scope v1 et de l'indicateur.
- [ ] Les 18 captures du guide d'administration, `docs/05` et `THIRD_PARTY_NOTICES.md` à jour.

Porte G6 : 30 jours à 100 % sans garde-fou franchi.

## Contrôles automatiques

Les règles de la charte ne tiennent dans le temps que si la CI les vérifie ; six contrôles sont ajoutés et trois étendus. Une pull request ne fusionne pas si l'un d'eux échoue.

| Contrôle | Ce qu'il vérifie | Statut |
| --- | --- | --- |
| `pnpm check:contrast` | Toutes les paires de `contrast-pairs.json` v2, dans les deux thèmes, avec les seuils de l'onglet 02 | Existant, paires mises à jour |
| `pnpm check:gradient` | Aucun dégradé hors `--scrim-bottom`, `--scrim-top` et `.ambient` | Existant, liste blanche ajoutée |
| `pnpm check:tokens` | Aucune couleur, rayon, ombre ou durée écrits en dur dans `apps/web/src/components` et `app` (exceptions : logo, images de partage) | Nouveau |
| `pnpm check:icons` | Seules les icônes Solar générées sont utilisées ; aucune autre bibliothèque d'icônes ; aucun `<svg>` en ligne hors logo et illustrations | Nouveau |
| `pnpm check:motion` | Chaque `transition` et `animation` utilise les jetons de durée et de courbe ; aucune propriété animée autre que `transform` et `opacity` | Nouveau |
| `pnpm check:copy` | Aucun texte français écrit en dur dans le JSX, aucune locale `fr` codée en dur (dette n° 18) | Nouveau |
| `pnpm test:e2e` | Parcours existants, un seul bouton principal, audit axe sur mobile et PC ; ajout du test « lecture en 2 gestes depuis l'accueil », de la touche retour qui ferme une feuille et du mode allégé | Étendu |
| Captures de référence | Playwright photographie `/design` en Nuit, Jour, mouvement réduit et mode allégé ; tout écart est à valider | Nouveau |
| Lighthouse CI | Budgets R-PERF-01, R-PERF-02 et R-PERF-04 sur accueil, fiche, Découvrir, recherche, admin films | Nouveau |
| Poids des pages | JavaScript de la première page ≤ référence du lot 0 + 10 % | Nouveau |
| `pnpm lint`, `pnpm typecheck` | Inchangés | Existant |

## Prompts prêts à l'emploi

Chaque agent reçoit le préambule commun suivi de la mission de son lot. Les documents sont supposés exportés dans le dépôt aux chemins de l'index du PRD.

**Préambule commun**

```text
Tu travailles sur E-Ciné, plateforme de streaming du cinéma congolais (Next.js 16.3, App Router,
Tailwind v4, rendu serveur, CSP à nonce). Tu participes à la refonte « Nuit de Kin ».

Avant d'écrire du code :
1. Lis docs/AGENTS-REFONTE.md (mission, règles d'or, fiche de ton lot).
2. Lis le PRD (docs/design/00-prd-refonte.md), puis les onglets indiqués dans ta fiche de lot.
3. Lis l'inventaire UI/UX du 8 octobre 2026 pour connaître l'existant et ses pièges
   (sm: dès 320 px, styles hors couches Tailwind, polices déclarées deux fois).
4. Vérifie que la porte du lot précédent est validée. Sinon, arrête-toi et dis-le.

Pendant le travail :
- Respecte les 14 règles d'or, en particulier : jetons uniquement, données côté serveur,
  un seul bouton principal, accessibilité, version allégée de chaque effet, textes dans fr.json.
- Vérifie dans les versions installées toute API marquée expérimentale avant de l'utiliser.
- Si une spécification est ambiguë ou contredit une autre, choisis l'option la plus prudente,
  note-la, et signale-la dans la pull request.

À la fin de chaque pull request, donne :
- les exigences couvertes (identifiants R-…) ;
- les contrôles lancés et leur résultat ;
- des captures mobile 390 px (Nuit et Jour) et PC 1 440 px ;
- les mesures sur l'appareil de référence quand le lot touche un écran ;
- les écarts avec la spécification et leur raison.
```

**Missions par lot** (à coller après le préambule)

```text
LOT 0 — Mets en place la mesure (événements de la fiche, sous consentement), l'indicateur refonte_v2
et l'attribut data-ui, le profil d'appareil de référence dans Playwright et Lighthouse CI.
Ne modifie aucun élément visuel. Livre la procédure de mesure de la base sur 14 jours.
```

```text
LOT 1 — Construis les fondations de l'onglet 02 : tokens.css v2 scopé sous [data-ui="v2"],
ressorts générés, polices (Archivo + système), icônes Solar générées au build, primitives
restylées sans changer leur API, page /design complète, contrôles check:tokens, check:icons
et liste blanche de check:gradient. Aucun écran ne change de structure dans ce lot.
```

```text
LOT 2 — Construis la coquille native de l'onglet 03 : barre d'onglets flottante, navigation PC,
en-têtes, transitions sous drapeau, gestes, retours tactiles, loading.tsx sur toutes les routes,
mode allégé, application installable, pages d'erreur. Mesure 60 images/s et INP sur l'appareil
de référence et joins la trace de performance.
```

```text
LOT 3 — Construis les écrans de l'onglet 04 (Accueil, Aperçu rapide, Fiche, Nouveautés, Recherche,
Moi, Connexion) et ce dont ils dépendent dans l'onglet 05 (nouveaux champs, recadrage, point focal,
/admin/accueil). Les rangées sont calculées côté serveur selon le tableau de l'accueil. Le Top 10
n'est jamais modifiable à la main.
```

```text
LOT 4 — Construis Découvrir et le lecteur v2 de l'onglet 04, et /admin/extraits de l'onglet 05.
Ne touche pas à la logique réseau du lecteur (ADR-0006). Respecte le budget de 15 Mo hors film
par session et prouve-le avec une session type de 20 extraits en 4G.
```

```text
LOT 5 — Construis le back-office v2 de l'onglet 05 : palette de commandes, raccourcis, tableaux,
panneau latéral, actions avec Annuler, indicateur d'enregistrement, aperçu réel, statistiques
d'engagement et alertes garde-fous. Les rôles et les écrans existants sont conservés.
```

```text
LOT 6 — Conduis la recette : lecteurs d'écran réels, zoom 200 %, Android modestes, test avec
5 personnes selon le protocole du guide. Corrige, puis pilote le déploiement 10 / 50 / 100 %
en suivant chaque jour les garde-fous. À 100 %, supprime les écrans et jetons v1.
```

## Format des pull requests et de la recette

Une pull request se relit en 5 minutes si elle suit ce modèle ; le test avec 5 personnes suit un protocole fixe pour que les résultats se comparent d'un lot à l'autre.

**Modèle de pull request** (`.github/pull_request_template.md`)

```markdown
## [Lot N] Titre court

### Ce qui change
Deux ou trois phrases, du point de vue de la personne qui utilise E-Ciné.

### Exigences couvertes
R-NAT-01, R-ENG-03…

### Captures
Mobile 390 px Nuit · Mobile 390 px Jour · PC 1 440 px · mode allégé si concerné

### Mesures (appareil de référence)
LCP … s · INP … ms · images/s au défilement … · poids JS … Ko (écart avec la référence)

### Contrôles
- [ ] check:contrast  - [ ] check:gradient  - [ ] check:tokens  - [ ] check:icons
- [ ] check:motion    - [ ] check:copy      - [ ] lint  - [ ] typecheck  - [ ] test:e2e

### Contrôle en 60 secondes (onglet 01)
- [ ] Une phrase suffit à dire ce que propose l'écran
- [ ] Un seul bouton principal
- [ ] Erreur compréhensible et corrigeable
- [ ] Réussite visible
- [ ] Retour possible sans perte
- [ ] Aucune donnée consommée sans prévenir

### Écarts avec la spécification
Ce qui diffère, pourquoi, et ce que je propose.

### Fonctionnalités retirées ou déplacées
Aucune / liste.
```

**Protocole du test avec 5 personnes** (lot 6, puis à chaque évolution majeure)

| Élément | Règle |
| --- | --- |
| Participants | 5 personnes à Kinshasa, 18 à 35 ans, au moins 3 sur Android d'entrée ou de milieu de gamme, aucune de l'équipe |
| Appareil | Leur propre téléphone, leur propre forfait (données remboursées) |
| Déroulé | Elles pensent à voix haute ; l'animateur n'aide pas ; 30 minutes |
| Tâche 1 | « Trouvez un film qui vous donne envie et lancez-le. » Cible : moins de 30 s |
| Tâche 2 | « Gardez un autre film pour plus tard. » Cible : sans aide, connexion comprise |
| Tâche 3 | « Retrouvez un acteur que vous connaissez. » |
| Tâche 4 | « Regardez quelques extraits, puis lancez le film de l'un d'eux. » |
| Tâche 5 | « Réglez l'app pour qu'elle consomme moins de données. » |
| Ce qu'on note | Temps, hésitations, erreurs, phrases dites, note de 1 à 5 « est-ce que ça fait vraie application ? » |
| Seuil de réussite | 4 personnes sur 5 réussissent chaque tâche sans aide |
| Livrable | `docs/design/test-utilisateurs-AAAA-MM.md` avec les 3 problèmes les plus graves et leur correction |
