-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trackingCode" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "secretSalt" TEXT NOT NULL,
    "caseStatus" TEXT NOT NULL DEFAULT 'OPEN',
    "incidentCategory" TEXT,
    "incidentDescription" TEXT,
    "location" TEXT,
    "occurredAt" DATETIME,
    "riskLevel" TEXT,
    "submittedAt" DATETIME,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "legalHold" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CaseSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CaseSession_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CaseMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachments" JSONB,
    "clientReqId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CaseMessage_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CaseExtraction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CaseExtraction_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CaseAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CaseAttachment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CrisisEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CrisisEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Case_trackingCode_key" ON "Case"("trackingCode");

-- CreateIndex
CREATE INDEX "Case_caseStatus_createdAt_idx" ON "Case"("caseStatus", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CaseSession_tokenHash_key" ON "CaseSession"("tokenHash");

-- CreateIndex
CREATE INDEX "CaseSession_expiresAt_idx" ON "CaseSession"("expiresAt");

-- CreateIndex
CREATE INDEX "CaseMessage_caseId_createdAt_idx" ON "CaseMessage"("caseId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CaseMessage_caseId_clientReqId_key" ON "CaseMessage"("caseId", "clientReqId");

-- CreateIndex
CREATE UNIQUE INDEX "CaseExtraction_caseId_key" ON "CaseExtraction"("caseId");

-- CreateIndex
CREATE INDEX "CaseAttachment_caseId_createdAt_idx" ON "CaseAttachment"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "CrisisEvent_caseId_createdAt_idx" ON "CrisisEvent"("caseId", "createdAt");
