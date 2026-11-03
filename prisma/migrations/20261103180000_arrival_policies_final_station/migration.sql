ALTER TABLE "Event" ADD COLUMN "arrivalPolicy" TEXT NOT NULL DEFAULT 'CAPTAIN_CONFIRM',
 ADD COLUMN "finalStationId" TEXT,
 ADD COLUMN "finalStartedAt" TIMESTAMP(3),
 ADD COLUMN "finalDeadlineAt" TIMESTAMP(3);
ALTER TABLE "Event" ADD CONSTRAINT "Event_arrivalPolicy_check" CHECK ("arrivalPolicy" IN ('CAPTAIN_CONFIRM','PRESELECT_APPROVAL','SCAN_APPROVAL_TIMED','ARRIVAL_LINEUP_APPROVAL'));
ALTER TABLE "Event" ADD CONSTRAINT "Event_finalCountdown_check" CHECK (("finalStartedAt" IS NULL AND "finalDeadlineAt" IS NULL) OR ("finalStartedAt" IS NOT NULL AND "finalDeadlineAt" > "finalStartedAt"));
ALTER TABLE "StationVisit" ADD COLUMN "arrivalAt" TIMESTAMP(3),
 ADD COLUMN "arrivalApprovedAt" TIMESTAMP(3),
 ADD COLUMN "lineupSubmittedAt" TIMESTAMP(3);
CREATE TABLE "StationLineup" (
 "eventId" TEXT NOT NULL,
 "teamId" TEXT NOT NULL,
 "stationId" TEXT NOT NULL,
 "playerIds" JSONB NOT NULL,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "StationLineup_pkey" PRIMARY KEY ("teamId","stationId"),
 CONSTRAINT "StationLineup_team_fkey" FOREIGN KEY ("eventId","teamId") REFERENCES "Team"("eventId","id") ON DELETE CASCADE,
 CONSTRAINT "StationLineup_station_fkey" FOREIGN KEY ("eventId","stationId") REFERENCES "Station"("eventId","id") ON DELETE CASCADE
);
ALTER TABLE "StationOutcome" ADD COLUMN "isFinal" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StationOutcome" DROP CONSTRAINT "StationOutcome_bounded_points";
ALTER TABLE "StationOutcome" ADD CONSTRAINT "StationOutcome_bounded_points" CHECK (
 "basePoints" BETWEEN 0 AND 100000 AND "bonus" BETWEEN 0 AND 100000 AND "penalty" BETWEEN 0 AND 100000
 AND ((NOT "isFinal" AND ("successful" OR "basePoints"=0)) OR ("isFinal" AND "basePoints"=CASE WHEN "successful" THEN 100 ELSE 50 END AND "bonus"=0 AND "penalty"=0))
 AND (("bonus"=0 AND "penalty"=0) OR length(trim("reason"))>0)
 AND ("durationSeconds" IS NULL OR "durationSeconds">=0)
);
