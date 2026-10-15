# ADR-0014 — Top 10, personnalisation et notifications des rappels

- Statut : **décidé par le propriétaire le 15 octobre 2026** (options recommandées retenues pour les trois points laissés ouverts par l'ADR-0012, et `qrcode` 1.5.4 pour le QR code de la double authentification).
- Date : 2026-10-15
- Complète l'ADR-0012 (« Points à trancher plus tard », 1 à 3).

## Décisions

| Sujet | Décision |
| --- | --- |
| Source du Top 10 | Lectures réellement lancées, comptées par l'API à l'ouverture d'une session de lecture, pour tous les visiteurs. Aucun identifiant conservé : une empreinte HMAC propre au jour |
| Personnalisation des visiteurs | Nouvelle catégorie « Personnalisation » dans la bannière cookies, désactivée par défaut. Les membres utilisent les données de leur compte |
| Rappels « Me le rappeler » | Notifications Web Push en plus de l'e-mail, après une demande de permission expliquée |
| QR code de la double authentification | Dépendance `qrcode` 1.5.4 (MIT), rendu SVG côté serveur |

## Top 10

- À chaque session de lecture (hors aperçu automatique), l'API enregistre une ligne `(jour, film, empreinte)` :
  - le jour est celui de Kinshasa ;
  - l'empreinte vaut `HMAC(IP_HASH_SALT, "top10:{jour}:{spectateur}")`, avec pour spectateur l'identifiant du membre, ou l'adresse IP et l'agent du visiteur ;
  - une même personne compte une fois par jour et par film ;
  - l'empreinte change chaque jour : impossible de suivre quelqu'un d'un jour à l'autre.
- Chaque jour, le planificateur range les films par nombre de spectateurs du jour, cumulés sur 7 jours glissants. Il écrit `top_ten_entries` et efface les empreintes de plus de 8 jours.
- Comme l'empreinte change chaque jour, une personne qui regarde le même film deux jours différents compte deux fois : c'est le prix de l'absence d'identifiant durable.
- La rangée s'affiche dès 10 titres classés (règle de la spécification).
- Les aperçus automatiques ouvrent une session marquée `pv` dans le jeton : rendus de 240p au plus, jamais comptés.

## Personnalisation

- La version du consentement passe au 2026-10-15 : la bannière est de nouveau proposée à tous.
- Avec la catégorie acceptée, trois cookies `httpOnly` sont gardés 180 jours sur l'appareil :

  | Cookie | Contenu |
  | --- | --- |
  | `ecine_hist` | 20 derniers films regardés au-delà de 10 minutes |
  | `ecine_dismiss` | « Pas pour moi », 40 titres au plus, 90 jours chacun |
  | `ecine_tastes` | Goûts (catégories) |

- Refuser la catégorie efface ces trois cookies.
- `POST /v1/home/personal` calcule « Parce que vous avez regardé {titre} », l'ordre des catégories par affinité et les titres à masquer. Pour un membre, ce calcul utilise son compte ; il n'est jamais mis en cache.
- **À faire par le propriétaire** : compléter la page Cookies (texte juridique) avec ces trois cookies.

## Web Push

- Table `push_subscriptions` (abonnement d'un membre, supprimé avec son compte).
- Clés VAPID dans l'environnement de l'API. La clé privée ne quitte jamais le serveur.
- Le planificateur envoie le rappel par e-mail et sur chaque appareil abonné. Les abonnements expirés (404 ou 410) sont supprimés.

## Migration

`apps/api/prisma/migrations/20261015120000_top10_push/migration.sql`. Additive : deux tables nouvelles, aucune donnée existante modifiée.

```sql
CREATE TABLE "playback_views" (
    "day" DATE NOT NULL,
    "filmId" TEXT NOT NULL,
    "viewerHash" CHAR(64) NOT NULL,
    CONSTRAINT "playback_views_pkey" PRIMARY KEY ("day","filmId","viewerHash")
);
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "playback_views_day_idx" ON "playback_views"("day");
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");
ALTER TABLE "playback_views" ADD CONSTRAINT "playback_views_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "films"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

Réversible : supprimer les deux tables.

## Double authentification : codes de secours (ajout du 2026-10-15)

Lot 3, Réglages : 10 codes de secours `abcd-efgh` sont donnés à l'activation de la double authentification et montrés une seule fois. Ils servent quand le téléphone est perdu.

- Seules les empreintes sont gardées : `HMAC(MEDIA_KEY_SECRET, "2fa-recovery:{userId}:{code normalisé}")`, propres à chaque compte.
- Usage unique, sans course possible : un seul `UPDATE … array_remove(…) WHERE … = ANY(…)` retire le code. Le code n'est accepté que si une ligne est modifiée. Chaque usage est journalisé (`auth.2fa_recovery_used`).
- Le renouvellement et la désactivation demandent le mot de passe et un code. La désactivation efface les codes.

Migration `apps/api/prisma/migrations/20261015150000_two_factor_recovery/migration.sql`, additive : une colonne nouvelle, vide par défaut.

```sql
ALTER TABLE "users" ADD COLUMN     "twoFactorRecoveryHashes" TEXT[] DEFAULT ARRAY[]::TEXT[];
```

Réversible : supprimer la colonne. Les comptes déjà protégés gardent leur application d'authentification et peuvent créer des codes depuis Réglages.
