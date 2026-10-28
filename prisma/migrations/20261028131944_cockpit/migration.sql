-- CreateTable
CREATE TABLE "Search" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "geo" TEXT NOT NULL DEFAULT '',
    "secteur" TEXT NOT NULL DEFAULT '',
    "ca" TEXT NOT NULL DEFAULT '',
    "salaries" TEXT NOT NULL DEFAULT '',
    "motifs" TEXT NOT NULL DEFAULT '',
    "activite" TEXT NOT NULL DEFAULT '',
    "prix" TEXT NOT NULL DEFAULT '',
    "diff" TEXT NOT NULL DEFAULT '',
    "fonctions" TEXT NOT NULL DEFAULT '',
    "volume" TEXT NOT NULL DEFAULT '',
    "ton" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "templateId" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Search_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Search_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "SequenceTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SequenceTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "delays" JSONB NOT NULL,
    "steps" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SequenceTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "searchId" TEXT,
    "ownerId" TEXT,
    "company" TEXT NOT NULL,
    "sector" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "size" TEXT NOT NULL DEFAULT '',
    "contactName" TEXT NOT NULL DEFAULT '',
    "contactRole" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "linkedin" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "clientele" TEXT NOT NULL DEFAULT '',
    "standing" TEXT NOT NULL DEFAULT '',
    "offreExistante" TEXT NOT NULL DEFAULT '',
    "actualite" TEXT NOT NULL DEFAULT '',
    "qualification" TEXT NOT NULL DEFAULT '',
    "canal" TEXT NOT NULL DEFAULT '',
    "problematiques" TEXT NOT NULL DEFAULT '',
    "signals" TEXT NOT NULL DEFAULT '',
    "angle" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "priority" TEXT NOT NULL DEFAULT 'B',
    "status" TEXT NOT NULL DEFAULT 'À contacter',
    "relances" INTEGER NOT NULL DEFAULT 0,
    "firstContact" TEXT,
    "lastContact" TEXT,
    "nextFollowUp" TEXT,
    "callBack" TEXT,
    "lastCallAt" TEXT,
    "qualif" JSONB,
    "sequence" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Prospect_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Prospect_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "Search" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Prospect_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Call" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Call_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "signature" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" DATETIME
);
INSERT INTO "new_User" ("createdAt", "email", "id", "isSuperAdmin", "lastLoginAt", "name", "passwordHash") SELECT "createdAt", "email", "id", "isSuperAdmin", "lastLoginAt", "name", "passwordHash" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Search_organizationId_idx" ON "Search"("organizationId");

-- CreateIndex
CREATE INDEX "SequenceTemplate_organizationId_idx" ON "SequenceTemplate"("organizationId");

-- CreateIndex
CREATE INDEX "Prospect_organizationId_status_idx" ON "Prospect"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Prospect_organizationId_searchId_idx" ON "Prospect"("organizationId", "searchId");

-- CreateIndex
CREATE INDEX "Call_organizationId_idx" ON "Call"("organizationId");

-- CreateIndex
CREATE INDEX "Call_prospectId_idx" ON "Call"("prospectId");
