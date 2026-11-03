CREATE TABLE "SquadHandler" (
 "eventId" TEXT NOT NULL,
 "teamId" TEXT NOT NULL PRIMARY KEY,
 "membershipId" TEXT NOT NULL UNIQUE,
 UNIQUE ("eventId","teamId"),
 UNIQUE ("eventId","membershipId"),
 CONSTRAINT "SquadHandler_team_fkey" FOREIGN KEY ("eventId","teamId") REFERENCES "Team"("eventId","id") ON DELETE CASCADE,
 CONSTRAINT "SquadHandler_member_fkey" FOREIGN KEY ("eventId","membershipId") REFERENCES "EventMembership"("eventId","id") ON DELETE CASCADE
);
