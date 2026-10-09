-- AlterTable
ALTER TABLE "films" ADD COLUMN     "audioLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "availableUntil" TIMESTAMP(3),
ADD COLUMN     "creditsStartSec" INTEGER,
ADD COLUMN     "filmingLocation" TEXT,
ADD COLUMN     "releaseAt" TIMESTAMP(3),
ADD COLUMN     "subtitleLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "titleImageId" TEXT;

-- AlterTable
ALTER TABLE "film_translations" ADD COLUMN     "tagline" TEXT;

-- AlterTable
ALTER TABLE "media" ADD COLUMN     "blurDataUrl" TEXT,
ADD COLUMN     "crops" JSONB,
ADD COLUMN     "dominantColor" TEXT,
ADD COLUMN     "focalX" DOUBLE PRECISION,
ADD COLUMN     "focalY" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "featured_slots" (
    "id" TEXT NOT NULL,
    "filmId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "previewVideo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "featured_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_rows" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "home_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_row_translations" (
    "rowId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "home_row_translations_pkey" PRIMARY KEY ("rowId","locale")
);

-- CreateTable
CREATE TABLE "home_row_items" (
    "rowId" TEXT NOT NULL,
    "filmId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "home_row_items_pkey" PRIMARY KEY ("rowId","filmId")
);

-- CreateTable
CREATE TABLE "home_talents" (
    "personId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "home_talents_pkey" PRIMARY KEY ("personId")
);

-- CreateTable
CREATE TABLE "reminders" (
    "userId" TEXT NOT NULL,
    "filmId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("userId","filmId")
);

-- CreateTable
CREATE TABLE "user_tastes" (
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_tastes_pkey" PRIMARY KEY ("userId","categoryId")
);

-- CreateTable
CREATE TABLE "film_dismissals" (
    "userId" TEXT NOT NULL,
    "filmId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "film_dismissals_pkey" PRIMARY KEY ("userId","filmId")
);

-- CreateTable
CREATE TABLE "top_ten_entries" (
    "day" DATE NOT NULL,
    "rank" INTEGER NOT NULL,
    "filmId" TEXT NOT NULL,
    "viewers" INTEGER NOT NULL,

    CONSTRAINT "top_ten_entries_pkey" PRIMARY KEY ("day","rank")
);

-- CreateIndex
CREATE INDEX "featured_slots_startsAt_endsAt_idx" ON "featured_slots"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "home_rows_position_idx" ON "home_rows"("position");

-- CreateIndex
CREATE INDEX "home_row_items_rowId_position_idx" ON "home_row_items"("rowId", "position");

-- CreateIndex
CREATE INDEX "reminders_filmId_idx" ON "reminders"("filmId");

-- CreateIndex
CREATE INDEX "film_dismissals_userId_expiresAt_idx" ON "film_dismissals"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "top_ten_entries_day_filmId_key" ON "top_ten_entries"("day", "filmId");

-- AddForeignKey
ALTER TABLE "films" ADD CONSTRAINT "films_titleImageId_fkey" FOREIGN KEY ("titleImageId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "featured_slots" ADD CONSTRAINT "featured_slots_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "films"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_row_translations" ADD CONSTRAINT "home_row_translations_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "home_rows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_row_items" ADD CONSTRAINT "home_row_items_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "home_rows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_row_items" ADD CONSTRAINT "home_row_items_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "films"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_talents" ADD CONSTRAINT "home_talents_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "films"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tastes" ADD CONSTRAINT "user_tastes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tastes" ADD CONSTRAINT "user_tastes_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "film_dismissals" ADD CONSTRAINT "film_dismissals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "film_dismissals" ADD CONSTRAINT "film_dismissals_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "films"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "top_ten_entries" ADD CONSTRAINT "top_ten_entries_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "films"("id") ON DELETE CASCADE ON UPDATE CASCADE;

