-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "apolloKeyEnc" TEXT;

-- AlterTable
ALTER TABLE "Search" ADD COLUMN     "sourcedAt" TIMESTAMP(3),
ADD COLUMN     "sourcedPage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "srcCaMax" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "srcCaMin" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "srcDeps" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "srcEffectifs" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "srcKeyword" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "srcNaf" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "srcRegion" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "srcSection" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Prospect" ADD COLUMN     "apolloId" TEXT,
ADD COLUMN     "enrichedAt" TIMESTAMP(3),
ADD COLUMN     "siren" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "Prospect_organizationId_siren_key" ON "Prospect"("organizationId", "siren");

