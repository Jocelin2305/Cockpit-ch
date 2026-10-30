-- Registre des crédits et nombre d'utilisateurs accordé par un distributeur à son client.
ALTER TABLE "Organization" ADD COLUMN "resellerSeats" INTEGER;

CREATE TABLE "CreditEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "resellerId" TEXT,
    "delta" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "reference" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreditEntry_reference_key" ON "CreditEntry"("reference");
CREATE INDEX "CreditEntry_organizationId_createdAt_idx" ON "CreditEntry"("organizationId", "createdAt");
CREATE INDEX "CreditEntry_resellerId_createdAt_idx" ON "CreditEntry"("resellerId", "createdAt");

-- Les entreprises existantes hors revendeur reçoivent les crédits de l'essai.
INSERT INTO "CreditEntry" ("id", "organizationId", "delta", "kind", "label", "reference")
SELECT 'mig_' || "id", "id", 50, 'essai', 'Crédits de l''essai gratuit', 'essai:' || "id"
FROM "Organization" WHERE "resellerId" IS NULL;
