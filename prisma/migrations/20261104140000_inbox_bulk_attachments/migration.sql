ALTER TABLE "InboxMessage" ADD COLUMN "batchId" TEXT;
CREATE INDEX "InboxMessage_eventId_batchId_idx" ON "InboxMessage"("eventId","batchId");
CREATE TABLE "InboxAttachment" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "eventId" TEXT NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "uploaderId" TEXT NOT NULL,
 "uploadKey" TEXT NOT NULL,
 "name" TEXT NOT NULL,
 "mime" TEXT NOT NULL,
 "size" INTEGER NOT NULL CHECK ("size" > 0 AND "size" <= 3145728),
 "digest" TEXT NOT NULL,
 "content" BYTEA NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "InboxAttachment_eventId_uploaderId_uploadKey_key" ON "InboxAttachment"("eventId","uploaderId","uploadKey");
CREATE INDEX "InboxAttachment_eventId_createdAt_idx" ON "InboxAttachment"("eventId","createdAt");
CREATE TABLE "InboxMessageAttachment" (
 "messageId" TEXT NOT NULL REFERENCES "InboxMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "attachmentId" TEXT NOT NULL REFERENCES "InboxAttachment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 PRIMARY KEY ("messageId","attachmentId")
);
CREATE INDEX "InboxMessageAttachment_attachmentId_idx" ON "InboxMessageAttachment"("attachmentId");
