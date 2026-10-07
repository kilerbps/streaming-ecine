# ADR-0009 — Réponses par défaut aux questions ouvertes et hypothèses

- Statut : **appliqué par défaut — chaque ligne est à confirmer ou corriger par le propriétaire**
- Date : 2026-10-02

## Questions du README (Q1–Q12)

| # | Question | Défaut appliqué |
|---|---|---|
| Q1 | Logo et couleurs | Logo fourni (PNG) → palette dérivée, badge en aplat (ADR-0003). **Fournir le SVG officiel + logo INA.** |
| Q2 | Qui publie ? | L'équipe E-Ciné seule (rôles SUPER_ADMIN, ADMIN, EDITOR, MODERATOR) ; rôle `CREATOR` prévu dans le schéma, non utilisé en V1 |
| Q3 | Stockage vidéo / VPS | Stockage local du VPS (volume Docker), segments servis par l'API ; CDN après mesure (ADR-0006) |
| Q4 | Visionnage sans compte | Oui ; compte seulement pour agir (j'aime, liste, reprise synchronisée) |
| Q5 | Droits des films | `rightsNote` obligatoire + `rightsOk` qui bloque la publication |
| Q6 | Publicités | Aucune en V1 ; drapeau `adsEnabled` dans les paramètres, catégorie « Publicité » refusée par défaut |
| Q7 | Langues | Français seul ; i18n prête (`LOCALES`, `messages/fr.json`, tables `*Translation`, hreflang) |
| Q8 | Domaine | `e-cine.example` (placeholder) ; variable `CANONICAL_HOST` |
| Q9 | Connexion | E-mail + mot de passe (Google non implémenté) |
| Q10 | E-mails | Resend (pilote `resend`) ; pilote `log` en développement |
| Q11 | Statistiques | Événements internes agrégés, envoyés seulement avec consentement « mesure d'audience » |
| Q12 | Notifications push | Non (V2) |

## Hypothèses prises pendant la construction

1. **Sons** : synthétisés avec Web Audio (aucun fichier, aucune licence tierce). Le sprite audio du 05 §8 pourra remplacer ce service (`src/lib/sound.ts`) si un sound design est commandé.
2. **Service worker** : seules les ressources statiques versionnées et la page hors ligne sont mises en cache ; **aucune page HTML** (elles peuvent contenir des données personnelles). Conséquence : pas de navigation hors ligne dans les pages déjà vues.
3. **Administration sur `/admin`** du même projet Next.js (garde légère dans `proxy.ts`, autorisation réelle dans l'API) ; un hôte dédié `admin.e-cine.*` reste recommandé (02 §2).
4. **Équipe dirigeante** : aucune donnée inventée, la page « À propos » affiche « L'équipe sera présentée prochainement » tant que l'administration ne l'a pas saisie.
5. **Pages légales** : structure seulement, avec des zones `[À COMPLÉTER — validation juridique]` (docs/07 §C). **Un juriste doit rédiger et valider les textes.**
6. **Restauration** d'un contenu supprimé : il revient en brouillon et doit repasser les contrôles de publication.
7. **Droits retirés** : enregistrer un film publié avec `rightsOk=false` le repasse en brouillon (dépublication immédiate, auditée).
8. **Affiches** : texte alternatif non vide obligatoire, jamais « décoratives ».
9. **Redirections automatiques** à chaque changement de slug (films, personnes, actualités, catégories, pages), sans chaîne ni boucle.
10. **Rôles** : un administrateur ne peut agir que sur des comptes de rang inférieur et attribuer des rôles inférieurs au sien ; personne ne modifie son propre rôle ; seul un SUPER_ADMIN nomme un SUPER_ADMIN. Rétrograder ou désactiver un compte révoque ses sessions.
11. **Statistiques** par jour calendaire UTC ; export CSV avec en-têtes français et protection contre l'injection de formules.
12. **Planification** : publication automatique vérifiée chaque minute par l'API (auditée sans auteur, `*.auto_publish`).
13. **Données de démonstration** fictives (`pnpm db:seed`), jamais en production. Les films de démonstration sont publiés sans vidéo ; `db:seed:video <slug>` en génère une (mire de test).

## Manques connus de l'API (à planifier)

1. Pas de point d'accès de comptage pour le tableau de bord (les compteurs s'affichent « 50+ » au-delà de 50).
2. Les signalements ne portent que le type et l'identifiant de la cible (pas de titre ni de slug).
3. Pas d'annulation d'envoi vidéo ni de suppression d'image : les fichiers `.part` abandonnés et les images inutilisées s'accumulent (prévoir une tâche de nettoyage).
4. `AdminPost` n'expose pas `updatedAt`.
5. `privateRequest` ne lit que du JSON : l'export CSV de l'administration relaie lui-même cookies et IP.
6. Pas de filtre « non traités » pour les messages de contact.
7. `Media.bytes` en entier 32 bits (sources > 2 Gio) : migration BigInt proposée (ADR-0006).

## Données de test laissées dans la base de développement

Films « Essai back-office … » et « Essai de recette » (corbeille), un talent, un événement et une publication de test (corbeille), quelques comptes `e2e-…@example.cd` et `role.test…@example.cd`, images de test orphelines, un envoi partiel dans `storage/uploads/`. Aucune donnée réelle. Pour repartir de zéro : `docker compose -f infra/docker-compose.dev.yml down -v` (supprime le volume), puis migration et seed.
