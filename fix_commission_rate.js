/** @format */

/**
 * Script to fix commission rates to 0.05 (5%) as default
 * This script updates:
 * 1. SystemConfig freelancerCommissionRate to 0.05
 * 2. All technician profiles without custom rates
 *
 * Run with: node fix_commission_rate.js
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixCommissionRates() {
  console.log("\n🔧 Starting commission rate fix to 0.05 (5%)...\n");

  try {
    // 1. Update or create SystemConfig with 0.05 rate
    console.log("📋 Step 1: Updating SystemConfig...");

    let systemConfig = await prisma.systemConfig.findFirst({
      orderBy: { id: "asc" },
    });

    if (systemConfig) {
      // Update existing config
      systemConfig = await prisma.systemConfig.update({
        where: { id: systemConfig.id },
        data: {
          freelancerCommissionRate: 0.05,
          internalEmployeeBonusRate: 0.05,
        },
      });
      console.log("✅ SystemConfig updated:");
      console.log(
        `   - Freelancer Commission Rate: ${
          systemConfig.freelancerCommissionRate
        } (${(systemConfig.freelancerCommissionRate * 100).toFixed(1)}%)`
      );
      console.log(
        `   - Internal Bonus Rate: ${
          systemConfig.internalEmployeeBonusRate
        } (${(systemConfig.internalEmployeeBonusRate * 100).toFixed(1)}%)`
      );
    } else {
      // Create new config
      systemConfig = await prisma.systemConfig.create({
        data: {
          freelancerCommissionRate: 0.05,
          internalEmployeeBonusRate: 0.05,
          internalEmployeeBaseSalary: 0,
          payoutFrequency: "WEEKLY",
        },
      });
      console.log("✅ SystemConfig created with 5% rates");
    }

    // 2. Update all technician profiles without custom rates
    console.log("\n📋 Step 2: Updating technician profiles...");

    // Update FREELANCER profiles without custom rates
    const freelancerUpdate = await prisma.technicianProfile.updateMany({
      where: {
        type: "FREELANCER",
        useCustomRate: false,
      },
      data: {
        commissionRate: 0.05,
      },
    });
    console.log(
      `✅ Updated ${freelancerUpdate.count} FREELANCER profiles to 5% commission`
    );

    // Update INTERNAL profiles without custom rates
    const internalUpdate = await prisma.technicianProfile.updateMany({
      where: {
        type: "INTERNAL",
        useCustomRate: false,
      },
      data: {
        bonusRate: 0.05,
      },
    });
    console.log(
      `✅ Updated ${internalUpdate.count} INTERNAL profiles to 5% bonus`
    );

    // 3. Show summary of all technicians
    console.log("\n📋 Step 3: Summary of all technicians...\n");

    const allTechs = await prisma.user.findMany({
      where: {
        role: { in: ["TECH_INTERNAL", "TECH_FREELANCER"] },
      },
      include: {
        technicianProfile: true,
      },
      orderBy: { id: "asc" },
    });

    allTechs.forEach((tech) => {
      const profile = tech.technicianProfile;
      if (profile) {
        const rate =
          profile.type === "FREELANCER"
            ? profile.commissionRate
            : profile.bonusRate;
        const rateType = profile.type === "FREELANCER" ? "Commission" : "Bonus";
        const customFlag = profile.useCustomRate
          ? "(Custom)"
          : "(System Default)";

        console.log(`👤 ${tech.name} (${tech.role})`);
        console.log(`   Type: ${profile.type}`);
        console.log(
          `   ${rateType} Rate: ${rate} (${(rate * 100).toFixed(
            1
          )}%) ${customFlag}`
        );
        console.log("");
      }
    });

    console.log("\n✅ Commission rate fix completed successfully!");
    console.log("\n📌 Summary:");
    console.log(`   - System Default Rate: 5% (0.05)`);
    console.log(`   - Freelancers updated: ${freelancerUpdate.count}`);
    console.log(`   - Internal employees updated: ${internalUpdate.count}`);
    console.log("\n💡 To change rates in the future:");
    console.log("   Admin can use: PATCH /api/admin/system-config");
    console.log('   Body: { "freelancerCommissionRate": 0.05 }');
    console.log("   Note: Rate should be between 0 and 1 (0% to 100%)");
  } catch (error) {
    console.error("❌ Error fixing commission rates:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixCommissionRates().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
