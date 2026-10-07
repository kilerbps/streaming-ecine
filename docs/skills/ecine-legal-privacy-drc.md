---
name: ecine-legal-privacy-drc
description: Préparer la conformité d'E-Ciné (Code du numérique RDC, RGPD par prudence, cookies, CGU, mentions légales, droits d'auteur). À utiliser pour pages légales, bannière cookies, consentement, droits des personnes et rétention des données. Ne produit jamais de texte juridique définitif.
---

# Compétence : légal et vie privée (RDC + RGPD)

## Cadre (à revérifier à la date de rédaction)
- **RDC** : Ordonnance-loi n° 23/010 du 13 mars 2023 portant Code du numérique (protection des données personnelles, cybersécurité, services numériques). D'après les sources consultées le 02/10/2026, l'autorité de protection des données prévue n'était pas encore pleinement constituée et ses fonctions étaient provisoirement confiées à l'ARPTIC ; un réseau national de DPO a été lancé en mars 2026.
- **RGPD** : appliqué par prudence (diaspora, UE) et comme référentiel de bonnes pratiques.
- **Droit d'auteur** : droit congolais et conventions internationales — **référence exacte à confirmer par un juriste**.

## Règle d'or
L'IA **prépare la structure** (`[À COMPLÉTER — validation juridique]`) ; elle **n'invente aucune clause, adresse, numéro ou mention**. Un juriste local valide les textes finaux.

## Pages à produire
`/confidentialite` (RGPD / Code du numérique) · `/conditions-generales` (CGU) · `/mentions-legales` · `/cookies`. Plans détaillés : `docs/07` §C. Chaque page : version + date, liée dans le pied de page et la bannière.

## Bannière cookies
Refus **aussi simple** qu'acceptation (deux boutons de même poids + « Personnaliser »). Catégories : nécessaires (toujours) · mesure d'audience · publicité (V2). **Tout non essentiel refusé par défaut**, aucun script avant consentement. Choix mémorisé 6–12 mois, modifiable via un lien permanent. Preuve dans `ConsentRecord`.

## Droits des personnes (fonctionnalités à livrer)
Accès/export (`GET /me/export`) · rectification (`PATCH /me`) · effacement (`DELETE /me`) · opposition/retrait du consentement · contact dédié pour les demandes. Délai de réponse annoncé dans la politique.

## Minimisation et rétention
Cartographie `docs/03` §5. Tâches planifiées appliquant les durées (sessions +30 j, contacts 12 mois, consentements 13 mois, événements 13 mois). IP **hachées**. Logs sans PII. Sous-traitants listés (Vercel, hébergeur VPS, e-mail, Cloudflare, Sentry) avec pays d'hébergement.

## Droits sur les films
Champ `rightsNote` + `rightsOk` par film ; **publication impossible** sans `rightsOk`. Procédure de **retrait** (CGU) : formulaire de signalement, traitement rapide, journalisation. Contrats de cession/autorisation à conserver hors site.

## Incident de données
Procédure : contenir → évaluer → notifier les personnes et l'autorité compétente si requis (**obligations exactes à confirmer avec le juriste**) → documenter.

## Checklist
- [ ] 4 pages publiées avec version/date
- [ ] Bannière conforme, aucun traceur avant consentement
- [ ] Export / suppression du compte fonctionnels
- [ ] Rétention automatisée
- [ ] `rightsOk` bloque la publication
- [ ] Validation juridique obtenue (preuve)
