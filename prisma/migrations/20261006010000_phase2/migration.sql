-- AlterTable
ALTER TABLE "User" ADD COLUMN     "canCreateEvents" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "accentColor" TEXT NOT NULL DEFAULT '#72D5E3',
ADD COLUMN     "briefing" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "codename" TEXT,
ADD COLUMN     "endsOn" DATE,
ADD COLUMN     "logoData" BYTEA,
ADD COLUMN     "logoMime" TEXT,
ADD COLUMN     "startsOn" DATE;

-- AlterTable
ALTER TABLE "EventMembership" ADD COLUMN     "isCaptain" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "AuditEntry" ADD COLUMN     "detailsJson" JSONB,
ADD COLUMN     "targetId" TEXT;

-- CreateTable
CREATE TABLE "ManagementReceipt" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "responseJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagementReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ManagementReceipt_actorId_requestKey_key" ON "ManagementReceipt"("actorId", "requestKey");

-- AddForeignKey
ALTER TABLE "ManagementReceipt" ADD CONSTRAINT "ManagementReceipt_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- At most one active captain per team; application also validates role/event ownership.
CREATE UNIQUE INDEX "EventMembership_one_active_captain_per_team" ON "EventMembership"("teamId") WHERE "isCaptain" = true AND "active" = true AND "teamId" IS NOT NULL;
