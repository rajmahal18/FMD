ALTER TABLE "EventMembership" ADD COLUMN "squadRole" TEXT;
ALTER TABLE "EventMembership" ADD CONSTRAINT "EventMembership_squadRole_check"
CHECK ("squadRole" IS NULL OR "squadRole" IN (
 'Team Commander', 'Intel / Radio Officer', 'Recon Specialist', 'Technical Analyst', 'Support Specialist'
));
