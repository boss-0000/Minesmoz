-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MINE_OWNER');

-- CreateEnum
CREATE TYPE "MineStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MineralType" AS ENUM ('RUBY', 'TOURMALINE', 'GARNET', 'AQUAMARINE', 'GOLD', 'GRAPHITE', 'HEAVY_SANDS', 'COAL', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('MINING_LICENSE', 'GEOLOGICAL_SURVEY', 'OWNERSHIP_PROOF', 'ENVIRONMENTAL_PERMIT', 'OTHER');

-- CreateEnum
CREATE TYPE "ModerationAction" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MINE_OWNER',
    "locale" TEXT NOT NULL DEFAULT 'pt',
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "country" TEXT NOT NULL DEFAULT 'MZ',
    "province" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "description" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mine" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mineralType" "MineralType" NOT NULL DEFAULT 'OTHER',
    "province" TEXT NOT NULL,
    "district" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "description" TEXT,
    "licenceReference" TEXT,
    "investmentMinUsd" INTEGER,
    "investmentMaxUsd" INTEGER,
    "status" "MineStatus" NOT NULL DEFAULT 'DRAFT',
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MineDocument" (
    "id" TEXT NOT NULL,
    "mineId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "documentType" "DocumentType" NOT NULL DEFAULT 'OTHER',
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MineDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationEvent" (
    "id" TEXT NOT NULL,
    "mineId" TEXT NOT NULL,
    "action" "ModerationAction" NOT NULL,
    "reason" TEXT,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Mine_publicId_key" ON "Mine"("publicId");

-- CreateIndex
CREATE INDEX "Mine_organizationId_idx" ON "Mine"("organizationId");

-- CreateIndex
CREATE INDEX "Mine_status_idx" ON "Mine"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MineDocument_storageKey_key" ON "MineDocument"("storageKey");

-- CreateIndex
CREATE INDEX "MineDocument_mineId_idx" ON "MineDocument"("mineId");

-- CreateIndex
CREATE INDEX "ModerationEvent_mineId_idx" ON "ModerationEvent"("mineId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mine" ADD CONSTRAINT "Mine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MineDocument" ADD CONSTRAINT "MineDocument_mineId_fkey" FOREIGN KEY ("mineId") REFERENCES "Mine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MineDocument" ADD CONSTRAINT "MineDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationEvent" ADD CONSTRAINT "ModerationEvent_mineId_fkey" FOREIGN KEY ("mineId") REFERENCES "Mine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationEvent" ADD CONSTRAINT "ModerationEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
