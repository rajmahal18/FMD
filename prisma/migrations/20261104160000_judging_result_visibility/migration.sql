ALTER TABLE "JudgingContest"
 ADD COLUMN "facilitatorVisibility" TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK ("facilitatorVisibility" IN ('HIDDEN','PUBLISHED','LIVE')),
 ADD COLUMN "participantVisibility" TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK ("participantVisibility" IN ('HIDDEN','PUBLISHED','LIVE')),
 ADD COLUMN "visibilityRevision" INTEGER NOT NULL DEFAULT 1;
