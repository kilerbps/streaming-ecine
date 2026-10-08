-- Mesure de la refonte (lot 0) : provenance, valeur numérique et session de navigation. Ajout de colonnes facultatives, sans perte.
-- AlterTable
ALTER TABLE "analytics_events" ADD COLUMN     "session" TEXT,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "value" INTEGER;
