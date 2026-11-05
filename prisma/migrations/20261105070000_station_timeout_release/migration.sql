ALTER TABLE "StationVisit" ADD COLUMN "timerDeadlineAt" TIMESTAMP(3),
 ADD COLUMN "timerSnapshotAt" TIMESTAMP(3),
 ADD COLUMN "releaseAt" TIMESTAMP(3);
CREATE INDEX "StationVisit_eventId_releaseAt_idx" ON "StationVisit"("eventId","releaseAt");
