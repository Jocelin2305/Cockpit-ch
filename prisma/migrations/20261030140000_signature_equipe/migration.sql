-- Signature proposée à l'équipe ; le rapport hebdomadaire devient systématique pour les gestionnaires.
ALTER TABLE "Organization" ADD COLUMN "defaultSignature" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" DROP COLUMN "weeklyReport";
