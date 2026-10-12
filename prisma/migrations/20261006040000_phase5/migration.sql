-- CreateEnum
CREATE TYPE "ScoreKind" AS ENUM ('STATION', 'BONUS', 'PENALTY');

-- AlterTable
ALTER TABLE "Station" ADD COLUMN     "allowAdjustments" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "arrivalCode" TEXT,
ADD COLUMN     "maximumAdjustment" INTEGER NOT NULL DEFAULT 1000;

-- AlterTable
ALTER TABLE "StationVisit" ADD COLUMN     "finishedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "StationOutcome" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "successful" BOOLEAN NOT NULL,
    "basePoints" INTEGER NOT NULL,
    "bonus" INTEGER NOT NULL DEFAULT 0,
    "penalty" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL DEFAULT '',
    "durationSeconds" INTEGER,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resultHash" TEXT NOT NULL,
    "confirmationJson" JSONB NOT NULL,

    CONSTRAINT "StationOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreLedgerEntry" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "outcomeId" TEXT NOT NULL,
    "kind" "ScoreKind" NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StationOutcome_visitId_key" ON "StationOutcome"("visitId");

-- CreateIndex
CREATE INDEX "StationOutcome_eventId_stationId_confirmedAt_idx" ON "StationOutcome"("eventId", "stationId", "confirmedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StationOutcome_eventId_visitId_teamId_stationId_key" ON "StationOutcome"("eventId", "visitId", "teamId", "stationId");

-- CreateIndex
CREATE UNIQUE INDEX "StationOutcome_teamId_stationId_key" ON "StationOutcome"("teamId", "stationId");

-- CreateIndex
CREATE UNIQUE INDEX "StationOutcome_eventId_id_teamId_stationId_key" ON "StationOutcome"("eventId", "id", "teamId", "stationId");

-- CreateIndex
CREATE INDEX "ScoreLedgerEntry_eventId_teamId_idx" ON "ScoreLedgerEntry"("eventId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreLedgerEntry_outcomeId_kind_key" ON "ScoreLedgerEntry"("outcomeId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "Station_eventId_arrivalCode_key" ON "Station"("eventId", "arrivalCode");

-- CreateIndex
CREATE UNIQUE INDEX "StationVisit_eventId_id_teamId_stationId_key" ON "StationVisit"("eventId", "id", "teamId", "stationId");

-- AddForeignKey
ALTER TABLE "StationOutcome" ADD CONSTRAINT "StationOutcome_eventId_visitId_teamId_stationId_fkey" FOREIGN KEY ("eventId", "visitId", "teamId", "stationId") REFERENCES "StationVisit"("eventId", "id", "teamId", "stationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationOutcome" ADD CONSTRAINT "StationOutcome_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreLedgerEntry" ADD CONSTRAINT "ScoreLedgerEntry_eventId_outcomeId_teamId_stationId_fkey" FOREIGN KEY ("eventId", "outcomeId", "teamId", "stationId") REFERENCES "StationOutcome"("eventId", "id", "teamId", "stationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Points remain bounded and ledger signs are explicit.
ALTER TABLE "Station" ADD CONSTRAINT "Station_arrival_and_adjustments" CHECK (("arrivalCode" IS NULL OR "arrivalCode" ~ '^[A-HJ-NP-Z2-9]{8}$') AND "maximumAdjustment" BETWEEN 0 AND 100000);
ALTER TABLE "StationOutcome" ADD CONSTRAINT "StationOutcome_bounded_points" CHECK ("basePoints" BETWEEN 0 AND 100000 AND "bonus" BETWEEN 0 AND 100000 AND "penalty" BETWEEN 0 AND 100000 AND ("successful" OR "basePoints"=0) AND (("bonus"=0 AND "penalty"=0) OR length(trim("reason"))>0) AND ("durationSeconds" IS NULL OR "durationSeconds">=0));
ALTER TABLE "ScoreLedgerEntry" ADD CONSTRAINT "ScoreLedgerEntry_sign" CHECK (("kind"='STATION' AND "amount" BETWEEN 0 AND 100000) OR ("kind"='BONUS' AND "amount" BETWEEN 1 AND 100000) OR ("kind"='PENALTY' AND "amount" BETWEEN -100000 AND -1));
