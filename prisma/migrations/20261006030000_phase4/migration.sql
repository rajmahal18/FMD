-- CreateEnum
CREATE TYPE "VisitState" AS ENUM ('QUEUED', 'ARRIVED', 'ACTIVE', 'AWAITING_CONFIRMATION', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "StationVisit" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "state" "VisitState" NOT NULL,
    "queuedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StationVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StationVisit_stationId_state_queuedAt_idx" ON "StationVisit"("stationId", "state", "queuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StationVisit_teamId_stationId_key" ON "StationVisit"("teamId", "stationId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_eventId_id_key" ON "Team"("eventId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Station_eventId_id_key" ON "Station"("eventId", "id");

-- AddForeignKey
ALTER TABLE "StationVisit" ADD CONSTRAINT "StationVisit_eventId_teamId_fkey" FOREIGN KEY ("eventId", "teamId") REFERENCES "Team"("eventId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationVisit" ADD CONSTRAINT "StationVisit_eventId_stationId_fkey" FOREIGN KEY ("eventId", "stationId") REFERENCES "Station"("eventId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One in-flight physical challenge per team, including queue and approval wait.
CREATE UNIQUE INDEX "StationVisit_one_inflight_per_team" ON "StationVisit"("teamId") WHERE "state" IN ('QUEUED','ARRIVED','ACTIVE','AWAITING_CONFIRMATION');
ALTER TABLE "StationVisit" ADD CONSTRAINT "StationVisit_confirmed_completion" CHECK (("state"='COMPLETED')=("confirmedAt" IS NOT NULL));
ALTER TABLE "StationVisit" ADD CONSTRAINT "StationVisit_queue_timestamp" CHECK ("state"!='QUEUED' OR "queuedAt" IS NOT NULL);
