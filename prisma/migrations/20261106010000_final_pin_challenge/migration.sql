CREATE TABLE "FinalChallenge" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "eventId" TEXT NOT NULL,
 "runRevision" INTEGER NOT NULL,
 "ownerId" TEXT NOT NULL,
 "enabled" BOOLEAN NOT NULL DEFAULT false,
 "durationSeconds" INTEGER NOT NULL,
 "revision" INTEGER NOT NULL DEFAULT 1,
 "startedAt" TIMESTAMP(3),
 "deadlineAt" TIMESTAMP(3),
 "endedAt" TIMESTAMP(3),
 CONSTRAINT "FinalChallenge_duration_check" CHECK ("durationSeconds" BETWEEN 60 AND 7200),
 CONSTRAINT "FinalChallenge_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "FinalChallenge_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "FinalChallenge_eventId_runRevision_key" ON "FinalChallenge"("eventId","runRevision");
CREATE TABLE "FinalChallengeTeam" (
 "challengeId" TEXT NOT NULL,
 "teamId" TEXT NOT NULL,
 "pinHash" TEXT NOT NULL,
 "attempts" INTEGER NOT NULL DEFAULT 0,
 "lastAttemptAt" TIMESTAMP(3),
 "defusedAt" TIMESTAMP(3),
 "successful" BOOLEAN,
 PRIMARY KEY ("challengeId","teamId"),
 CONSTRAINT "FinalChallengeTeam_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "FinalChallenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "FinalChallengeTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
