/** @format */
// Diagnostic script to check early payout approval issue
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkEarlyPayoutIssue() {
  console.log("=== EARLY PAYOUT APPROVAL CHECK ===\n");

  try {
    // 1. Get pending early payout requests
    const pendingRequests = await prisma.payoutRequest.findMany({
      where: { status: "PENDING" },
      include: {
        technician: {
          select: {
            id: true,
            name: true,
            wallet: true,
          },
        },
      },
    });

    console.log(
      `📋 Pending Early Payout Requests: ${pendingRequests.length}\n`,
    );

    for (const request of pendingRequests) {
      console.log(`\n--- Request #${request.id} ---`);
      console.log(
        `Technician: ${request.technician?.name} (ID: ${request.technicianId})`,
      );
      console.log(`Requested Amount: ${request.amount}`);
      console.log(`Reason: ${request.reason}`);
      console.log(`Payment Method: ${request.paymentMethod}`);

      const wallet = request.technician?.wallet;
      console.log(`\nWallet Balance: ${wallet?.balance || "NO WALLET"}`);

      // Check earned commissions
      const earnedCommissions = await prisma.commission.findMany({
        where: {
          technicianId: request.technicianId,
          status: "EARNED",
          payoutId: null,
        },
      });

      const totalEarned = earnedCommissions.reduce(
        (sum, c) => sum + c.amount,
        0,
      );
      console.log(
        `Earned Commissions (EARNED status, no payout): ${earnedCommissions.length}`,
      );
      console.log(`Total Earned Amount: ${totalEarned}`);

      // Diagnosis
      console.log("\n🔍 DIAGNOSIS:");
      if (!wallet) {
        console.log("❌ No wallet found for technician!");
      } else if (wallet.balance < request.amount) {
        console.log(
          `❌ Wallet balance (${wallet.balance}) < Requested (${request.amount})`,
        );
        console.log(`   But Total Earned (${totalEarned}) might be sufficient`);

        if (totalEarned >= request.amount) {
          console.log(
            "   ⚠️ ISSUE: Wallet balance not in sync with earned commissions!",
          );
        }
      } else {
        console.log(
          `✅ Wallet balance (${wallet.balance}) >= Requested (${request.amount})`,
        );
      }

      if (totalEarned < request.amount) {
        console.log(
          `❌ Not enough earned commissions: ${totalEarned} < ${request.amount}`,
        );
      } else {
        console.log(
          `✅ Enough earned commissions: ${totalEarned} >= ${request.amount}`,
        );
      }
    }

    // 2. Check all technician wallets vs earned commissions
    console.log("\n\n=== WALLET VS EARNED COMMISSIONS CHECK ===");

    const technicians = await prisma.user.findMany({
      where: {
        role: { in: ["TECH_INTERNAL", "TECH_FREELANCER"] },
      },
      include: {
        wallet: true,
      },
    });

    for (const tech of technicians) {
      const earnedCommissions = await prisma.commission.aggregate({
        where: {
          technicianId: tech.id,
          status: "EARNED",
          payoutId: null,
        },
        _sum: { amount: true },
      });

      const paidOutCommissions = await prisma.commission.aggregate({
        where: {
          technicianId: tech.id,
          status: "PAID",
        },
        _sum: { amount: true },
      });

      const walletBalance = tech.wallet?.balance || 0;
      const earnedAmount = earnedCommissions._sum.amount || 0;
      const paidAmount = paidOutCommissions._sum.amount || 0;

      // Expected balance = earned - paid
      const expectedBalance = earnedAmount; // Only earned (not paid out) should be in wallet

      if (Math.abs(walletBalance - earnedAmount) > 0.01 && earnedAmount > 0) {
        console.log(`\n⚠️ ${tech.name} (ID: ${tech.id}):`);
        console.log(`   Wallet Balance: ${walletBalance}`);
        console.log(`   Earned (unpaid): ${earnedAmount}`);
        console.log(`   Already Paid: ${paidAmount}`);
        console.log(`   Difference: ${walletBalance - earnedAmount}`);
      }
    }

    console.log("\n✅ Check complete!");
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkEarlyPayoutIssue();
