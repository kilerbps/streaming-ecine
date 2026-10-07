---
name: ecine-ask-first
description: Protocole « demander avant d'agir » pour E-Ciné. À charger au début de toute session et avant toute décision d'architecture, de sécurité, de données, de dépendance, de design ou de contenu juridique/éditorial.
---

# Compétence : demander avant d'agir

## Objectif
Éviter les décisions solitaires de l'IA. Le propriétaire du produit décide ; l'IA propose, justifie et attend.

## Déclencheurs (stop → question)
- Exigence ambiguë, contradictoire ou manquante (consulter `docs/` d'abord)
- Nouvelle dépendance ou mise à jour majeure
- Migration de base non triviale / destructive
- Suppression de fichiers, données, branches
- Choix de sécurité (auth, jetons, CSP, stockage de clés)
- Choix visuel hors tokens (couleur, police, motif, illustration)
- Texte juridique ou éditorial (CGU, confidentialité, textes d'accueil, slogans)
- Tout ce qui touche la production, l'argent ou des comptes tiers

## Procédure
1. Chercher la réponse dans `docs/` (PRD, ADR, README Q1–Q12).
2. Si absente : formuler **≤ 3 questions** avec options + recommandation + défaut.
3. Continuer **uniquement** sur ce qui n'en dépend pas.
4. Après réponse : consigner la décision dans `docs/adr/NNNN-*.md` (contexte, décision, conséquences).

## Modèle de question
```
Question : …
Contexte : …
Options : A) … B) …
Recommandation : A, parce que …
Défaut si pas de réponse : A (noté dans l'ADR)
```

## Anti-patterns
- Poser des questions triviales ou déjà documentées.
- Tout bloquer pour un détail mineur (appliquer le défaut et noter l'hypothèse).
- Agir « pour gagner du temps » sur un point de la liste des déclencheurs.
- Présenter une hypothèse comme un fait.

## Checklist
- [ ] Réponse non trouvée dans `docs/`
- [ ] Questions ≤ 3, avec recommandation
- [ ] Défaut explicite
- [ ] ADR rédigé après décision
