-- Add fields to track customer registration source and creator
ALTER TABLE "User" ADD COLUMN "registrationSource" TEXT;
ALTER TABLE "User" ADD COLUMN "createdById" INTEGER;
ALTER TABLE "User" ADD CONSTRAINT "User_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Update existing customers based on their creation pattern
-- Self-registered customers: those with passwordHash (they set their own password)
UPDATE "User" 
SET "registrationSource" = 'SELF_REGISTERED' 
WHERE "role" = 'CUSTOMER' 
  AND "passwordHash" IS NOT NULL 
  AND "passwordHash" != '' 
  AND "registrationSource" IS NULL;

-- Call center or admin created customers: those without password (created by staff)
UPDATE "User" 
SET "registrationSource" = 'CALL_CENTER' 
WHERE "role" = 'CUSTOMER' 
  AND ("passwordHash" IS NULL OR "passwordHash" = '') 
  AND "registrationSource" IS NULL;

-- Set registration source for non-customer roles
UPDATE "User" 
SET "registrationSource" = 'ADMIN' 
WHERE "role" IN ('ADMIN', 'DISPATCHER', 'CALL_CENTER', 'TECH_FREELANCER', 'TECH_INTERNAL') 
  AND "registrationSource" IS NULL;
