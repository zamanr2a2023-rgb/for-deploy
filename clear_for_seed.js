/** @format */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function clearAll() {
  try {
    await prisma.user.deleteMany();
    await prisma.systemConfig.deleteMany();
    await prisma.category.deleteMany();
    console.log("✅ Cleared all users, config, and categories");
    await prisma.$disconnect();
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

clearAll();
