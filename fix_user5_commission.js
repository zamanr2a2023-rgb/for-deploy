/** @format */

// Script to fix user ID 5 commission rate
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixCommissionRate() {
  try {
    console.log("\n🔧 Fixing User ID 5 Commission Rate...\n");

    // Check current value
    const beforeUpdate = await prisma.technicianProfile.findUnique({
      where: { userId: 5 },
    });

    console.log("📊 BEFORE UPDATE:");
    console.log(`   Commission Rate: ${beforeUpdate?.commissionRate}`);
    console.log(`   Bonus Rate: ${beforeUpdate?.bonusRate}`);
    console.log(`   Use Custom Rate: ${beforeUpdate?.useCustomRate}`);
    console.log(`   Updated At: ${beforeUpdate?.updatedAt}\n`);

    // Update the commission rate
    const updated = await prisma.technicianProfile.update({
      where: { userId: 5 },
      data: {
        commissionRate: 0.18,
        useCustomRate: true,
      },
    });

    console.log("✅ AFTER UPDATE:");
    console.log(
      `   Commission Rate: ${updated.commissionRate} (${(
        updated.commissionRate * 100
      ).toFixed(1)}%)`
    );
    console.log(
      `   Bonus Rate: ${updated.bonusRate} (${(updated.bonusRate * 100).toFixed(
        1
      )}%)`
    );
    console.log(`   Use Custom Rate: ${updated.useCustomRate}`);
    console.log(`   Updated At: ${updated.updatedAt}\n`);

    // Verify by fetching again
    const verified = await prisma.user.findUnique({
      where: { id: 5 },
      include: {
        technicianProfile: true,
      },
    });

    console.log("🔍 VERIFICATION - Full User Profile:");
    console.log(`   User ID: ${verified.id}`);
    console.log(`   Name: ${verified.name}`);
    console.log(`   Phone: ${verified.phone}`);
    console.log(`   Role: ${verified.role}`);
    console.log(
      `   Profile Commission Rate: ${verified.technicianProfile.commissionRate}`
    );
    console.log(
      `   Profile Use Custom Rate: ${verified.technicianProfile.useCustomRate}\n`
    );

    console.log("✅ Commission rate has been fixed and verified!\n");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCommissionRate();
