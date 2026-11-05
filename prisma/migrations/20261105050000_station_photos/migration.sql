ALTER TABLE "Station" ADD COLUMN "photoKey" TEXT;
CREATE TABLE "StationPhoto" (
 "stationId" TEXT NOT NULL,
 "key" TEXT NOT NULL,
 "content" BYTEA NOT NULL,
 CONSTRAINT "StationPhoto_pkey" PRIMARY KEY ("stationId")
);
CREATE UNIQUE INDEX "StationPhoto_key_key" ON "StationPhoto"("key");
ALTER TABLE "StationPhoto" ADD CONSTRAINT "StationPhoto_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
