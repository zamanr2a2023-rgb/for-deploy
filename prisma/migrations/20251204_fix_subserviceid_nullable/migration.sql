-- AlterTable ServiceRequest: Make subserviceId nullable and serviceId required
-- This completes the service hierarchy fix

-- Step 1: Update existing NULL serviceId values with corresponding subserviceId values
-- (Map old subservices to new services based on the restructure)
UPDATE "ServiceRequest" 
SET "serviceId" = "subserviceId" 
WHERE "serviceId" IS NULL;

UPDATE "WorkOrder" 
SET "serviceId" = "subserviceId" 
WHERE "serviceId" IS NULL;

-- Step 2: Make subserviceId nullable (allow NULL values)
ALTER TABLE "ServiceRequest" ALTER COLUMN "subserviceId" DROP NOT NULL;
ALTER TABLE "WorkOrder" ALTER COLUMN "subserviceId" DROP NOT NULL;

-- Step 3: Make serviceId required (NOT NULL) 
ALTER TABLE "ServiceRequest" ALTER COLUMN "serviceId" SET NOT NULL;
ALTER TABLE "WorkOrder" ALTER COLUMN "serviceId" SET NOT NULL;
