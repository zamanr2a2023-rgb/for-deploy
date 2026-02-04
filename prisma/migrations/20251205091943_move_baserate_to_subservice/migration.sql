/*
  Warnings:

  - You are about to drop the column `baseRate` on the `Service` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ServiceRequest" DROP CONSTRAINT "ServiceRequest_serviceId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceRequest" DROP CONSTRAINT "ServiceRequest_subserviceId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_serviceId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_subserviceId_fkey";

-- AlterTable
ALTER TABLE "Service" DROP COLUMN "baseRate";

-- AlterTable
ALTER TABLE "Subservice" ADD COLUMN     "baseRate" DOUBLE PRECISION;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_subserviceId_fkey" FOREIGN KEY ("subserviceId") REFERENCES "Subservice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_subserviceId_fkey" FOREIGN KEY ("subserviceId") REFERENCES "Subservice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
