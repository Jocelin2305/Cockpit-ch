-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "resellerBilling" TEXT,
ADD COLUMN     "resellerPrice" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Reseller" ADD COLUMN     "billing" TEXT NOT NULL DEFAULT 'mensuel',
ADD COLUMN     "brandColor" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "brandColor2" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "brandFont" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "brandLogo" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "brandName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "offerChosenAt" TIMESTAMP(3),
ADD COLUMN     "offerStatus" TEXT NOT NULL DEFAULT 'en_attente',
ADD COLUMN     "upsellPriority" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "upsellWhiteLabel" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whiteLabel" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whiteLabelInstallments" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "resellerId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'standard',
    "status" TEXT NOT NULL DEFAULT 'ouvert',
    "answer" TEXT NOT NULL DEFAULT '',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureRequest" (
    "id" TEXT NOT NULL,
    "resellerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'reçue',
    "answer" TEXT NOT NULL DEFAULT '',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportTicket_status_dueAt_idx" ON "SupportTicket"("status", "dueAt");

-- CreateIndex
CREATE INDEX "FeatureRequest_resellerId_createdAt_idx" ON "FeatureRequest"("resellerId", "createdAt");

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_resellerId_fkey" FOREIGN KEY ("resellerId") REFERENCES "Reseller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureRequest" ADD CONSTRAINT "FeatureRequest_resellerId_fkey" FOREIGN KEY ("resellerId") REFERENCES "Reseller"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Anciennes formules : Zéro risque -> A, Onboarding complet -> B.
UPDATE "Reseller" SET "offer" = 'A' WHERE "offer" = 'zero_risque';
UPDATE "Reseller" SET "offer" = 'B' WHERE "offer" = 'onboarding';
