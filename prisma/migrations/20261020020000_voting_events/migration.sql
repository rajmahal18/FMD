CREATE TABLE "VotingEvent" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "eventId" TEXT NOT NULL,
 "name" TEXT NOT NULL,
 "instructions" TEXT NOT NULL DEFAULT '',
 "config" JSONB NOT NULL,
 "opensAt" TIMESTAMP(3) NOT NULL,
 "closesAt" TIMESTAMP(3) NOT NULL,
 "enabled" BOOLEAN NOT NULL DEFAULT false,
 "publishedAt" TIMESTAMP(3),
 "publishedResults" JSONB,
 "revision" INTEGER NOT NULL DEFAULT 1,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "VotingEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "VotingEvent_window_check" CHECK ("closesAt" > "opensAt")
);
CREATE UNIQUE INDEX "VotingEvent_eventId_id_key" ON "VotingEvent"("eventId","id");
CREATE INDEX "VotingEvent_eventId_createdAt_idx" ON "VotingEvent"("eventId","createdAt");
CREATE TABLE "VotingBallot" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "eventId" TEXT NOT NULL,
 "votingEventId" TEXT NOT NULL,
 "voterMembershipId" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "VotingBallot_votingEvent_fkey" FOREIGN KEY ("eventId","votingEventId") REFERENCES "VotingEvent"("eventId","id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "VotingBallot_voter_fkey" FOREIGN KEY ("eventId","voterMembershipId") REFERENCES "EventMembership"("eventId","id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "VotingBallot_votingEventId_voterMembershipId_key" ON "VotingBallot"("votingEventId","voterMembershipId");
CREATE UNIQUE INDEX "VotingBallot_eventId_id_key" ON "VotingBallot"("eventId","id");
CREATE TABLE "VotingChoice" (
 "eventId" TEXT NOT NULL,
 "ballotId" TEXT NOT NULL,
 "candidateMembershipId" TEXT NOT NULL,
 PRIMARY KEY ("ballotId","candidateMembershipId"),
 CONSTRAINT "VotingChoice_ballot_fkey" FOREIGN KEY ("eventId","ballotId") REFERENCES "VotingBallot"("eventId","id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "VotingChoice_candidate_fkey" FOREIGN KEY ("eventId","candidateMembershipId") REFERENCES "EventMembership"("eventId","id") ON DELETE RESTRICT ON UPDATE CASCADE
);
