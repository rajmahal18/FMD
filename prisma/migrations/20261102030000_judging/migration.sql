CREATE TABLE "JudgingContest" (
 "id" TEXT NOT NULL PRIMARY KEY,"eventId" TEXT NOT NULL,"name" TEXT NOT NULL,"instructions" TEXT NOT NULL DEFAULT '',
 "config" JSONB NOT NULL,"state" TEXT NOT NULL DEFAULT 'DRAFT',"revision" INTEGER NOT NULL DEFAULT 1,
 "publishedResults" JSONB,"publishedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "JudgingContest_state_check" CHECK ("state" IN ('DRAFT','OPEN','CLOSED','PUBLISHED')),
 CONSTRAINT "JudgingContest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "JudgingContest_eventId_id_key" ON "JudgingContest"("eventId","id");
CREATE INDEX "JudgingContest_eventId_createdAt_idx" ON "JudgingContest"("eventId","createdAt");
CREATE TABLE "JudgingAssignment" (
 "eventId" TEXT NOT NULL,"contestId" TEXT NOT NULL,"membershipId" TEXT NOT NULL,"active" BOOLEAN NOT NULL DEFAULT true,
 PRIMARY KEY ("contestId","membershipId"),
 FOREIGN KEY ("eventId","contestId") REFERENCES "JudgingContest"("eventId","id") ON DELETE CASCADE ON UPDATE CASCADE,
 FOREIGN KEY ("eventId","membershipId") REFERENCES "EventMembership"("eventId","id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "JudgingAssignment_eventId_contestId_membershipId_key" ON "JudgingAssignment"("eventId","contestId","membershipId");
CREATE INDEX "JudgingAssignment_membershipId_active_idx" ON "JudgingAssignment"("membershipId","active");
CREATE TABLE "JudgingScore" (
 "id" TEXT NOT NULL PRIMARY KEY,"eventId" TEXT NOT NULL,"contestId" TEXT NOT NULL,"judgeMembershipId" TEXT NOT NULL,
 "candidateId" TEXT NOT NULL,"scores" JSONB NOT NULL,"totalHundredths" INTEGER NOT NULL CHECK ("totalHundredths">=0),
 "version" INTEGER NOT NULL DEFAULT 1,"submittedAt" TIMESTAMP(3),"updatedAt" TIMESTAMP(3) NOT NULL,
 FOREIGN KEY ("eventId","contestId") REFERENCES "JudgingContest"("eventId","id") ON DELETE RESTRICT ON UPDATE CASCADE,
 FOREIGN KEY ("eventId","contestId","judgeMembershipId") REFERENCES "JudgingAssignment"("eventId","contestId","membershipId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "JudgingScore_contestId_judgeMembershipId_candidateId_key" ON "JudgingScore"("contestId","judgeMembershipId","candidateId");
CREATE INDEX "JudgingScore_eventId_contestId_idx" ON "JudgingScore"("eventId","contestId");
