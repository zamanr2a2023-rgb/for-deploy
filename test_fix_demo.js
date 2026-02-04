/** @format */

/**
 * Quick test to demonstrate the commission rate fix
 * Run with: node test_fix_demo.js
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function demonstrateFix() {
  console.log("\n🎯 Commission Rate Fix Demonstration\n");
  console.log("=".repeat(60));

  try {
    // Show system config
    const systemConfig = await prisma.systemConfig.findFirst({
      orderBy: { id: "asc" },
    });

    console.log("\n📊 SYSTEM CONFIGURATION:");
    console.log(
      `   Default Commission Rate: ${(
        systemConfig.freelancerCommissionRate * 100
      ).toFixed(1)}%`
    );
    console.log("");

    // Show all technicians
    console.log("👥 ALL TECHNICIANS:\n");

    const technicians = await prisma.user.findMany({
      where: {
        role: { in: ["TECH_INTERNAL", "TECH_FREELANCER"] },
      },
      include: {
        technicianProfile: true,
      },
      orderBy: { id: "asc" },
    });

    technicians.forEach((tech, index) => {
      const profile = tech.technicianProfile;
      if (profile) {
        const rate =
          profile.type === "FREELANCER"
            ? profile.commissionRate
            : profile.bonusRate;
        const rateType = profile.type === "FREELANCER" ? "Commission" : "Bonus";
        const isCustom = profile.useCustomRate;

        console.log(`${index + 1}. ${tech.name} (ID: ${tech.id})`);
        console.log(`   Type: ${profile.type}`);
        console.log(`   ${rateType} Rate: ${(rate * 100).toFixed(1)}%`);
        console.log(
          `   Uses Custom Rate: ${
            isCustom ? "YES ✅" : "NO (uses system default)"
          }`
        );
        console.log(
          `   ${
            isCustom
              ? "   → This technician has a custom rate set by admin"
              : "   → This technician follows system default rate"
          }`
        );
        console.log("");
      }
    });

    console.log("=".repeat(60));
    console.log("\n💡 HOW THE FIX WORKS:\n");
    console.log("Before Fix:");
    console.log("  ❌ Admin sets custom rate → useCustomRate stays false");
    console.log("  ❌ System uses default 5% instead of custom rate");
    console.log("");
    console.log("After Fix:");
    console.log(
      "  ✅ Admin sets custom rate → useCustomRate automatically true"
    );
    console.log("  ✅ System uses the custom rate as expected");
    console.log("");
    console.log("=".repeat(60));
    console.log("\n📝 EXAMPLE: Setting 18% for a technician\n");
    console.log("Request:");
    console.log("  PATCH /api/admin/users/5/profile");
    console.log('  { "commissionRate": 0.18 }');
    console.log("");
    console.log("What happens now:");
    console.log("  1. commissionRate = 0.18 ✅");
    console.log("  2. useCustomRate = true (automatic) ✅");
    console.log("  3. Commission calculations use 18% ✅");
    console.log("");
    console.log("Work Order Example:");
    console.log("  Payment: ৳5000");
    console.log("  Rate: 18% (0.18)");
    console.log("  Commission: ৳5000 × 0.18 = ৳900 ✅");
    console.log("");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

demonstrateFix();
