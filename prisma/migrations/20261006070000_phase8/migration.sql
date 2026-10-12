CREATE TABLE "ResultRevision" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "actorId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "teamStandingsJson" JSONB NOT NULL,
  "awardStandingsJson" JSONB,
  "summaryJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResultRevision_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ResultRevision_eventId_revision_key" ON "ResultRevision"("eventId", "revision");
CREATE INDEX "ResultRevision_eventId_createdAt_idx" ON "ResultRevision"("eventId", "createdAt");
ALTER TABLE "ResultRevision" ADD CONSTRAINT "ResultRevision_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResultRevision" ADD CONSTRAINT "ResultRevision_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
