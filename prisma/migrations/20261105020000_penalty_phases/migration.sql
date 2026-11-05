ALTER TABLE "TimePenaltyEntry" ADD COLUMN "phase" TEXT NOT NULL DEFAULT 'DURING';
ALTER TABLE "TimePenaltyEntry" ADD CONSTRAINT "TimePenaltyEntry_phase_check" CHECK ("phase" IN ('DURING', 'AFTER_LIMIT'));
