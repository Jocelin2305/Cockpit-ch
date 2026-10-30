-- Connexion du CRM par le compte du client (OAuth).
ALTER TABLE "Organization" ADD COLUMN "crmRefreshEnc" TEXT, ADD COLUMN "crmExpiresAt" TIMESTAMP(3), ADD COLUMN "crmApiDomain" TEXT;
