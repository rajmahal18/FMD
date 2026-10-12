-- CreateEnum
CREATE TYPE "ContactMode" AS ENUM ('INTERACTION', 'COMMENDATION');

-- CreateEnum
CREATE TYPE "ContactVisibility" AS ENUM ('PRIVATE', 'SELF', 'PUBLIC');

-- CreateEnum
CREATE TYPE "ContactState" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateTable
CREATE TABLE "ContactPolicy" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "mode" "ContactMode" NOT NULL,
    "sameTeamAllowed" BOOLEAN NOT NULL,
    "outgoingLimit" INTEGER,
    "mutualConfirmation" BOOLEAN NOT NULL,
    "reciprocityAllowed" BOOLEAN NOT NULL,
    "visibility" "ContactVisibility" NOT NULL,
    "tieRule" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "opensAt" TIMESTAMP(3) NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactCredential" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "issuerMembershipId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactRecord" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "mode" "ContactMode" NOT NULL,
    "pairKey" TEXT NOT NULL,
    "requesterMembershipId" TEXT NOT NULL,
    "recipientMembershipId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "state" "ContactState" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContactPolicy_eventId_key" ON "ContactPolicy"("eventId");

-- CreateIndex
CREATE INDEX "ContactCredential_eventId_issuerMembershipId_expiresAt_idx" ON "ContactCredential"("eventId", "issuerMembershipId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContactCredential_eventId_tokenHash_key" ON "ContactCredential"("eventId", "tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "ContactCredential_eventId_codeHash_key" ON "ContactCredential"("eventId", "codeHash");

-- CreateIndex
CREATE UNIQUE INDEX "ContactCredential_eventId_id_issuerMembershipId_key" ON "ContactCredential"("eventId", "id", "issuerMembershipId");

-- CreateIndex
CREATE INDEX "ContactRecord_eventId_state_recipientMembershipId_idx" ON "ContactRecord"("eventId", "state", "recipientMembershipId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactRecord_eventId_pairKey_key" ON "ContactRecord"("eventId", "pairKey");

-- CreateIndex
CREATE UNIQUE INDEX "EventMembership_eventId_id_key" ON "EventMembership"("eventId", "id");

-- AddForeignKey
ALTER TABLE "ContactPolicy" ADD CONSTRAINT "ContactPolicy_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactCredential" ADD CONSTRAINT "ContactCredential_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactCredential" ADD CONSTRAINT "ContactCredential_eventId_issuerMembershipId_fkey" FOREIGN KEY ("eventId", "issuerMembershipId") REFERENCES "EventMembership"("eventId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactRecord" ADD CONSTRAINT "ContactRecord_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactRecord" ADD CONSTRAINT "ContactRecord_eventId_requesterMembershipId_fkey" FOREIGN KEY ("eventId", "requesterMembershipId") REFERENCES "EventMembership"("eventId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactRecord" ADD CONSTRAINT "ContactRecord_eventId_recipientMembershipId_fkey" FOREIGN KEY ("eventId", "recipientMembershipId") REFERENCES "EventMembership"("eventId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactRecord" ADD CONSTRAINT "ContactRecord_eventId_credentialId_recipientMembershipId_fkey" FOREIGN KEY ("eventId", "credentialId", "recipientMembershipId") REFERENCES "ContactCredential"("eventId", "id", "issuerMembershipId") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "ContactPolicy" ADD CONSTRAINT "ContactPolicy_choices" CHECK (("outgoingLimit" IS NULL OR "outgoingLimit" BETWEEN 1 AND 10000) AND "closesAt">"opensAt" AND "tieRule"='SHARED' AND ("mode"<>'INTERACTION' OR "reciprocityAllowed"));
ALTER TABLE "ContactRecord" ADD CONSTRAINT "ContactRecord_confirmation" CHECK ("requesterMembershipId"<>"recipientMembershipId" AND (("state"='ACCEPTED')=("acceptedAt" IS NOT NULL)));
