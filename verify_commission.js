/** @format */

// Script to verify commission rate in database
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verifyCommissionRate() {
  try {
    console.log(
      "\n🔍 Checking all technicians and their commission rates...\n"
    );

    const technicians = await prisma.user.findMany({
      where: {
        role: {
          in: ["TECH_FREELANCER", "TECH_INTERNAL"],
        },
      },
      include: {
        technicianProfile: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    console.log("📊 Total Technicians:", technicians.length);
    console.log("\n" + "=".repeat(100) + "\n");

    for (const tech of technicians) {
      const profile = tech.technicianProfile;

      console.log(
        `👤 ID: ${tech.id} | Name: ${tech.name || "N/A"} | Phone: ${tech.phone}`
      );
      console.log(`   Role: ${tech.role}`);

      if (profile) {
        console.log(`   Type: ${profile.type}`);
        console.log(
          `   Commission Rate: ${profile.commissionRate} (${(
            profile.commissionRate * 100
          ).toFixed(1)}%)`
        );
        console.log(
          `   Bonus Rate: ${profile.bonusRate} (${(
            profile.bonusRate * 100
          ).toFixed(1)}%)`
        );
        console.log(`   Use Custom Rate: ${profile.useCustomRate}`);
        console.log(`   Status: ${profile.status}`);
        console.log(`   Specialization: ${profile.specialization}`);
        console.log(`   Updated At: ${profile.updatedAt}`);
      } else {
        console.log("   ⚠️ NO PROFILE FOUND");
      }

      console.log("\n" + "-".repeat(100) + "\n");
    }

    // Check specifically user ID 5
    console.log("\n🎯 Detailed Check for User ID 5:\n");
    const user5 = await prisma.user.findUnique({
      where: { id: 5 },
      include: {
        technicianProfile: true,
      },
    });

    if (user5) {
      console.log("User 5 Details:", JSON.stringify(user5, null, 2));
    } else {
      console.log("User ID 5 not found!");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyCommissionRate();
