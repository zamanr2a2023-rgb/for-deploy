/** @format */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function showUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        phone: true,
        name: true,
        role: true,
        technicianProfile: {
          select: {
            commissionRate: true,
            useCustomRate: true,
            type: true,
          },
        },
      },
      orderBy: { id: "asc" },
    });

    console.log("\n👥 ALL USERS IN DATABASE:\n");
    console.log("=".repeat(80));

    users.forEach((user) => {
      console.log(`\nID: ${user.id}`);
      console.log(`Phone: ${user.phone}`);
      console.log(`Name: ${user.name}`);
      console.log(`Role: ${user.role}`);

      if (user.technicianProfile) {
        console.log(`✓ Technician Profile:`);
        console.log(`  - Type: ${user.technicianProfile.type}`);
        console.log(
          `  - Commission Rate: ${(
            user.technicianProfile.commissionRate * 100
          ).toFixed(1)}%`
        );
        console.log(
          `  - Use Custom Rate: ${user.technicianProfile.useCustomRate}`
        );
      } else {
        console.log(`✗ No Technician Profile (not a technician)`);
      }
      console.log("-".repeat(80));
    });

    console.log("\n💡 To update commission rate for a technician:");
    console.log("PATCH /api/admin/users/{ID}/profile");
    console.log('Body: { "commissionRate": 0.18 }');
    console.log('\n⚠️  Only use IDs with "✓ Technician Profile" above!\n');
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

showUsers();
