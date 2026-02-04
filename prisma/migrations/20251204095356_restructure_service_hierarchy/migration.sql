/*
  Warnings:

  - You are about to drop the column `subserviceId` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the column `categoryId` on the `Subservice` table. All the data in the column will be lost.
  - Added the required column `serviceId` to the `Subservice` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Create temporary tables to store old data structure
CREATE TABLE "_migration_old_subservices" AS SELECT * FROM "Subservice";
CREATE TABLE "_migration_old_services" AS SELECT * FROM "Service";

-- Step 2: Drop existing foreign key constraints
ALTER TABLE "Service" DROP CONSTRAINT IF EXISTS "Service_subserviceId_fkey";
ALTER TABLE "Service" DROP CONSTRAINT IF EXISTS "Service_categoryId_fkey";
ALTER TABLE "Subservice" DROP CONSTRAINT IF EXISTS "Subservice_categoryId_fkey";
ALTER TABLE "ServiceRequest" DROP CONSTRAINT IF EXISTS "ServiceRequest_serviceId_fkey";
ALTER TABLE "ServiceRequest" DROP CONSTRAINT IF EXISTS "ServiceRequest_subserviceId_fkey";
ALTER TABLE "WorkOrder" DROP CONSTRAINT IF EXISTS "WorkOrder_serviceId_fkey";
ALTER TABLE "WorkOrder" DROP CONSTRAINT IF EXISTS "WorkOrder_subserviceId_fkey";

-- Step 3: Clear the tables
DELETE FROM "Service";
DELETE FROM "Subservice";

-- Step 4: Restructure Service table (drop subserviceId)
ALTER TABLE "Service" DROP COLUMN "subserviceId";

-- Step 5: Restructure Subservice table (drop categoryId, add serviceId with default temporarily)
ALTER TABLE "Subservice" DROP COLUMN "categoryId";
ALTER TABLE "Subservice" ADD COLUMN "serviceId" INTEGER;

-- Step 6: Swap data - Old Subservices become new Services
-- (e.g., "AC Repair" was a Subservice, now becomes a Service)
INSERT INTO "Service" (id, "categoryId", name, description, "baseRate", "createdAt", "updatedAt")
SELECT id, "categoryId", name, description, NULL, "createdAt", "updatedAt"
FROM "_migration_old_subservices";

-- Step 7: Swap data - Old Services become new Subservices  
-- (e.g., "AC Not Cooling" was a Service, now becomes a Subservice)
-- Map old Service.subserviceId to new Subservice.serviceId
INSERT INTO "Subservice" (id, "serviceId", name, description, "createdAt", "updatedAt")
SELECT id, "subserviceId", name, description, "createdAt", "updatedAt"
FROM "_migration_old_services";

-- Step 8: Update sequences to avoid ID conflicts
SELECT setval('"Service_id_seq"', (SELECT MAX(id) FROM "Service"));
SELECT setval('"Subservice_id_seq"', (SELECT MAX(id) FROM "Subservice"));

-- Step 9: Make serviceId NOT NULL now that data is populated
ALTER TABLE "Subservice" ALTER COLUMN "serviceId" SET NOT NULL;

-- Step 10: Re-add foreign key constraints
ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" 
  FOREIGN KEY ("categoryId") REFERENCES "Category"(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Subservice" ADD CONSTRAINT "Subservice_serviceId_fkey" 
  FOREIGN KEY ("serviceId") REFERENCES "Service"(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "Service"(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_subserviceId_fkey"
  FOREIGN KEY ("subserviceId") REFERENCES "Subservice"(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "Service"(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_subserviceId_fkey"
  FOREIGN KEY ("subserviceId") REFERENCES "Subservice"(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 11: Clean up temporary tables
DROP TABLE "_migration_old_subservices";
DROP TABLE "_migration_old_services";
