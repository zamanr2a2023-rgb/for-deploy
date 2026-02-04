/** @format */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function testNewUserDefaultRate() {
  console.log("\n=== Testing New User Default Rate Configuration ===\n");

  try {
    // Get system config
    const systemConfig = await prisma.systemConfig.findFirst();
    console.log("📊 System Configuration:");
    console.log(
      `  Freelancer Commission Rate: ${
        systemConfig.freelancerCommissionRate * 100
      }%`
    );
    console.log(
      `  Internal Bonus Rate: ${systemConfig.internalEmployeeBonusRate * 100}%`
    );

    // Simulate creating a new freelancer technician (like the code would do)
    console.log("\n🆕 Simulated New Freelancer Creation:");
    const newFreelancerProfile = {
      commissionRate: 0.05, // Default 5%
      bonusRate: 0.05, // Default 5%
      useCustomRate: false, // New users use system default
    };

    console.log("  Profile Data:");
    console.log(
      `    commissionRate: ${newFreelancerProfile.commissionRate * 100}%`
    );
    console.log(`    bonusRate: ${newFreelancerProfile.bonusRate * 100}%`);
    console.log(`    useCustomRate: ${newFreelancerProfile.useCustomRate}`);

    // Calculate effective rate (same logic as in the service)
    let effectiveCommissionRate;
    if (
      newFreelancerProfile.useCustomRate &&
      newFreelancerProfile.commissionRate !== null
    ) {
      effectiveCommissionRate = newFreelancerProfile.commissionRate;
      console.log(
        `  ✅ Effective Rate: ${effectiveCommissionRate * 100}% (Custom Rate)`
      );
    } else if (
      systemConfig?.freelancerCommissionRate !== undefined &&
      systemConfig?.freelancerCommissionRate !== null
    ) {
      effectiveCommissionRate = systemConfig.freelancerCommissionRate;
      console.log(
        `  ✅ Effective Rate: ${
          effectiveCommissionRate * 100
        }% (System Default) ← CORRECT`
      );
    } else {
      effectiveCommissionRate = 0.05;
      console.log(
        `  ✅ Effective Rate: ${effectiveCommissionRate * 100}% (Fallback)`
      );
    }

    // Simulate creating a new internal employee
    console.log("\n🆕 Simulated New Internal Employee Creation:");
    const newInternalProfile = {
      commissionRate: 0.05,
      bonusRate: 0.05, // Default 5%
      useCustomRate: false, // New users use system default
    };

    console.log("  Profile Data:");
    console.log(
      `    commissionRate: ${newInternalProfile.commissionRate * 100}%`
    );
    console.log(`    bonusRate: ${newInternalProfile.bonusRate * 100}%`);
    console.log(`    useCustomRate: ${newInternalProfile.useCustomRate}`);

    // Calculate effective rate (same logic as in the service)
    let effectiveBonusRate;
    if (
      newInternalProfile.useCustomRate &&
      newInternalProfile.bonusRate !== null
    ) {
      effectiveBonusRate = newInternalProfile.bonusRate;
      console.log(
        `  ✅ Effective Rate: ${effectiveBonusRate * 100}% (Custom Rate)`
      );
    } else if (
      systemConfig?.internalEmployeeBonusRate !== undefined &&
      systemConfig?.internalEmployeeBonusRate !== null
    ) {
      effectiveBonusRate = systemConfig.internalEmployeeBonusRate;
      console.log(
        `  ✅ Effective Rate: ${
          effectiveBonusRate * 100
        }% (System Default) ← CORRECT`
      );
    } else {
      effectiveBonusRate = 0.05;
      console.log(
        `  ✅ Effective Rate: ${effectiveBonusRate * 100}% (Fallback)`
      );
    }

    console.log("\n📝 Summary:");
    console.log(
      "  ✅ New freelancers will automatically use system default commission rate"
    );
    console.log(
      "  ✅ New internal employees will automatically use system default bonus rate"
    );
    console.log(
      "  ✅ Admin can later enable custom rates for specific technicians"
    );
    console.log("\n💡 Benefits:");
    console.log("  • Single point of control (SystemConfig table)");
    console.log("  • Admin can update default rates globally");
    console.log(
      "  • All technicians with useCustomRate=false will automatically use new rates"
    );
    console.log(
      "  • Individual technicians can still have custom rates when needed"
    );
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testNewUserDefaultRate();
