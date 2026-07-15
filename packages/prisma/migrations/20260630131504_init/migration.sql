-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('OPEN', 'SUBMITTED', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "IncidentCategory" AS ENUM ('harassment', 'discrimination', 'fraud', 'safety', 'retaliation', 'data_breach', 'misconduct', 'other');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('user', 'assistant', 'system');

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "trackingCode" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "secretSalt" TEXT NOT NULL,
    "caseStatus" "CaseStatus" NOT NULL DEFAULT 'OPEN',
    "incidentCategory" "IncidentCategory",
    "incidentDescription" TEXT,
    "location" TEXT,
    "occurredAt" TIMESTAMP(3),
    "riskLevel" "RiskLevel",
    "submittedAt" TIMESTAMP(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "legalHold" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseSession" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseMessage" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "attachments" JSONB,
    "clientReqId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseExtraction" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseExtraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseAttachment" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrisisEvent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrisisEvent_pkey" PRIMARY KEY ("id")
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

-- AddForeignKey
ALTER TABLE "CaseSession" ADD CONSTRAINT "CaseSession_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseMessage" ADD CONSTRAINT "CaseMessage_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseExtraction" ADD CONSTRAINT "CaseExtraction_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseAttachment" ADD CONSTRAINT "CaseAttachment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrisisEvent" ADD CONSTRAINT "CrisisEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
