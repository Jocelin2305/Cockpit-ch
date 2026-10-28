-- AlterTable
ALTER TABLE "Prospect" ADD COLUMN "mailMessageId" TEXT;
ALTER TABLE "Prospect" ADD COLUMN "mailThreadId" TEXT;

-- CreateTable
CREATE TABLE "MailAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "lastSyncAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MailAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MailMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "subject" TEXT NOT NULL DEFAULT '',
    "snippet" TEXT NOT NULL DEFAULT '',
    "at" DATETIME NOT NULL,
    CONSTRAINT "MailMessage_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MailAccount_userId_key" ON "MailAccount"("userId");

-- CreateIndex
CREATE INDEX "MailMessage_organizationId_at_idx" ON "MailMessage"("organizationId", "at");

-- CreateIndex
CREATE INDEX "MailMessage_prospectId_idx" ON "MailMessage"("prospectId");

-- CreateIndex
CREATE UNIQUE INDEX "MailMessage_userId_providerId_key" ON "MailMessage"("userId", "providerId");
