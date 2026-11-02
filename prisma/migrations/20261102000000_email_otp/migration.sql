CREATE TABLE "EmailOtp" (
 "id" TEXT PRIMARY KEY,
 "email" TEXT NOT NULL,
 "codeHash" TEXT NOT NULL,
 "playerCode" TEXT,
 "returnTo" TEXT NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "attempts" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX "EmailOtp_expiresAt_idx" ON "EmailOtp"("expiresAt");
