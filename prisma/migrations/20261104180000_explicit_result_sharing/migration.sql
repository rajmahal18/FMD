CREATE TABLE "ResultSharing" (
 "eventId" TEXT NOT NULL,
 "key" TEXT NOT NULL,
 "sourceRevision" INTEGER NOT NULL,
 "revision" INTEGER NOT NULL DEFAULT 1,
 "facilitators" TEXT NOT NULL DEFAULT 'HIDDEN',
 "participants" TEXT NOT NULL DEFAULT 'HIDDEN',
 CONSTRAINT "ResultSharing_pkey" PRIMARY KEY ("eventId", "key"),
 CONSTRAINT "ResultSharing_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Keep already revealed snapshots visible. Future approvals require explicit sharing.
INSERT INTO "ResultSharing" ("eventId","key","sourceRevision","facilitators","participants")
 SELECT e.id,'race',MAX(r.revision),'PUBLISHED','PUBLISHED' FROM "Event" e JOIN "ResultRevision" r ON r."eventId"=e.id WHERE e.state='FINALIZED' GROUP BY e.id;
INSERT INTO "ResultSharing" ("eventId","key","sourceRevision","facilitators","participants")
 SELECT "eventId",'overall',revision,'PUBLISHED','PUBLISHED' FROM "OverallRanking" WHERE finalized IS NOT NULL AND finalized <> 'null'::jsonb;
INSERT INTO "ResultSharing" ("eventId","key","sourceRevision","facilitators","participants")
 SELECT "eventId",'voting:'||id,revision,'PUBLISHED','PUBLISHED' FROM "VotingEvent" WHERE "publishedAt" IS NOT NULL;
ALTER TABLE "JudgingContest" ALTER COLUMN "facilitatorVisibility" SET DEFAULT 'HIDDEN';
ALTER TABLE "JudgingContest" ALTER COLUMN "participantVisibility" SET DEFAULT 'HIDDEN';
