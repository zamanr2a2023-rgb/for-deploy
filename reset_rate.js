/** @format */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function reset() {
  const config = await prisma.systemConfig.findFirst();
  if (!config) {
    console.log("❌ No system config found");
    await prisma.$disconnect();
    return;
  }

  const updated = await prisma.systemConfig.update({
    where: { id: config.id },
    data: { freelancerCommissionRate: 0.05 },
  });
  console.log("✅ Reset to 5%:", updated.freelancerCommissionRate);
  await prisma.$disconnect();
}

reset();
