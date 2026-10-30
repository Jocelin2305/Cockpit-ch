-- L'IA et l'enrichissement passent par les clés de la plateforme : plus de clé par entreprise.
ALTER TABLE "Organization" DROP COLUMN "aiProvider", DROP COLUMN "aiKeyEnc", DROP COLUMN "apolloKeyEnc";
