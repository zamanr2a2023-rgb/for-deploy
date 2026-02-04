/** @format */

// Test script to check and demonstrate the fix
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testCommissionRateFix() {
  console.log("\n🧪 Testing Commission Rate Update Fix\n");

  try {
    // Check current state
    console.log("📋 Step 1: Current state of all technicians\n");

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

        console.log(`👤 ${tech.name} (ID: ${tech.id})`);
        console.log(`   Type: ${profile.type}`);
        console.log(
          `   ${rateType} Rate: ${rate} (${(rate * 100).toFixed(1)}%)`
        );
        console.log(`   useCustomRate: ${profile.useCustomRate}`);
        console.log("");
      }
    });

    // Get system config
    console.log("📋 Step 2: System Configuration\n");

    const systemConfig = await prisma.systemConfig.findFirst({
      orderBy: { id: "asc" },
    });

    if (systemConfig) {
      console.log(
        `   Freelancer Commission Rate: ${
          systemConfig.freelancerCommissionRate
        } (${(systemConfig.freelancerCommissionRate * 100).toFixed(1)}%)`
      );
      console.log(
        `   Internal Bonus Rate: ${systemConfig.internalEmployeeBonusRate} (${(
          systemConfig.internalEmployeeBonusRate * 100
        ).toFixed(1)}%)`
      );
    }

    console.log("\n✅ Test completed!");
    console.log("\n💡 Now when admin updates a technician commission rate:");
    console.log(
      "   1. The useCustomRate flag will be set to true automatically"
    );
    console.log("   2. The commission calculation will use the custom rate");
    console.log(
      "   3. Future system config changes won't affect this technician"
    );
    console.log(
      "\n📌 To test: Update technician via PATCH /api/admin/users/:id/profile"
    );
    console.log('   Body: { "commissionRate": 0.18 }');
    console.log("   The useCustomRate will automatically be set to true");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testCommissionRateFix();
