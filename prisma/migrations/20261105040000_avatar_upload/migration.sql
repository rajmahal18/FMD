CREATE TABLE "UserAvatar" (
 "key" TEXT NOT NULL,
 "userId" TEXT NOT NULL,
 "content" BYTEA NOT NULL,
 CONSTRAINT "UserAvatar_pkey" PRIMARY KEY ("key")
);
CREATE UNIQUE INDEX "UserAvatar_userId_key" ON "UserAvatar"("userId");
ALTER TABLE "UserAvatar" ADD CONSTRAINT "UserAvatar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
