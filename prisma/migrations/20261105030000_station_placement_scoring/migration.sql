CREATE TABLE "RaceFinalResult" (
 "eventId" TEXT NOT NULL,
 "teamId" TEXT NOT NULL,
 "successful" BOOLEAN NOT NULL,
 "version" INTEGER NOT NULL DEFAULT 1,
 "actorId" TEXT NOT NULL,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "RaceFinalResult_pkey" PRIMARY KEY ("eventId", "teamId"),
 CONSTRAINT "RaceFinalResult_version_check" CHECK ("version" > 0),
 CONSTRAINT "RaceFinalResult_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "RaceFinalResult_team_fkey" FOREIGN KEY ("eventId", "teamId") REFERENCES "Team"("eventId", "id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "RaceFinalResult_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RaceFinalResult_teamId_key" ON "RaceFinalResult"("teamId");
