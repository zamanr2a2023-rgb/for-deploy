/** @format */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkStats() {
  try {
    // Get all SR statuses
    const srByStatus = await prisma.serviceRequest.groupBy({
      by: ["status"],
      _count: true,
    });

    // Get all WO statuses
    const woByStatus = await prisma.workOrder.groupBy({
      by: ["status"],
      _count: true,
    });

    const totalSRs = await prisma.serviceRequest.count();
    const totalWOs = await prisma.workOrder.count();

    console.log("=== SERVICE REQUEST STATS ===");
    console.log("Total SRs:", totalSRs);
    console.log("SR by Status:");
    srByStatus.forEach((s) => console.log(`  ${s.status}: ${s._count}`));

    console.log("\n=== WORK ORDER STATS ===");
    console.log("Total WOs:", totalWOs);
    console.log("WO by Status:");
    woByStatus.forEach((s) => console.log(`  ${s.status}: ${s._count}`));

    // NEW FIXED STATS ENDPOINT LOGIC
    console.log("\n=== FIXED STATS ENDPOINT VALUES ===");

    // Pending SRs (NEW or OPEN status)
    const pendingSRs = await prisma.serviceRequest.count({
      where: { status: { in: ["NEW", "OPEN"] } },
    });
    console.log("pending (NEW + OPEN SRs):", pendingSRs);

    // In-progress Work Orders
    const inProgressWOs = await prisma.workOrder.count({
      where: {
        status: {
          in: [
            "UNASSIGNED",
            "ASSIGNED",
            "ACCEPTED",
            "IN_PROGRESS",
            "COMPLETED_PENDING_PAYMENT",
          ],
        },
      },
    });
    console.log("inProgress (active WOs):", inProgressWOs);

    // Resolved/Completed Work Orders
    const resolvedWOs = await prisma.workOrder.count({
      where: { status: "PAID_VERIFIED" },
    });
    console.log("resolved (PAID_VERIFIED WOs):", resolvedWOs);

    // Today's SRs
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const openSRsToday = await prisma.serviceRequest.count({
      where: { createdAt: { gte: today, lt: tomorrow } },
    });
    console.log("openSRsToday:", openSRsToday);

    await prisma.$disconnect();
  } catch (error) {
    console.error("Error:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkStats();
