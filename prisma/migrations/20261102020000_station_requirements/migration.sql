ALTER TABLE "Station"
 ADD COLUMN "brawn" INTEGER,
 ADD COLUMN "brain" INTEGER,
 ADD COLUMN "playersRequired" INTEGER,
 ADD CONSTRAINT "Station_brawn_range" CHECK ("brawn" BETWEEN 0 AND 5),
 ADD CONSTRAINT "Station_brain_range" CHECK ("brain" BETWEEN 0 AND 5),
 ADD CONSTRAINT "Station_playersRequired_range" CHECK ("playersRequired" BETWEEN 1 AND 1000);
