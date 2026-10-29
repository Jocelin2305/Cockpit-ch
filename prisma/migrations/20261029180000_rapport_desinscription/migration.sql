-- AlterTable
ALTER TABLE "User" ADD COLUMN     "autoSend" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardingHidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "weeklyReport" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "lastReportAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Prospect" ADD COLUMN     "optOutAt" TIMESTAMP(3),
ADD COLUMN     "rdvDay" TEXT,
ADD COLUMN     "wonDay" TEXT;

-- CreateTable
CREATE TABLE "OptOut" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptOut_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OptOut_organizationId_email_key" ON "OptOut"("organizationId", "email");

-- AddForeignKey
ALTER TABLE "OptOut" ADD CONSTRAINT "OptOut_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

