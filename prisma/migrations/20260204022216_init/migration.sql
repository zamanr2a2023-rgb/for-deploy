-- AlterTable
ALTER TABLE "SystemConfig" ALTER COLUMN "freelancerCommissionRate" SET DEFAULT 0.05;

-- AlterTable
ALTER TABLE "TechnicianProfile" ADD COLUMN     "homeAddress" TEXT,
ADD COLUMN     "isForeigner" BOOLEAN DEFAULT false;

-- CreateTable
CREATE TABLE "Specialization" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,

    CONSTRAINT "Specialization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Specialization_name_key" ON "Specialization"("name");

-- AddForeignKey
ALTER TABLE "Specialization" ADD CONSTRAINT "Specialization_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
