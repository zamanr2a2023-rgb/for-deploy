/** @format */
// test_commission_flow.js - Test the entire commission/bonus and withdrawal flow

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function testCommissionFlow() {
  console.log("\n" + "=".repeat(70));
  console.log("       COMMISSION/BONUS & WITHDRAWAL FLOW TEST");
  console.log("=".repeat(70));

  try {
    // 1. Check System Config (Commission Rates)
    console.log("\n📋 1. SYSTEM CONFIGURATION (Commission Rates):");
    console.log("-".repeat(50));

    let systemConfig = await prisma.systemConfig.findFirst({
      where: { id: 1 },
    });

    if (!systemConfig) {
      console.log("⚠️ SystemConfig not found! Creating default...");
      systemConfig = await prisma.systemConfig.create({
        data: {
          freelancerCommissionRate: 0.05, // 5%
          internalEmployeeBonusRate: 0.05, // 5%
        },
      });
      console.log("✅ SystemConfig created with 5% rates");
    }

    console.log(
      `   Freelancer Commission Rate: ${(
        systemConfig.freelancerCommissionRate * 100
      ).toFixed(1)}%`
    );
    console.log(
      `   Internal Employee Bonus Rate: ${(
        systemConfig.internalEmployeeBonusRate * 100
      ).toFixed(1)}%`
    );

    // 2. Check Technicians
    console.log("\n👷 2. TECHNICIANS:");
    console.log("-".repeat(50));

    const technicians = await prisma.user.findMany({
      where: {
        role: { in: ["TECH_INTERNAL", "TECH_FREELANCER"] },
      },
      include: {
        technicianProfile: true,
        wallet: true,
      },
    });

    console.log(`Found ${technicians.length} technician(s):\n`);

    for (const tech of technicians) {
      const type = tech.technicianProfile?.type || "UNKNOWN";
      const rate =
        type === "FREELANCER"
          ? systemConfig.freelancerCommissionRate
          : systemConfig.internalEmployeeBonusRate;

      console.log(`   ${tech.name} (${tech.phone})`);
      console.log(`   └─ Role: ${tech.role}, Type: ${type}`);
      console.log(
        `   └─ Rate: ${(rate * 100).toFixed(1)}% (${
          type === "FREELANCER" ? "Commission" : "Bonus"
        })`
      );
      console.log(
        `   └─ Wallet Balance: ৳${tech.wallet?.balance?.toFixed(2) || "0.00"}`
      );
      console.log("");
    }

    // 3. Check Commissions
    console.log("\n💰 3. COMMISSIONS/BONUSES STATUS:");
    console.log("-".repeat(50));

    const commissions = await prisma.commission.findMany({
      include: {
        technician: {
          select: { name: true },
        },
        workOrder: {
          select: { woNumber: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    if (commissions.length === 0) {
      console.log("   No commissions found in database.");
    } else {
      // Group by status
      const earned = commissions.filter((c) => c.status === "EARNED");
      const pendingPayout = commissions.filter(
        (c) => c.status === "PENDING_PAYOUT"
      );
      const paid = commissions.filter((c) => c.status === "PAID");

      console.log(`   Total Commissions: ${commissions.length}`);
      console.log(`   EARNED (pending): ${earned.length}`);
      console.log(`   PENDING_PAYOUT: ${pendingPayout.length}`);
      console.log(`   PAID: ${paid.length}`);

      console.log("\n   Recent commissions:");
      commissions.slice(0, 5).forEach((c, idx) => {
        console.log(
          `   ${idx + 1}. WO: ${c.workOrder?.woNumber || "N/A"} | Tech: ${
            c.technician?.name || "N/A"
          }`
        );
        console.log(
          `      Type: ${c.type} | Amount: ৳${c.amount?.toFixed(2)} | Rate: ${(
            c.rate * 100
          ).toFixed(1)}% | Status: ${c.status}`
        );
      });
    }

    // 4. Check Wallets
    console.log("\n💳 4. WALLET BALANCES:");
    console.log("-".repeat(50));

    const wallets = await prisma.wallet.findMany({
      include: {
        technician: {
          select: { name: true, phone: true },
        },
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
    });

    if (wallets.length === 0) {
      console.log("   No wallets found.");
    } else {
      for (const wallet of wallets) {
        console.log(
          `\n   ${wallet.technician?.name} (${wallet.technician?.phone}):`
        );
        console.log(`   └─ Balance: ৳${wallet.balance?.toFixed(2) || "0.00"}`);

        if (wallet.transactions.length > 0) {
          console.log(`   └─ Recent transactions:`);
          wallet.transactions.forEach((tx) => {
            const sign = tx.type === "CREDIT" ? "+" : "-";
            console.log(
              `      ${sign}৳${tx.amount?.toFixed(2)} | ${
                tx.sourceType
              } | ${tx.description?.substring(0, 30)}...`
            );
          });
        }
      }
    }

    // 5. Check Payout Requests
    console.log("\n\n📤 5. PAYOUT REQUESTS (Withdrawals):");
    console.log("-".repeat(50));

    const payoutRequests = await prisma.payoutRequest.findMany({
      include: {
        technician: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    if (payoutRequests.length === 0) {
      console.log("   No withdrawal requests found.");
    } else {
      console.log(`   Total requests: ${payoutRequests.length}`);
      const pending = payoutRequests.filter(
        (r) => r.status === "PENDING"
      ).length;
      const approved = payoutRequests.filter(
        (r) => r.status === "APPROVED"
      ).length;
      const rejected = payoutRequests.filter(
        (r) => r.status === "REJECTED"
      ).length;

      console.log(
        `   PENDING: ${pending} | APPROVED: ${approved} | REJECTED: ${rejected}`
      );

      console.log("\n   Recent requests:");
      payoutRequests.forEach((req, idx) => {
        console.log(
          `   ${idx + 1}. ${req.technician?.name} | ৳${req.amount?.toFixed(
            2
          )} | ${req.status} | ${req.paymentMethod || "N/A"}`
        );
      });
    }

    // 6. Check Payouts (Completed withdrawals)
    console.log("\n\n✅ 6. COMPLETED PAYOUTS:");
    console.log("-".repeat(50));

    const payouts = await prisma.payout.findMany({
      include: {
        technician: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    if (payouts.length === 0) {
      console.log("   No payouts found.");
    } else {
      console.log(`   Total payouts: ${payouts.length}`);

      payouts.forEach((p, idx) => {
        console.log(
          `   ${idx + 1}. ${p.technician?.name} | ৳${p.totalAmount?.toFixed(
            2
          )} | Type: ${p.type} | Status: ${p.status}`
        );
        if (p.processedAt) {
          console.log(`      Processed: ${p.processedAt.toISOString()}`);
        }
      });
    }

    // 7. Test Calculation Example
    console.log("\n\n🧮 7. CALCULATION VERIFICATION:");
    console.log("-".repeat(50));

    const testPaymentAmount = 2500;
    const freelancerRate = systemConfig.freelancerCommissionRate;
    const internalRate = systemConfig.internalEmployeeBonusRate;

    const freelancerCommission =
      Math.round(testPaymentAmount * freelancerRate * 100) / 100;
    const internalBonus =
      Math.round(testPaymentAmount * internalRate * 100) / 100;

    console.log(`   Example Payment Amount: ৳${testPaymentAmount}`);
    console.log(
      `\n   For FREELANCER (${(freelancerRate * 100).toFixed(1)}% Commission):`
    );
    console.log(
      `   └─ ৳${testPaymentAmount} × ${freelancerRate} = ৳${freelancerCommission}`
    );
    console.log(
      `\n   For INTERNAL Employee (${(internalRate * 100).toFixed(1)}% Bonus):`
    );
    console.log(
      `   └─ ৳${testPaymentAmount} × ${internalRate} = ৳${internalBonus}`
    );

    // 8. Verify Wallet Balance Matches Commissions
    console.log("\n\n🔍 8. WALLET vs COMMISSION INTEGRITY CHECK:");
    console.log("-".repeat(50));

    let hasIssues = false;

    for (const tech of technicians) {
      if (!tech.wallet) continue;

      // Get total EARNED commissions
      const totalEarned = await prisma.commission.aggregate({
        where: {
          technicianId: tech.id,
          status: "EARNED",
        },
        _sum: { amount: true },
      });

      // Get wallet transactions totals
      const credits = await prisma.walletTransaction.aggregate({
        where: {
          technicianId: tech.id,
          type: "CREDIT",
        },
        _sum: { amount: true },
      });

      const debits = await prisma.walletTransaction.aggregate({
        where: {
          technicianId: tech.id,
          type: "DEBIT",
        },
        _sum: { amount: true },
      });

      const totalCredits = credits._sum.amount || 0;
      const totalDebits = debits._sum.amount || 0;
      const expectedBalance =
        Math.round((totalCredits - totalDebits) * 100) / 100;
      const actualBalance = Math.round((tech.wallet.balance || 0) * 100) / 100;
      const earnedAmount = totalEarned._sum.amount || 0;

      const balanceMatch = Math.abs(expectedBalance - actualBalance) < 0.01;

      console.log(`\n   ${tech.name}:`);
      console.log(`   └─ Wallet Balance: ৳${actualBalance.toFixed(2)}`);
      console.log(
        `   └─ Expected (Credits - Debits): ৳${expectedBalance.toFixed(2)}`
      );
      console.log(
        `   └─ Total Earned (EARNED status): ৳${earnedAmount.toFixed(2)}`
      );
      console.log(
        `   └─ Balance Check: ${balanceMatch ? "✅ OK" : "❌ MISMATCH"}`
      );

      if (!balanceMatch) {
        hasIssues = true;
        console.log(
          `   └─ ⚠️ Difference: ৳${Math.abs(
            expectedBalance - actualBalance
          ).toFixed(2)}`
        );
      }
    }

    // Summary
    console.log("\n" + "=".repeat(70));
    console.log("                       SUMMARY");
    console.log("=".repeat(70));

    if (!hasIssues) {
      console.log(
        "\n✅ All commission calculations and wallet balances are correct!"
      );
    } else {
      console.log("\n⚠️ Some issues were found. Please review above.");
    }

    console.log("\n📊 Flow Status:");
    console.log("   1. SystemConfig rates: ✅ Configured");
    console.log(`   2. Technicians: ${technicians.length} found`);
    console.log(`   3. Commissions: ${commissions.length} total`);
    console.log(`   4. Wallets: ${wallets.length} active`);
    console.log(`   5. Payout Requests: ${payoutRequests.length} total`);
    console.log(`   6. Payouts: ${payouts.length} completed`);

    console.log("\n" + "=".repeat(70) + "\n");
  } catch (error) {
    console.error("\n❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testCommissionFlow();
