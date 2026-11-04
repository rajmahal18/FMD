CREATE TABLE "InboxMessage" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "eventId" TEXT NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "recipientId" TEXT NOT NULL REFERENCES "EventMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "senderName" TEXT NOT NULL,
 "subject" TEXT NOT NULL,
 "body" TEXT NOT NULL,
 "response" TEXT CHECK ("response" IN ('YES','NO')),
 "respondedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "InboxMessage_eventId_recipientId_createdAt_idx" ON "InboxMessage"("eventId","recipientId","createdAt");
CREATE TABLE "InboxDelivery" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "messageId" TEXT NOT NULL REFERENCES "InboxMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "membershipId" TEXT NOT NULL REFERENCES "EventMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "kind" TEXT NOT NULL CHECK ("kind" IN ('OFFER','COPY','RESPONSE')),
 "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING','SENDING','ACCEPTED','FAILED','UNKNOWN','SKIPPED')),
 "attemptedAt" TIMESTAMP(3),
 "sentAt" TIMESTAMP(3)
);
CREATE UNIQUE INDEX "InboxDelivery_messageId_membershipId_kind_key" ON "InboxDelivery"("messageId","membershipId","kind");
