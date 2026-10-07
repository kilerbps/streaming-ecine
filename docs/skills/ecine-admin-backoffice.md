---
name: ecine-admin-backoffice
description: Construire l'espace administrateur E-Ciné (gestion totale du site : films, personnes, actualités, feed, utilisateurs, statistiques, paramètres, modération, audit). À utiliser pour toute page ou endpoint d'administration.
---

# Compétence : espace administrateur

## Périmètre (gestion totale)
Films et courts-métrages (métadonnées, affiche, bande-annonce, crédits, catégories, SEO, **droits**, état, planification) · upload vidéo + suivi de transcodage · personnes · actualités/annonces/événements · publications du feed · équipe dirigeante · pages statiques · catégories · redirections · utilisateurs et rôles · signalements · statistiques · paramètres du site (contacts, réseaux, `adsEnabled`) · journal d'audit · publicités (V2).

## Accès et sécurité
- Hôte dédié recommandé (`admin.e-cine.*`) ; sinon `/admin` avec garde dans `proxy.ts` **et** autorisation réelle dans l'API.
- Rôles : `SUPER_ADMIN` > `ADMIN` > `EDITOR` > `MODERATOR`. Matrice écrite et testée.
- **2FA obligatoire** pour ADMIN/SUPER_ADMIN ; session admin plus courte ; `noindex`.
- Toute action écrit `AuditLog` (qui, quoi, quand, avant/après).
- **Suppression douce** + confirmation explicite (taper le titre pour confirmer les suppressions définitives) ; restauration possible.
- Création de rôle SUPER_ADMIN réservée aux SUPER_ADMIN.

## Expérience d'édition (non technique)
- Formulaires courts, validation en ligne (Zod), sauvegarde automatique des brouillons (état conservé), aperçu avant publication, **un seul CTA principal** (« Enregistrer » / « Publier » selon l'étape).
- Contrôles qualité à la publication : traduction `fr` complète, affiche avec `alt`, `rightsOk`, vidéo prête, titres SEO sans doublon → liste claire de ce qui manque.
- Planification de publication ; statuts visibles (brouillon, planifié, publié, archivé).
- Upload : progression, reprise, erreurs lisibles ; état du transcodage en direct.
- Création d'un `Redirect` automatique si le slug change.
- Interface sobre, même design system (tokens), responsive tablette/PC, sombre/clair.

## Statistiques
Visites, lectures lancées/terminées, top films/personnes/actualités, sources, appareils, pays, évolution 7/30/90 jours. Données **agrégées**, sans PII ; respect du consentement (mesure anonyme possible). Export CSV.

## Modération
File de signalements, actions (masquer, retirer, avertir), journal ; commentaires en prémodération (V2).

## Livrable documentation
Guide d'utilisation en français avec captures : publier un film, ajouter un acteur, publier une actualité/annonce, gérer le feed, gérer les utilisateurs, lire les statistiques, sauvegarde/restauration, que faire en cas de fuite d'un film.

## Interdits
Actions admin accessibles sans 2FA · suppression définitive sans confirmation · modification de rôle sans audit · secrets affichés dans l'interface · scripts tiers dans l'admin.

## Checklist
- [ ] Matrice des rôles testée
- [ ] Audit sur chaque action
- [ ] Contrôles de publication
- [ ] Brouillons sauvegardés automatiquement
- [ ] Guide d'utilisation livré
