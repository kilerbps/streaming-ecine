# 03 — Modèle de données (Prisma 7 / PostgreSQL)

## 1. Règles

1. **Source de vérité unique** : chaque donnée vit dans une seule table. Les compteurs (likes, vues) sont **calculés** (`COUNT`) et mis en cache dans Redis ; on ne stocke un compteur persistant que si une mesure de performance le justifie (ADR obligatoire + job de recalcul).
2. **Suppression douce** (`deletedAt`) pour tout contenu éditorial ; suppression réelle pour les données personnelles sur demande (avec anonymisation des journaux).
3. Identifiants : `cuid2` ou UUID v7 ; **slugs uniques** pour toute page publique ; historique des slugs dans `Redirect`.
4. Horodatages `createdAt` / `updatedAt` partout. Tout en UTC.
5. Les secrets (mots de passe, jetons) sont **hachés** : Argon2id pour les mots de passe ; SHA-256 pour les jetons de rafraîchissement.
6. Texte multilingue : table `*Translation` (clé `locale`) pour les champs affichés (titre, résumé, bio…). Le français est obligatoire.

## 2. Configuration Prisma 7 (rappel)

```ts
// prisma.config.ts (à la racine de apps/api)
import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: process.env.DATABASE_URL! },
})
```

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}
datasource db {
  provider = "postgresql"
}
```

L'URL de connexion n'est **pas** dans `schema.prisma` en Prisma 7 ; les variables d'environnement ne sont **pas** chargées automatiquement ; le client utilise un adapter (`@prisma/adapter-pg`). Vérifier la doc v7 avant toute modification.

## 3. Schéma de référence (à affiner avec l'IA, sans changer les règles)

```prisma
enum Role        { SUPER_ADMIN ADMIN EDITOR MODERATOR CREATOR MEMBER }
enum PublishState{ DRAFT SCHEDULED PUBLISHED ARCHIVED }
enum FilmKind    { FEATURE SHORT DOCUMENTARY SERIES_EPISODE }
enum CreditRole  { ACTOR DIRECTOR PRODUCER WRITER CINEMATOGRAPHER EDITOR COMPOSER OTHER }
enum ArticleKind { NEWS ANNOUNCEMENT EVENT }
enum PostKind    { PHOTO_TEXT }
enum MediaKind   { IMAGE VIDEO_SOURCE SUBTITLE }
enum TranscodeState { PENDING PROCESSING READY FAILED }

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  emailVerified DateTime?
  passwordHash  String?
  displayName   String
  role          Role     @default(MEMBER)
  locale        String   @default("fr")
  disabledAt    DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?
  sessions      Session[]
  likes         Like[]
  bookmarks     Bookmark[]
  progress      WatchProgress[]
}

model Session {            // refresh token tournant
  id         String   @id @default(cuid())
  userId     String
  tokenHash  String   @unique
  family     String                       // détection de rejeu
  userAgent  String?
  ipHash     String?
  expiresAt  DateTime
  revokedAt  DateTime?
  createdAt  DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}

model Film {
  id          String   @id @default(cuid())
  slug        String   @unique
  kind        FilmKind
  state       PublishState @default(DRAFT)
  publishAt   DateTime?
  year        Int?
  runtimeSec  Int?
  originalTitle String?
  rightsNote  String                       // obligatoire : preuve d'autorisation
  rightsOk    Boolean  @default(false)     // publication impossible si false
  posterId    String?
  trailerUrl  String?
  ageRating   String?
  seoNoIndex  Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
  translations FilmTranslation[]
  credits     Credit[]
  categories  FilmCategory[]
  videos      VideoAsset[]
  poster      Media?   @relation("FilmPoster", fields: [posterId], references: [id])
  @@index([state, publishAt])
}

model FilmTranslation {
  filmId   String
  locale   String
  title    String
  synopsis String
  seoTitle String?
  seoDescription String?
  film     Film @relation(fields: [filmId], references: [id], onDelete: Cascade)
  @@id([filmId, locale])
}

model Person {
  id        String @id @default(cuid())
  slug      String @unique
  state     PublishState @default(DRAFT)
  photoId   String?
  birthYear Int?
  socials   Json?                         // { instagram, facebook, x, youtube… } validé par Zod
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?
  translations PersonTranslation[]
  credits   Credit[]
  photo     Media? @relation("PersonPhoto", fields: [photoId], references: [id])
}

model PersonTranslation {
  personId String
  locale   String
  name     String
  bio      String
  person   Person @relation(fields: [personId], references: [id], onDelete: Cascade)
  @@id([personId, locale])
}

model Credit {                           // la filmographie = ces lignes (pas de copie ailleurs)
  id        String @id @default(cuid())
  filmId    String
  personId  String
  role      CreditRole
  character String?
  position  Int @default(0)
  film      Film   @relation(fields: [filmId], references: [id], onDelete: Cascade)
  person    Person @relation(fields: [personId], references: [id], onDelete: Cascade)
  @@unique([filmId, personId, role, character])
  @@index([personId])
}

model Category {
  id String @id @default(cuid())
  slug String @unique
  translations CategoryTranslation[]
  films FilmCategory[]
}
model CategoryTranslation { categoryId String locale String name String
  category Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  @@id([categoryId, locale]) }
model FilmCategory { filmId String categoryId String
  film Film @relation(fields: [filmId], references: [id], onDelete: Cascade)
  category Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  @@id([filmId, categoryId]) }

model VideoAsset {
  id          String @id @default(cuid())
  filmId      String
  sourceMediaId String                    // fichier source privé
  state       TranscodeState @default(PENDING)
  durationSec Int?
  hlsBasePath String?                     // chemin interne, jamais exposé tel quel
  keyId       String?                     // référence de la clé AES (clé stockée chiffrée)
  error       String?
  film        Film @relation(fields: [filmId], references: [id], onDelete: Cascade)
}

model Media {                             // images et fichiers
  id        String @id @default(cuid())
  kind      MediaKind
  storageKey String                       // clé de stockage, pas une URL
  mime      String
  bytes     Int
  width     Int?
  height    Int?
  alt       String?                       // OBLIGATOIRE pour les images publiées (contrôle applicatif)
  createdAt DateTime @default(now())
  @@index([kind])
  FilmPoster Film[] @relation("FilmPoster")
  PersonPhoto Person[] @relation("PersonPhoto")
}

model Article {
  id String @id @default(cuid())
  slug String @unique
  kind ArticleKind
  state PublishState @default(DRAFT)
  publishAt DateTime?
  coverId String?
  authorId String
  eventStart DateTime?
  eventPlace String?
  featuredFilmId String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?
  translations ArticleTranslation[]
}
model ArticleTranslation { articleId String locale String title String excerpt String body String
  seoTitle String? seoDescription String?
  article Article @relation(fields: [articleId], references: [id], onDelete: Cascade)
  @@id([articleId, locale]) }

model Post {                              // publications du feed (photo + texte)
  id String @id @default(cuid())
  kind PostKind @default(PHOTO_TEXT)
  state PublishState @default(DRAFT)
  publishAt DateTime?
  authorId String
  caption String
  locale String @default("fr")
  pinnedUntil DateTime?                   // épinglage éditorial
  createdAt DateTime @default(now())
  deletedAt DateTime?
  images PostImage[]
}
model PostImage { postId String mediaId String position Int
  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  @@id([postId, mediaId]) }

model Like     { userId String targetType String targetId String createdAt DateTime @default(now())
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@id([userId, targetType, targetId]) @@index([targetType, targetId]) }
model Bookmark { userId String filmId String createdAt DateTime @default(now())
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@id([userId, filmId]) }
model WatchProgress { userId String filmId String positionSec Int updatedAt DateTime @updatedAt
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@id([userId, filmId]) }

model TeamMember { id String @id @default(cuid()) name String title String bio String? photoId String? position Int @default(0) visible Boolean @default(true) }
model StaticPage { id String @id @default(cuid()) slug String @unique state PublishState @default(DRAFT) version Int @default(1) updatedAt DateTime @updatedAt }
model StaticPageTranslation { pageId String locale String title String body String
  @@id([pageId, locale]) }
model SiteSettings { id Int @id @default(1) contactEmail String phone String? socials Json adsEnabled Boolean @default(false) }
model Redirect { id String @id @default(cuid()) fromPath String @unique toPath String status Int @default(301) }

model ContactMessage { id String @id @default(cuid()) name String email String subject String body String ipHash String? handledAt DateTime? createdAt DateTime @default(now()) }
model Report { id String @id @default(cuid()) targetType String targetId String reason String reporterId String? state String @default("OPEN") createdAt DateTime @default(now()) }
model ConsentRecord { id String @id @default(cuid()) anonId String userId String? version String categories Json createdAt DateTime @default(now()) }
model AuditLog { id String @id @default(cuid()) actorId String? action String entity String entityId String? meta Json? ipHash String? createdAt DateTime @default(now()) @@index([entity, entityId]) }

// Analytics minimaliste (sans identifiant persistant personnel)
model AnalyticsEvent { id BigInt @id @default(autoincrement()) type String path String? targetType String? targetId String? referrer String? device String? country String? createdAt DateTime @default(now()) @@index([type, createdAt]) }

// V2 : publicités (préparation, non migrées en V1 si tu préfères)
model AdCampaign { id String @id @default(cuid()) name String advertiser String startsAt DateTime endsAt DateTime state String @default("DRAFT") }
model AdCreative { id String @id @default(cuid()) campaignId String placement String mediaId String? clickUrl String label String @default("Sponsorisé") }
```

> Le schéma ci-dessus est **de référence** : écrit de façon compacte, il doit être mis en forme standard (`prisma format`), complété (relations inverses, `@@map`, index) et validé par `prisma validate`. Les relations polymorphes (`Like.targetType/targetId`) sont acceptables car limitées à `FILM`, `POST`, `ARTICLE` ; vérifier l'existence de la cible côté service.

## 4. Contraintes applicatives

- Un `Film` ne peut passer en `PUBLISHED` que si : traduction `fr` complète, affiche avec `alt`, `rightsOk = true`, au moins un `VideoAsset` `READY` (sauf bande-annonce seule).
- Une `Media` image publiée sans `alt` est refusée (sauf image décorative explicitement marquée).
- Changer un `slug` crée automatiquement une ligne `Redirect` (anciens liens jamais cassés).
- Les index de recherche : `pg_trgm` sur titres/noms ; colonne `tsvector` française générée.

## 5. Données personnelles (cartographie)

| Donnée | Table | Base légale | Durée de conservation |
|---|---|---|---|
| E-mail, nom affiché | `User` | Exécution du service | Jusqu'à suppression du compte |
| Mot de passe (haché) | `User` | Exécution du service | Idem |
| Session, IP hachée, agent | `Session` | Sécurité | Expiration + 30 j |
| Messages de contact | `ContactMessage` | Intérêt légitime / demande | 12 mois |
| Consentement cookies | `ConsentRecord` | Obligation de preuve | 13 mois |
| Événements de visite | `AnalyticsEvent` | Consentement ou mesure anonyme | 13 mois |

À réviser avec la page de confidentialité (voir `07`).
