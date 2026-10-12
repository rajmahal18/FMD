-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ScoreKind" ADD VALUE 'REVERSAL';
ALTER TYPE "ScoreKind" ADD VALUE 'REPLACEMENT';

-- DropIndex
DROP INDEX "ScoreLedgerEntry_outcomeId_kind_key";

-- AlterTable
ALTER TABLE "ScoreLedgerEntry" ADD COLUMN     "correctionId" TEXT;

-- CreateTable
CREATE TABLE "ScoreCorrection" (
    "id" TEXT NOT NULL,
    "outcomeId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "beforePoints" INTEGER NOT NULL,
    "afterPoints" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMP(3),

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteChange" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "beforeJson" JSONB NOT NULL,
    "afterJson" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouteChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScoreCorrection_outcomeId_revision_key" ON "ScoreCorrection"("outcomeId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreCorrection_outcomeId_id_key" ON "ScoreCorrection"("outcomeId", "id");

-- CreateIndex
CREATE INDEX "Announcement_eventId_createdAt_idx" ON "Announcement"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "RouteChange_eventId_teamId_createdAt_idx" ON "RouteChange"("eventId", "teamId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreLedgerEntry_correctionId_kind_key" ON "ScoreLedgerEntry"("correctionId", "kind");

-- AddForeignKey
ALTER TABLE "ScoreLedgerEntry" ADD CONSTRAINT "ScoreLedgerEntry_outcomeId_correctionId_fkey" FOREIGN KEY ("outcomeId", "correctionId") REFERENCES "ScoreCorrection"("outcomeId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreCorrection" ADD CONSTRAINT "ScoreCorrection_outcomeId_fkey" FOREIGN KEY ("outcomeId") REFERENCES "StationOutcome"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreCorrection" ADD CONSTRAINT "ScoreCorrection_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteChange" ADD CONSTRAINT "RouteChange_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteChange" ADD CONSTRAINT "RouteChange_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


CREATE UNIQUE INDEX "ScoreLedgerEntry_original_kind" ON "ScoreLedgerEntry" ("outcomeId","kind") WHERE "correctionId" IS NULL;
ALTER TABLE "ScoreLedgerEntry" DROP CONSTRAINT "ScoreLedgerEntry_sign";
ALTER TABLE "ScoreLedgerEntry" ADD CONSTRAINT "ScoreLedgerEntry_sign" CHECK (("correctionId" IS NULL AND (("kind"='STATION' AND "amount" BETWEEN 0 AND 100000) OR ("kind"='BONUS' AND "amount" BETWEEN 1 AND 100000) OR ("kind"='PENALTY' AND "amount" BETWEEN -100000 AND -1))) OR ("correctionId" IS NOT NULL AND "kind"::text IN ('REVERSAL','REPLACEMENT') AND "amount" BETWEEN -200000 AND 200000));
ALTER TABLE "ScoreCorrection" ADD CONSTRAINT "ScoreCorrection_bounds" CHECK ("revision">0 AND "beforePoints" BETWEEN -100000 AND 200000 AND "afterPoints" BETWEEN -100000 AND 200000 AND length(trim("reason")) BETWEEN 5 AND 500);
ALTER TABLE "RouteChange" ADD CONSTRAINT "RouteChange_reason" CHECK (length(trim("reason")) BETWEEN 5 AND 500);
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_content" CHECK (length(trim("title")) BETWEEN 1 AND 120 AND length(trim("message")) BETWEEN 1 AND 1200);

ALTER TABLE "RouteChange" ADD CONSTRAINT "RouteChange_eventId_teamId_fkey" FOREIGN KEY ("eventId","teamId") REFERENCES "Team"("eventId","id") ON DELETE RESTRICT ON UPDATE CASCADE;
