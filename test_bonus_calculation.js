/** @format */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function testBonusCalculation() {
  console.log("\n=== Testing Bonus/Commission Calculation ===\n");

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

    // Get all technicians with their profiles
    const technicians = await prisma.user.findMany({
      where: {
        role: { in: ["TECH_FREELANCER", "TECH_INTERNAL"] },
      },
      include: {
        technicianProfile: true,
      },
    });

    console.log("\n👷 Technician Rate Configuration:\n");

    for (const tech of technicians) {
      const profile = tech.technicianProfile;
      const isFreelancer = tech.role === "TECH_FREELANCER";

      // Calculate effective rate based on the same logic as the service
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

      console.log(`${tech.name} (${tech.role}):`);
      console.log(
        `  Profile Rate: ${
          isFreelancer ? profile.commissionRate : profile.bonusRate
        }%`
      );
      console.log(`  Use Custom Rate: ${profile.useCustomRate}`);
      console.log(
        `  ✅ Effective Rate: ${effectiveRate * 100}% (${rateSource})`
      );
      console.log("");
    }

    // Get all commissions with their details
    const commissions = await prisma.commission.findMany({
      include: {
        technician: {
          select: {
            name: true,
            role: true,
          },
        },
        workOrder: {
          select: {
            woNumber: true,
          },
        },
        payment: {
          select: {
            amount: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log("\n💰 Commission/Bonus Calculations:\n");

    for (const commission of commissions) {
      const paymentAmount = commission.payment?.amount || 0;
      const expectedAmount =
        Math.round(paymentAmount * commission.rate * 100) / 100;
      const isCorrect = Math.abs(commission.amount - expectedAmount) < 0.01;

      console.log(
        `${commission.technician.name} - ${commission.workOrder.woNumber}:`
      );
      console.log(`  Payment Amount: ৳${paymentAmount}`);
      console.log(`  Rate Used: ${commission.rate * 100}%`);
      console.log(`  Commission Amount: ৳${commission.amount}`);
      console.log(`  Expected: ৳${expectedAmount}`);
      console.log(`  ${isCorrect ? "✅ CORRECT" : "❌ INCORRECT"}`);
      console.log(`  Status: ${commission.status}`);
      console.log("");
    }

    // Test calculation with current rates
    console.log("\n🧮 Test Calculations:\n");

    const testPayments = [1000, 2000, 5000];

    for (const payment of testPayments) {
      const freelancerCommission =
        Math.round(payment * systemConfig.freelancerCommissionRate * 100) / 100;
      const internalBonus =
        Math.round(payment * systemConfig.internalEmployeeBonusRate * 100) /
        100;

      console.log(`Payment: ৳${payment}`);
      console.log(
        `  Freelancer Commission (${
          systemConfig.freelancerCommissionRate * 100
        }%): ৳${freelancerCommission}`
      );
      console.log(
        `  Internal Bonus (${
          systemConfig.internalEmployeeBonusRate * 100
        }%): ৳${internalBonus}`
      );
      console.log("");
    }

    // Check if there are any technicians with useCustomRate=false who should use system default
    console.log("\n⚠️ Rate Consistency Check:\n");

    const techsUsingDefault = technicians.filter(
      (t) => !t.technicianProfile.useCustomRate
    );

    if (techsUsingDefault.length > 0) {
      console.log("Technicians using System Default Rate:");
      for (const tech of techsUsingDefault) {
        const isFreelancer = tech.role === "TECH_FREELANCER";
        const systemRate = isFreelancer
          ? systemConfig.freelancerCommissionRate
          : systemConfig.internalEmployeeBonusRate;

        console.log(`  ${tech.name}: Should use ${systemRate * 100}%`);
      }
    } else {
      console.log("✅ All technicians have custom rates enabled");
    }

    const techsWithCustom = technicians.filter(
      (t) => t.technicianProfile.useCustomRate
    );

    if (techsWithCustom.length > 0) {
      console.log("\nTechnicians with Custom Rates:");
      for (const tech of techsWithCustom) {
        const isFreelancer = tech.role === "TECH_FREELANCER";
        const customRate = isFreelancer
          ? tech.technicianProfile.commissionRate
          : tech.technicianProfile.bonusRate;

        console.log(`  ${tech.name}: Using custom ${customRate * 100}%`);
      }
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testBonusCalculation();
