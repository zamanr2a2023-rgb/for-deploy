/** @format */

// Quick check of database state
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log("\n🔍 Checking Database State...\n");

  try {
    // Check user ID 5
    const user5 = await prisma.user.findUnique({
      where: { id: 5 },
      include: {
        technicianProfile: true,
      },
    });

    if (user5) {
      console.log("👤 User ID 5:");
      console.log(`   Name: ${user5.name}`);
      console.log(`   Phone: ${user5.phone}`);
      console.log(`   Role: ${user5.role}`);

      if (user5.technicianProfile) {
        const profile = user5.technicianProfile;
        console.log("\n📊 Technician Profile:");
        console.log(`   Profile ID: ${profile.id}`);
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
        console.log(`   useCustomRate: ${profile.useCustomRate}`);
        console.log(`   Status: ${profile.status}`);
        console.log(`   Updated At: ${profile.updatedAt}`);
      }
    } else {
      console.log("❌ User ID 5 not found!");
    }

    // Check all technicians
    console.log("\n\n📋 All Technicians:\n");
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
      const p = tech.technicianProfile;
      if (p) {
        const rate = p.type === "FREELANCER" ? p.commissionRate : p.bonusRate;
        console.log(
          `ID ${tech.id}: ${tech.name} - ${(rate * 100).toFixed(
            1
          )}% (useCustomRate: ${p.useCustomRate})`
        );
      }
    });
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
