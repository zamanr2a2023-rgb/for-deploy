/** @format */

// Script to test the profile endpoint directly
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testProfileEndpoint() {
  try {
    console.log("\n🔍 Testing Profile Retrieval for All Technicians...\n");
    console.log("=".repeat(100) + "\n");

    const userIds = [4, 5, 9, 10, 12]; // All technician IDs from earlier verification

    for (const userId of userIds) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          role: true,
          technicianProfile: {
            select: {
              id: true,
              type: true,
              commissionRate: true,
              bonusRate: true,
              useCustomRate: true,
              baseSalary: true,
              status: true,
              specialization: true,
              updatedAt: true,
            },
          },
        },
      });

      if (user) {
        console.log(`👤 User ID: ${user.id}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Phone: ${user.phone}`);
        console.log(`   Role: ${user.role}`);

        if (user.technicianProfile) {
          console.log(`   \n   📋 Technician Profile:`);
          console.log(`      Type: ${user.technicianProfile.type}`);
          console.log(
            `      Commission Rate: ${
              user.technicianProfile.commissionRate
            } (${(user.technicianProfile.commissionRate * 100).toFixed(1)}%)`
          );
          console.log(
            `      Bonus Rate: ${user.technicianProfile.bonusRate} (${(
              user.technicianProfile.bonusRate * 100
            ).toFixed(1)}%)`
          );
          console.log(
            `      Use Custom Rate: ${user.technicianProfile.useCustomRate}`
          );
          console.log(`      Status: ${user.technicianProfile.status}`);
          console.log(`      Updated At: ${user.technicianProfile.updatedAt}`);
        }

        console.log("\n" + "-".repeat(100) + "\n");
      }
    }

    // Special focus on User 5
    console.log("\n🎯 SPECIFIC CHECK FOR USER 5:\n");

    const user5Full = await prisma.user.findUnique({
      where: { id: 5 },
      include: {
        technicianProfile: true,
      },
    });

    if (user5Full) {
      console.log("Raw Database Record for User 5:");
      console.log(
        JSON.stringify(
          {
            id: user5Full.id,
            name: user5Full.name,
            phone: user5Full.phone,
            email: user5Full.email,
            role: user5Full.role,
            technicianProfile: {
              id: user5Full.technicianProfile.id,
              userId: user5Full.technicianProfile.userId,
              type: user5Full.technicianProfile.type,
              commissionRate: user5Full.technicianProfile.commissionRate,
              bonusRate: user5Full.technicianProfile.bonusRate,
              useCustomRate: user5Full.technicianProfile.useCustomRate,
              updatedAt: user5Full.technicianProfile.updatedAt,
            },
          },
          null,
          2
        )
      );
    }

    console.log(
      "\n✅ If you see commissionRate: 0.18 above, the database is correct."
    );
    console.log(
      "✅ If GET /api/auth/profile shows different value, you are logged in as a DIFFERENT user!"
    );
    console.log("\n💡 To see user 5's profile, you must:");
    console.log("   1. Login with phone: 5555555555 (user 5's phone)");
    console.log("   2. Use that login token to call GET /api/auth/profile");
    console.log("   3. OR use admin token to call GET /api/technicians/5\n");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testProfileEndpoint();
