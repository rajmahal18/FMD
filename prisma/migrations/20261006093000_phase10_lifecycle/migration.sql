ALTER TABLE "Event" ADD COLUMN "archivedAt" TIMESTAMP(3), ADD COLUMN "archivedReason" TEXT;
CREATE INDEX "Event_archivedAt_idx" ON "Event"("archivedAt");
