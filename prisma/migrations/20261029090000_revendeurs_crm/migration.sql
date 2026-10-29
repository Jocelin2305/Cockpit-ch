-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "crmProvider" TEXT,
ADD COLUMN     "crmTokenEnc" TEXT,
ADD COLUMN     "isPartner" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resellerId" TEXT;

-- AlterTable
ALTER TABLE "Prospect" ADD COLUMN     "crmId" TEXT,
ADD COLUMN     "crmSyncedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Reseller" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "offer" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "companyName" TEXT NOT NULL DEFAULT '',
    "siret" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "managerName" TEXT NOT NULL DEFAULT '',
    "managerEmail" TEXT NOT NULL DEFAULT '',
    "managerPhone" TEXT NOT NULL DEFAULT '',
    "ibanEnc" TEXT NOT NULL DEFAULT '',
    "ibanLast4" TEXT NOT NULL DEFAULT '',
    "bic" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reseller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResellerMessage" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "emailed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResellerMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResellerVideo" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResellerVideo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reseller_email_key" ON "Reseller"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Reseller_code_key" ON "Reseller"("code");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_resellerId_fkey" FOREIGN KEY ("resellerId") REFERENCES "Reseller"("id") ON DELETE SET NULL ON UPDATE CASCADE;

