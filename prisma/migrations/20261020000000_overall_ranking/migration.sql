CREATE TABLE "OverallRanking" (
 "eventId" TEXT NOT NULL PRIMARY KEY,
 "revision" INTEGER NOT NULL DEFAULT 1,
 "config" JSONB NOT NULL,
 "finalized" JSONB,
 CONSTRAINT "OverallRanking_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
