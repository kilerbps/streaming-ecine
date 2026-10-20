-- Aperçus promotionnels (ADR-0015) : début du passage choisi en administration et fichier généré.
-- Migration additive : deux colonnes nouvelles, vides par défaut.

-- AlterTable
ALTER TABLE "films" ADD COLUMN     "previewFile" TEXT,
ADD COLUMN     "previewStartSec" INTEGER;
