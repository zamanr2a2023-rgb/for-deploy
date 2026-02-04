/** @format */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkCustomer() {
  try {
    const user = await prisma.user.findUnique({
      where: { phone: "41164406" },
    });

    console.log("Customer Data:");
    console.log(JSON.stringify(user, null, 2));

    await prisma.$disconnect();
  } catch (error) {
    console.error("Error:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkCustomer();
