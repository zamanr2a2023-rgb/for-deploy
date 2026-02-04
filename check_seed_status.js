/** @format */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function checkSeedStatus() {
  try {
    const users = await prisma.user.count();
    const workOrders = await prisma.workOrder.count();
    const commissions = await prisma.commission.count();
    const payments = await prisma.payment.count();
    const serviceRequests = await prisma.serviceRequest.count();

    console.log("\n📊 DATABASE STATUS:");
    console.log("==================");
    console.log(`Users: ${users}`);
    console.log(`Service Requests: ${serviceRequests}`);
    console.log(`Work Orders: ${workOrders}`);
    console.log(`Payments: ${payments}`);
    console.log(`Commissions: ${commissions}`);

    if (users === 6 && workOrders === 0) {
      console.log(
        "\n⚠️  Only basic users from reset script - seed data NOT loaded"
      );
      console.log("Run: npx prisma db seed");
    } else if (users >= 9 && workOrders >= 7) {
      console.log("\n✅ Seed data successfully loaded!");
    }
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSeedStatus();
