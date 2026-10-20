ALTER TABLE "Station" ADD COLUMN "timePenaltyButtons" JSONB NOT NULL DEFAULT '[]', ADD COLUMN "timePenaltyRevision" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "StationOutcome" ADD COLUMN "timePenaltySeconds" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "TimePenaltyEntry" (
 "id" TEXT NOT NULL PRIMARY KEY, "eventId" TEXT NOT NULL, "teamId" TEXT NOT NULL,
 "stationId" TEXT NOT NULL, "visitId" TEXT NOT NULL, "actorId" TEXT NOT NULL,
 "buttonId" TEXT NOT NULL, "label" TEXT NOT NULL, "seconds" INTEGER NOT NULL CHECK ("seconds" BETWEEN 1 AND 3600),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "voidedAt" TIMESTAMP(3), "voidedById" TEXT, "voidReason" TEXT,
 CONSTRAINT "TimePenaltyEntry_visit_fkey" FOREIGN KEY ("eventId","visitId","teamId","stationId") REFERENCES "StationVisit"("eventId","id","teamId","stationId") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "TimePenaltyEntry_actor_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "TimePenaltyEntry_void_actor_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "TimePenaltyEntry_void_check" CHECK (("voidedAt" IS NULL AND "voidedById" IS NULL AND "voidReason" IS NULL) OR ("voidedAt" IS NOT NULL AND "voidedById" IS NOT NULL AND "voidReason" IS NOT NULL AND length("voidReason") > 0))
);
CREATE INDEX "TimePenaltyEntry_eventId_visitId_idx" ON "TimePenaltyEntry"("eventId","visitId");
