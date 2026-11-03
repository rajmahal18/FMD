CREATE UNIQUE INDEX "StationVisit_eventId_id_key" ON "StationVisit"("eventId", "id");
CREATE TABLE "StationVisitPlayer" (
 "eventId" TEXT NOT NULL,
 "visitId" TEXT NOT NULL,
 "membershipId" TEXT NOT NULL,
 CONSTRAINT "StationVisitPlayer_pkey" PRIMARY KEY ("visitId", "membershipId"),
 CONSTRAINT "StationVisitPlayer_eventId_visitId_fkey" FOREIGN KEY ("eventId", "visitId") REFERENCES "StationVisit"("eventId", "id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "StationVisitPlayer_eventId_membershipId_fkey" FOREIGN KEY ("eventId", "membershipId") REFERENCES "EventMembership"("eventId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "StationVisitPlayer_eventId_membershipId_idx" ON "StationVisitPlayer"("eventId", "membershipId");
