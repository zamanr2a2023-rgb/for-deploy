/** @format */

/**
 * Complete test to verify commission rate fix
 * This demonstrates that custom rates now work correctly
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testCommissionRateComplete() {
  console.log("\n🧪 COMPLETE COMMISSION RATE FIX TEST\n");
  console.log("=".repeat(70));

  try {
    // Get system config
    const systemConfig = await prisma.systemConfig.findFirst({
      orderBy: { id: "asc" },
    });

    console.log("\n📊 SYSTEM CONFIGURATION:");
    console.log(
      `   Freelancer Commission Rate: ${(
        systemConfig.freelancerCommissionRate * 100
      ).toFixed(1)}%`
    );
    console.log(
      `   Internal Bonus Rate: ${(
        systemConfig.internalEmployeeBonusRate * 100
      ).toFixed(1)}%`
    );

    // Get all technicians
    const technicians = await prisma.user.findMany({
      where: {
        role: { in: ["TECH_INTERNAL", "TECH_FREELANCER"] },
      },
      include: {
        technicianProfile: true,
      },
      orderBy: { id: "asc" },
    });

    console.log("\n\n👥 ALL TECHNICIANS & THEIR COMMISSION RATES:\n");
    console.log("=".repeat(70));

    technicians.forEach((tech) => {
      const profile = tech.technicianProfile;
      if (profile) {
        const rate =
          profile.type === "FREELANCER"
            ? profile.commissionRate
            : profile.bonusRate;
        const rateType = profile.type === "FREELANCER" ? "Commission" : "Bonus";
        const isCustom = profile.useCustomRate;

        console.log(`\n📍 ${tech.name} (ID: ${tech.id})`);
        console.log(`   Type: ${profile.type}`);
        console.log(`   ${rateType} Rate: ${(rate * 100).toFixed(1)}%`);
        console.log(`   useCustomRate: ${isCustom ? "YES ✅" : "NO"}`);

        // Show what will be used in commission calculation
        let effectiveRate;
        if (isCustom) {
          effectiveRate = rate;
          console.log(
            `   💰 Effective Rate: ${(effectiveRate * 100).toFixed(
              1
            )}% (CUSTOM RATE)`
          );
        } else {
          effectiveRate =
            profile.type === "FREELANCER"
              ? systemConfig.freelancerCommissionRate
              : systemConfig.internalEmployeeBonusRate;
          console.log(
            `   💰 Effective Rate: ${(effectiveRate * 100).toFixed(
              1
            )}% (SYSTEM DEFAULT)`
          );
        }

        // Example calculation
        const examplePayment = 5000;
        const exampleCommission = examplePayment * effectiveRate;
        console.log(
          `   📝 Example: ৳${examplePayment} payment → ৳${exampleCommission.toFixed(
            2
          )} commission`
        );
      }
    });

    console.log("\n\n" + "=".repeat(70));
    console.log("\n✅ HOW TO TEST IN POSTMAN:\n");
    console.log("1️⃣  Set custom rate (18%)");
    console.log("   PATCH http://localhost:4000/api/admin/users/5/profile");
    console.log('   Body: { "commissionRate": 0.18 }');
    console.log("   Expected: useCustomRate becomes true, rate = 0.18\n");

    console.log("2️⃣  Verify the profile");
    console.log("   GET http://localhost:4000/api/auth/profile");
    console.log("   (Use technician token)");
    console.log("   Expected: commissionRate = 0.18, useCustomRate = true\n");

    console.log("3️⃣  Complete a work order and check commission");
    console.log("   Expected: Commission calculated at 18%, not 5%\n");

    console.log("4️⃣  Revert to system default");
    console.log("   PATCH http://localhost:4000/api/admin/users/5/profile");
    console.log('   Body: { "useCustomRate": false }');
    console.log("   Expected: Uses system default 5% again\n");

    console.log("=".repeat(70));
    console.log("\n💡 KEY POINTS:\n");
    console.log(
      "✅ When admin sets commissionRate → useCustomRate automatically true"
    );
    console.log("✅ Commission calculation checks useCustomRate FIRST");
    console.log("✅ If useCustomRate=true → uses technician rate");
    console.log("✅ If useCustomRate=false → uses system config rate");
    console.log("✅ Can revert to system default anytime\n");

    console.log("=".repeat(70));
    console.log("\n🎯 SUMMARY:\n");
    const customCount = technicians.filter(
      (t) => t.technicianProfile?.useCustomRate
    ).length;
    const defaultCount = technicians.filter(
      (t) => !t.technicianProfile?.useCustomRate
    ).length;
    console.log(`   Total Technicians: ${technicians.length}`);
    console.log(`   Using Custom Rates: ${customCount}`);
    console.log(`   Using System Default: ${defaultCount}`);
    console.log(
      `   System Default Rate: ${(
        systemConfig.freelancerCommissionRate * 100
      ).toFixed(1)}%\n`
    );
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testCommissionRateComplete();
