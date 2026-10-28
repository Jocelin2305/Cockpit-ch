-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "phoneProvider" TEXT;
ALTER TABLE "Organization" ADD COLUMN "phoneWebhookToken" TEXT;

-- CreateTable
CREATE TABLE "PhoneEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "prospectId" TEXT,
    "userId" TEXT,
    "voicemailUrl" TEXT NOT NULL DEFAULT '',
    "transcript" TEXT NOT NULL DEFAULT '',
    "at" DATETIME NOT NULL,
    "handled" BOOLEAN NOT NULL DEFAULT false
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Call" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "userId" TEXT,
    "day" TEXT NOT NULL,
    "issue" TEXT NOT NULL,
    "resume" TEXT NOT NULL DEFAULT '',
    "interet" TEXT NOT NULL DEFAULT '',
    "objections" JSONB,
    "next" TEXT NOT NULL DEFAULT '',
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "transcript" TEXT NOT NULL DEFAULT '',
    "externalId" TEXT,
    "recordingUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Call_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Call" ("createdAt", "day", "durationMs", "id", "interet", "issue", "next", "objections", "organizationId", "prospectId", "resume", "transcript", "userId") SELECT "createdAt", "day", "durationMs", "id", "interet", "issue", "next", "objections", "organizationId", "prospectId", "resume", "transcript", "userId" FROM "Call";
DROP TABLE "Call";
ALTER TABLE "new_Call" RENAME TO "Call";
CREATE INDEX "Call_organizationId_idx" ON "Call"("organizationId");
CREATE INDEX "Call_prospectId_idx" ON "Call"("prospectId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "PhoneEvent_organizationId_handled_idx" ON "PhoneEvent"("organizationId", "handled");

-- CreateIndex
CREATE UNIQUE INDEX "PhoneEvent_organizationId_externalId_key" ON "PhoneEvent"("organizationId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_phoneWebhookToken_key" ON "Organization"("phoneWebhookToken");

