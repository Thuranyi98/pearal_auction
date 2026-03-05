-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'MMK');

-- CreateEnum
CREATE TYPE "TenderStatus" AS ENUM ('PREP', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "BidState" AS ENUM ('DRAFT', 'SUBMITTED', 'INVALID');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OPERATOR');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "Tender" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(191) NOT NULL,
    "date" TIMESTAMP(3),
    "currency" "Currency" NOT NULL,
    "status" "TenderStatus" NOT NULL DEFAULT 'PREP',
    "memo" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tender_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lot" (
    "id" SERIAL NOT NULL,
    "tenderId" INTEGER NOT NULL,
    "lotNo" INTEGER NOT NULL,
    "shape" VARCHAR(64) NOT NULL DEFAULT '',
    "color" VARCHAR(64) NOT NULL DEFAULT '',
    "lustre" VARCHAR(64) NOT NULL DEFAULT '',
    "surface" VARCHAR(64) NOT NULL DEFAULT '',
    "size" VARCHAR(64) NOT NULL DEFAULT '',
    "description" TEXT,
    "startPrice" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bidder" (
    "id" SERIAL NOT NULL,
    "bidderNo" VARCHAR(32) NOT NULL,
    "name" VARCHAR(191) NOT NULL,
    "email" VARCHAR(191),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bidder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenderBidder" (
    "id" SERIAL NOT NULL,
    "tenderId" INTEGER NOT NULL,
    "bidderId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenderBidder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" SERIAL NOT NULL,
    "tenderId" INTEGER NOT NULL,
    "lotId" INTEGER NOT NULL,
    "bidderId" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "state" "BidState" NOT NULL DEFAULT 'DRAFT',
    "warningBelowStart" BOOLEAN NOT NULL DEFAULT false,
    "note" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "loginId" VARCHAR(80) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OPERATOR',
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "username" VARCHAR(120),
    "action" VARCHAR(100) NOT NULL,
    "detail" TEXT NOT NULL,
    "tenderId" INTEGER,
    "lotId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tender_code_key" ON "Tender"("code");

-- CreateIndex
CREATE INDEX "Tender_status_currency_date_idx" ON "Tender"("status", "currency", "date");

-- CreateIndex
CREATE INDEX "Lot_tenderId_lotNo_idx" ON "Lot"("tenderId", "lotNo");

-- CreateIndex
CREATE UNIQUE INDEX "Lot_tenderId_lotNo_key" ON "Lot"("tenderId", "lotNo");

-- CreateIndex
CREATE INDEX "Bidder_bidderNo_idx" ON "Bidder"("bidderNo");

-- CreateIndex
CREATE UNIQUE INDEX "Bidder_bidderNo_name_key" ON "Bidder"("bidderNo", "name");

-- CreateIndex
CREATE INDEX "TenderBidder_tenderId_idx" ON "TenderBidder"("tenderId");

-- CreateIndex
CREATE UNIQUE INDEX "TenderBidder_tenderId_bidderId_key" ON "TenderBidder"("tenderId", "bidderId");

-- CreateIndex
CREATE INDEX "Bid_lotId_state_amount_idx" ON "Bid"("lotId", "state", "amount");

-- CreateIndex
CREATE INDEX "Bid_bidderId_tenderId_idx" ON "Bid"("bidderId", "tenderId");

-- CreateIndex
CREATE UNIQUE INDEX "Bid_tenderId_lotId_bidderId_key" ON "Bid"("tenderId", "lotId", "bidderId");

-- CreateIndex
CREATE UNIQUE INDEX "User_loginId_key" ON "User"("loginId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenderBidder" ADD CONSTRAINT "TenderBidder_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenderBidder" ADD CONSTRAINT "TenderBidder_bidderId_fkey" FOREIGN KEY ("bidderId") REFERENCES "Bidder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_bidderId_fkey" FOREIGN KEY ("bidderId") REFERENCES "Bidder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE SET NULL ON UPDATE CASCADE;

