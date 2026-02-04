/** @format */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkPaymentStats() {
  try {
    console.log("=== PAYMENT STATUS DIAGNOSTIC ===\n");

    // Get all payment statuses
    const paymentsByStatus = await prisma.payment.groupBy({
      by: ["status"],
      _count: true,
    });

    console.log("=== PAYMENTS BY STATUS ===");
    paymentsByStatus.forEach((p) => {
      console.log(`  ${p.status}: ${p._count}`);
    });

    const totalPayments = await prisma.payment.count();
    console.log(`\nTotal Payments: ${totalPayments}`);

    // Check what getPaymentStats returns
    console.log("\n=== FIXED getPaymentStats LOGIC ===");

    // Pending Upload - just status check (matches list filter)
    const pendingUpload = await prisma.payment.count({
      where: {
        status: { in: ["PENDING_UPLOAD", "PENDING"] },
      },
    });
    console.log(
      `pendingUpload (status in PENDING_UPLOAD/PENDING): ${pendingUpload}`,
    );

    // Awaiting Verification - just status check (matches list filter)
    const awaitingVerification = await prisma.payment.count({
      where: {
        status: "PENDING_VERIFICATION",
      },
    });
    console.log(
      `awaitingVerification (status=PENDING_VERIFICATION): ${awaitingVerification}`,
    );

    // Verified
    const verified = await prisma.payment.count({
      where: { status: "VERIFIED" },
    });
    console.log(`verified (status=VERIFIED): ${verified}`);

    // Rejected
    const rejected = await prisma.payment.count({
      where: { status: "REJECTED" },
    });
    console.log(`rejected (status=REJECTED): ${rejected}`);

    // Check what the list endpoint would return for each filter
    console.log("\n=== LIST ENDPOINT COUNTS (getAllPayments) ===");

    // When user filters by status=VERIFIED
    const listVerified = await prisma.payment.count({
      where: { status: "VERIFIED" },
    });
    console.log(`Filter status=VERIFIED: ${listVerified}`);

    // When user filters by status=PENDING_VERIFICATION
    const listPendingVerification = await prisma.payment.count({
      where: { status: "PENDING_VERIFICATION" },
    });
    console.log(
      `Filter status=PENDING_VERIFICATION: ${listPendingVerification}`,
    );

    // Check if there are payments with proofUrl but wrong status
    console.log("\n=== POTENTIAL ISSUES ===");

    const withProofNotPendingVerification = await prisma.payment.findMany({
      where: {
        proofUrl: { not: null },
        status: { not: "PENDING_VERIFICATION" },
      },
      select: { id: true, status: true, proofUrl: true },
    });
    console.log(
      `Payments with proof but NOT PENDING_VERIFICATION: ${withProofNotPendingVerification.length}`,
    );
    withProofNotPendingVerification.forEach((p) => {
      console.log(
        `  ID: ${p.id}, Status: ${p.status}, HasProof: ${!!p.proofUrl}`,
      );
    });

    // Check for all distinct statuses actually in use
    console.log("\n=== ALL DISTINCT PAYMENT STATUSES IN DB ===");
    const distinctStatuses = await prisma.payment.findMany({
      distinct: ["status"],
      select: { status: true },
    });
    distinctStatuses.forEach((s) => console.log(`  - ${s.status}`));

    await prisma.$disconnect();
  } catch (error) {
    console.error("Error:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkPaymentStats();
