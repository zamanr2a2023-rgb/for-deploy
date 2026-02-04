/** @format */

/**
 * Database Clear Script - Only deletes data without recreating
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function clearDatabase() {
  console.log("\n⚠️  CLEARING ALL DATABASE DATA!\n");
  console.log("Starting in 2 seconds...");

  await new Promise((resolve) => setTimeout(resolve, 2000));

  try {
    console.log("\n🗑️  Deleting all data in correct order...\n");

    // Delete in proper order (respecting foreign keys)
    await prisma.walletTransaction.deleteMany();
    console.log("✅ Deleted WalletTransactions");

    await prisma.wallet.deleteMany();
    console.log("✅ Deleted Wallets");

    await prisma.commission.deleteMany();
    console.log("✅ Deleted Commissions");

    await prisma.payoutRequest.deleteMany();
    console.log("✅ Deleted PayoutRequests");

    await prisma.payout.deleteMany();
    console.log("✅ Deleted Payouts");

    await prisma.payment.deleteMany();
    console.log("✅ Deleted Payments");

    await prisma.review.deleteMany();
    console.log("✅ Deleted Reviews");

    await prisma.technicianCheckin.deleteMany();
    console.log("✅ Deleted TechnicianCheckins");

    await prisma.workOrder.deleteMany();
    console.log("✅ Deleted WorkOrders");

    await prisma.serviceRequest.deleteMany();
    console.log("✅ Deleted ServiceRequests");

    await prisma.notification.deleteMany();
    console.log("✅ Deleted Notifications");

    await prisma.fCMToken.deleteMany();
    console.log("✅ Deleted FCMTokens");

    await prisma.auditLog.deleteMany();
    console.log("✅ Deleted AuditLogs");

    await prisma.oTP.deleteMany();
    console.log("✅ Deleted OTPs");

    await prisma.technicianProfile.deleteMany();
    console.log("✅ Deleted TechnicianProfiles");

    await prisma.user.deleteMany();
    console.log("✅ Deleted Users");

    await prisma.rateStructure.deleteMany();
    console.log("✅ Deleted RateStructures");

    await prisma.systemConfig.deleteMany();
    console.log("✅ Deleted SystemConfig");

    await prisma.subservice.deleteMany();
    console.log("✅ Deleted Subservices");

    await prisma.service.deleteMany();
    console.log("✅ Deleted Services");

    await prisma.category.deleteMany();
    console.log("✅ Deleted Categories");

    console.log("\n✅ DATABASE CLEARED! Ready for seed data.\n");
    console.log("Run: node prisma/seed.js");
  } catch (error) {
    console.error("\n❌ Error during database clear:", error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearDatabase().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
