-- ADR-0014 : lectures du jour pour le Top 10 (empreinte HMAC propre au jour) et abonnements Web Push.
-- Migration additive : deux tables nouvelles, aucune donnée existante modifiée.

-- CreateTable
CREATE TABLE "playback_views" (
    "day" DATE NOT NULL,
    "filmId" TEXT NOT NULL,
    "viewerHash" CHAR(64) NOT NULL,

    CONSTRAINT "playback_views_pkey" PRIMARY KEY ("day","filmId","viewerHash")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "playback_views_day_idx" ON "playback_views"("day");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");

-- AddForeignKey
ALTER TABLE "playback_views" ADD CONSTRAINT "playback_views_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "films"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

