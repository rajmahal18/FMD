ALTER TABLE "Session" ADD COLUMN "parentSessionId" TEXT, ADD COLUMN "actingEventId" TEXT;
ALTER TABLE "Session" ADD CONSTRAINT "Session_parentSessionId_fkey" FOREIGN KEY ("parentSessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_account_switch_scope_check" CHECK (("parentSessionId" IS NULL AND "actingEventId" IS NULL) OR ("parentSessionId" IS NOT NULL AND "actingEventId" IS NOT NULL));
CREATE INDEX "Session_parentSessionId_idx" ON "Session"("parentSessionId");
