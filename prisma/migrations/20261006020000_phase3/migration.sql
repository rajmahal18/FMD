-- CreateEnum
CREATE TYPE "ScoringMode" AS ENUM ('FIXED', 'MANUAL');

-- CreateEnum
CREATE TYPE "RouteMode" AS ENUM ('FIXED', 'CIRCULAR', 'FREE');

-- AlterTable
ALTER TABLE "Station" ADD COLUMN     "available" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "codename" TEXT,
ADD COLUMN     "configured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "facilitatorInstructions" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "fixedPoints" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "maximumPoints" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "minimumPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "queueEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scoringMode" "ScoringMode" NOT NULL DEFAULT 'FIXED',
ADD COLUMN     "timeLimitMinutes" INTEGER;

-- CreateTable
CREATE TABLE "RoutePlan" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "RouteMode" NOT NULL,
    "stationIds" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "RoutePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamRouteAssignment" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "routeRevision" INTEGER NOT NULL,
    "startStationId" TEXT,
    "mode" "RouteMode" NOT NULL,
    "stationIds" JSONB NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamRouteAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoutePlan_eventId_name_key" ON "RoutePlan"("eventId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TeamRouteAssignment_teamId_key" ON "TeamRouteAssignment"("teamId");

-- AddForeignKey
ALTER TABLE "RoutePlan" ADD CONSTRAINT "RoutePlan_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamRouteAssignment" ADD CONSTRAINT "TeamRouteAssignment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamRouteAssignment" ADD CONSTRAINT "TeamRouteAssignment_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "RoutePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Defense in depth for station rules; API enforces the same bounds.
ALTER TABLE "Station" ADD CONSTRAINT "Station_valid_rules" CHECK (
 "fixedPoints" BETWEEN 0 AND 100000 AND "minimumPoints" BETWEEN 0 AND "maximumPoints"
 AND "maximumPoints" <= 100000 AND ("timeLimitMinutes" IS NULL OR "timeLimitMinutes" BETWEEN 1 AND 1440)
 AND ("capacity" IS NULL OR "capacity" BETWEEN 1 AND 1000)
 AND (NOT "queueEnabled" OR "capacity" IS NOT NULL)
);
ALTER TABLE "RoutePlan" ADD CONSTRAINT "RoutePlan_nonempty_stops" CHECK (jsonb_typeof("stationIds")='array' AND jsonb_array_length("stationIds")>0);
ALTER TABLE "TeamRouteAssignment" ADD CONSTRAINT "TeamRouteAssignment_nonempty_stops" CHECK (jsonb_typeof("stationIds")='array' AND jsonb_array_length("stationIds")>0);
