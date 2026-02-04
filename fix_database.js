/** @format */
// fix_database.js - Fix SystemConfig and clean duplicate commissions

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function fixDatabase() {
  try {
    console.log("\n🔧 FIXING DATABASE...\n");

    // 1. Update SystemConfig to 5% for both
    console.log("1️⃣ Updating SystemConfig to 5% rates...");

    // Find existing config first
    let existingConfig = await prisma.systemConfig.findFirst({
      orderBy: { id: "asc" },
    });

    if (existingConfig) {
      await prisma.systemConfig.update({
        where: { id: existingConfig.id },
        data: {
          freelancerCommissionRate: 0.05, // 5%
          internalEmployeeBonusRate: 0.05, // 5%
        },
      });
    } else {
      existingConfig = await prisma.systemConfig.create({
        data: {
          freelancerCommissionRate: 0.05,
          internalEmployeeBonusRate: 0.05,
          internalEmployeeBaseSalary: 0,
          payoutFrequency: "WEEKLY",
        },
      });
    }
    console.log("   ✅ SystemConfig updated to 5% for both rates\n");

    // 2. Find and remove duplicate BONUS records for FREELANCER technicians
    console.log("2️⃣ Finding duplicate records...");

    // Get all commissions grouped by woId
    const allCommissions = await prisma.commission.findMany({
      include: {
        technician: {
          include: { technicianProfile: true },
        },
        workOrder: { select: { woNumber: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Group by woId
    const byWoId = {};
    allCommissions.forEach((c) => {
      if (!byWoId[c.woId]) byWoId[c.woId] = [];
      byWoId[c.woId].push(c);
    });

    const toDelete = [];

    for (const [woId, records] of Object.entries(byWoId)) {
      if (records.length > 1) {
        console.log(
          `   WO ID ${woId} (${records[0].workOrder?.woNumber}): ${records.length} records`
        );

        // For FREELANCER - keep only COMMISSION, delete BONUS
        // For INTERNAL - keep only BONUS, delete COMMISSION
        const techType = records[0].technician?.technicianProfile?.type;

        records.forEach((r) => {
          if (techType === "FREELANCER" && r.type === "BONUS") {
            toDelete.push(r.id);
            console.log(
              `      ❌ Will delete BONUS record (ID: ${r.id}) - Freelancer should not have BONUS`
            );
          } else if (techType === "INTERNAL" && r.type === "COMMISSION") {
            toDelete.push(r.id);
            console.log(
              `      ❌ Will delete COMMISSION record (ID: ${r.id}) - Internal should not have COMMISSION`
            );
          }
        });
      }
    }

    // 3. Delete duplicates
    if (toDelete.length > 0) {
      console.log(`\n3️⃣ Deleting ${toDelete.length} incorrect records...`);
      await prisma.commission.deleteMany({
        where: { id: { in: toDelete } },
      });
      console.log(`   ✅ Deleted ${toDelete.length} records\n`);
    } else {
      console.log("\n3️⃣ No duplicates to delete\n");
    }

    // 4. Verify final state
    console.log("4️⃣ Final verification:");
    const config = await prisma.systemConfig.findFirst({
      orderBy: { id: "asc" },
    });
    console.log(
      `   Freelancer Commission Rate: ${config.freelancerCommissionRate * 100}%`
    );
    console.log(
      `   Internal Bonus Rate: ${config.internalEmployeeBonusRate * 100}%`
    );

    const remaining = await prisma.commission.count();
    console.log(`   Total commission records: ${remaining}\n`);

    console.log("✅ DATABASE FIXED!\n");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDatabase();
