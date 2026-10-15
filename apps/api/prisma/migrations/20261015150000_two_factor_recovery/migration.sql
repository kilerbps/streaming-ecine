-- Codes de secours de la double authentification : empreintes HMAC, usage unique.
-- Migration additive : une colonne nouvelle, vide par défaut.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "twoFactorRecoveryHashes" TEXT[] DEFAULT ARRAY[]::TEXT[];

