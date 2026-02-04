/** @format */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function testRateUpdates() {
  console.log("\n=== Testing Rate Updates ===\n");

  try {
    // Get system config
    const systemConfig = await prisma.systemConfig.findFirst();
    console.log("📊 System Config:");
    console.log(
      `  Freelancer Commission Rate: ${
        systemConfig.freelancerCommissionRate * 100
      }%`
    );
    console.log(
      `  Internal Bonus Rate: ${systemConfig.internalEmployeeBonusRate * 100}%`
    );
    console.log(`  Updated At: ${systemConfig.updatedAt}`);

    // Get all technicians
    const technicians = await prisma.user.findMany({
      where: {
        role: { in: ["TECH_FREELANCER", "TECH_INTERNAL"] },
      },
      include: {
        technicianProfile: true,
      },
    });

    console.log("\n👷 Technician Profiles:\n");

    for (const tech of technicians) {
      const profile = tech.technicianProfile;
      const isFreelancer = tech.role === "TECH_FREELANCER";

      console.log(`${tech.name} (${tech.role}):`);
      console.log(`  Use Custom Rate: ${profile.useCustomRate}`);
      console.log(
        `  Profile Commission Rate: ${profile.commissionRate * 100}%`
      );
      console.log(`  Profile Bonus Rate: ${profile.bonusRate * 100}%`);
      console.log(`  Profile Updated At: ${profile.updatedAt}`);

      // Calculate effective rate
      let effectiveRate;
      let rateSource;
      if (isFreelancer) {
        if (profile.useCustomRate && profile.commissionRate !== null) {
          effectiveRate = profile.commissionRate;
          rateSource = "Custom Rate";
        } else {
          effectiveRate = systemConfig.freelancerCommissionRate;
          rateSource = "System Default";
        }
      } else {
        if (profile.useCustomRate && profile.bonusRate !== null) {
          effectiveRate = profile.bonusRate;
          rateSource = "Custom Rate";
        } else {
          effectiveRate = systemConfig.internalEmployeeBonusRate;
          rateSource = "System Default";
        }
      }

      console.log(
        `  ✅ Effective Rate: ${effectiveRate * 100}% (${rateSource})`
      );
      console.log(
        `  📅 Rate Updated At: ${
          profile.useCustomRate ? profile.updatedAt : systemConfig.updatedAt
        }`
      );
      console.log("");
    }

    console.log("\n=== Test Scenarios ===\n");

    // Scenario 1: Update system default rate
    console.log("1️⃣ Update System Default Commission Rate to 6%");
    await prisma.systemConfig.update({
      where: { id: systemConfig.id },
      data: { freelancerCommissionRate: 0.06 },
    });
    const updatedConfig = await prisma.systemConfig.findFirst();
    console.log(
      `   ✅ System rate updated: ${
        updatedConfig.freelancerCommissionRate * 100
      }%`
    );
    console.log(`   📅 Updated At: ${updatedConfig.updatedAt}`);

    // Scenario 2: Set custom rate for a specific technician
    const freelancer = technicians.find((t) => t.role === "TECH_FREELANCER");
    if (freelancer) {
      console.log(`\n2️⃣ Set Custom Rate for ${freelancer.name} to 8%`);
      const updated = await prisma.technicianProfile.update({
        where: { userId: freelancer.id },
        data: {
          commissionRate: 0.08,
          useCustomRate: true,
        },
      });
      console.log(`   ✅ Custom rate set: ${updated.commissionRate * 100}%`);
      console.log(`   📅 Profile Updated At: ${updated.updatedAt}`);
    }

    // Scenario 3: Remove custom rate (revert to system default)
    if (freelancer) {
      console.log(
        `\n3️⃣ Remove Custom Rate for ${freelancer.name} (revert to system default)`
      );
      const reverted = await prisma.technicianProfile.update({
        where: { userId: freelancer.id },
        data: {
          useCustomRate: false,
        },
      });
      console.log(`   ✅ Reverted to system default`);
      console.log(`   📅 Profile Updated At: ${reverted.updatedAt}`);
      console.log(
        `   ℹ️  Effective Rate: ${
          updatedConfig.freelancerCommissionRate * 100
        }% (from system config)`
      );
    }

    console.log("\n✅ Test completed!\n");
    console.log("📝 To verify in API:");
    console.log("   1. GET /api/auth/profile - should show rateUpdatedAt");
    console.log(
      "   2. GET /api/technician/earnings - should show commissionRate.updatedAt or bonusRate.updatedAt"
    );
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testRateUpdates();
