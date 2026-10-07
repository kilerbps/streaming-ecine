---
name: ecine-ux-psychology
description: Appliquer une psychologie UX éthique à E-Ciné (feed qui surprend sans piéger, un seul CTA, connexion à la demande, reprise de lecture, fluidité perçue). À utiliser pour parcours, feed, onboarding, messages et micro-interactions.
---

# Compétence : psychologie UX (éthique)

Objectif : une expérience qui **surprend et donne envie de revenir**, sans manipulation. Le public est jeune et étudiant : pas de dark patterns.

## Leviers et application
| Principe | Application E-Ciné |
|---|---|
| **Loi de Hick** | Un seul CTA principal par écran ; 5 onglets maximum en bas ; peu de choix |
| **Effet de réduction de friction** | Visionnage sans compte ; connexion **seulement** pour agir ; l'action interrompue est reprise après connexion |
| **Effet Zeigarnik** | « Reprendre » met en avant les films commencés (progression visible) |
| **Récompense variable (éthique)** | Créneau « surprise » ~1 contenu sur 6 hors des habitudes ; jamais de pression ni de compte à rebours artificiel |
| **Effet de dotation** | « Ma liste » : le contenu mis de côté devient « à moi » |
| **Preuve sociale mesurée** | Nombre de J'aime discret ; pas de classement d'utilisateurs, pas d'abonnés visibles |
| **Seuil de gain** | Progression de visionnage, parcours d'un acteur (« 3 films vus sur 5 ») |
| **Pic-fin** | Soigner l'écran de fin de film (suggestion, remerciement, une seule action) |
| **Fluidité perçue** | Réponse < 100 ms (optimiste), transitions, son/haptique en retour ; skeleton seulement si nécessaire |
| **Familiarité** | Conventions mobiles connues (barre d'onglets, bottom sheet) |
| **Cadrage positif** | Messages d'erreur humains, jamais accusateurs |

## « Ne pas ressembler à un réseau social »
Pas de compteurs d'abonnés, pas de fil de commentaires dans le feed, pas de notifications anxiogènes, pas de like en rafale. Le feed est une **vitrine de découverte**, pas un lieu de performance sociale.

## Garde-fous éthiques (obligatoires)
- Pas de lecture automatique infinie : après ~3 contenus enchaînés, **pause douce** (« Continuer ? »).
- Pas de culpabilisation, pas de fausse urgence, pas de compteurs trompeurs.
- Désinscription, suppression de compte et refus des cookies **aussi simples** que l'inscription/l'acceptation.
- Pas de motifs sombres autour des publicités : étiquette « Sponsorisé » claire, fermeture accessible.
- Réglages de sons et d'animations toujours visibles.

## Un seul CTA : méthode
Pour chaque écran, écrire : *« L'action principale est … »*. Tout le reste = lien texte ou bouton fantôme. Exemples : Film → **Regarder** ; Fiche acteur → **Voir la filmographie** ; Actualité → **Lire la suite** / **Regarder le film** (un seul) ; 404 → **Revenir à l'accueil** ; Connexion → **Se connecter**.

## Mesure
Taux de lecture lancée, de lecture terminée, de reprise, de retour J+7 ; temps jusqu'au premier contenu ; abandon au login. Tester avec 5 utilisateurs réels (mobile) avant d'ajuster.

## Checklist
- [ ] Action principale écrite pour chaque écran
- [ ] Garde-fous éthiques respectés
- [ ] Parcours « agir → connexion → reprise » fluide
- [ ] Test utilisateur mobile réalisé
