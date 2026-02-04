/** @format */
// check_calculation.js - Run this to verify commission/bonus calculations

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function checkCalculation() {
  try {
    console.log("\n" + "=".repeat(60));
    console.log("       COMMISSION/BONUS CALCULATION VERIFICATION");
    console.log("=".repeat(60));

    // 1. Check SystemConfig
    console.log("\n📋 SYSTEM CONFIGURATION:");
    console.log("-".repeat(40));

    let config = await prisma.systemConfig.findFirst({ where: { id: 1 } });

    if (!config) {
      console.log("⚠️  No SystemConfig found! Creating default...");
      config = await prisma.systemConfig.create({
        data: {
          freelancerCommissionRate: 0.05,
          internalEmployeeBonusRate: 0.05,
          internalEmployeeBaseSalary: 0,
          payoutFrequency: "WEEKLY",
        },
      });
      console.log("✅ Created default SystemConfig");
    }

    console.log(
      `   Freelancer Commission Rate: ${config.freelancerCommissionRate} (${
        config.freelancerCommissionRate * 100
      }%)`
    );
    console.log(
      `   Internal Bonus Rate: ${config.internalEmployeeBonusRate} (${
        config.internalEmployeeBonusRate * 100
      }%)`
    );

    // 2. Show calculation formula
    console.log("\n📐 CALCULATION FORMULA:");
    console.log("-".repeat(40));
    console.log("   Commission/Bonus = Payment Amount × Rate");
    console.log("");
    console.log("   For FREELANCER technicians:");
    console.log(
      `   Commission = Payment × ${config.freelancerCommissionRate} (${
        config.freelancerCommissionRate * 100
      }%)`
    );
    console.log("");
    console.log("   For INTERNAL technicians:");
    console.log(
      `   Bonus = Payment × ${config.internalEmployeeBonusRate} (${
        config.internalEmployeeBonusRate * 100
      }%)`
    );

    // 3. Example calculations
    console.log("\n💰 EXAMPLE CALCULATIONS:");
    console.log("-".repeat(40));

    const examplePayments = [500, 1000, 2500, 5000, 10000];

    console.log(
      "\n   FREELANCER (Commission at " +
        config.freelancerCommissionRate * 100 +
        "%):"
    );
    examplePayments.forEach((amount) => {
      const commission = amount * config.freelancerCommissionRate;
      console.log(
        `   ₹${amount.toLocaleString()} → Commission: ₹${commission.toLocaleString()}`
      );
    });

    console.log(
      "\n   INTERNAL EMPLOYEE (Bonus at " +
        config.internalEmployeeBonusRate * 100 +
        "%):"
    );
    examplePayments.forEach((amount) => {
      const bonus = amount * config.internalEmployeeBonusRate;
      console.log(
        `   ₹${amount.toLocaleString()} → Bonus: ₹${bonus.toLocaleString()}`
      );
    });

    // 4. Check recent commissions from database
    console.log("\n📊 RECENT COMMISSIONS IN DATABASE (Last 10):");
    console.log("-".repeat(40));

    const recentCommissions = await prisma.commission.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        workOrder: { select: { woNumber: true } },
        technician: {
          select: {
            name: true,
            role: true,
            technicianProfile: { select: { type: true } },
          },
        },
      },
    });

    if (recentCommissions.length === 0) {
      console.log("   ⚠️  No commissions found in database yet");
    } else {
      recentCommissions.forEach((c, idx) => {
        console.log(`\n   ${idx + 1}. WO: ${c.workOrder?.woNumber || "N/A"}`);
        console.log(
          `      Technician: ${c.technician?.name} (${
            c.technician?.technicianProfile?.type || c.technician?.role
          })`
        );
        console.log(`      Type: ${c.type}`);
        console.log(`      Rate: ${c.rate} (${c.rate * 100}%)`);
        console.log(`      Amount: ₹${c.amount}`);
        console.log(`      Status: ${c.status}`);
        console.log(`      Date: ${c.createdAt.toISOString()}`);
      });
    }

    // 5. Summary statistics
    console.log("\n📈 SUMMARY STATISTICS:");
    console.log("-".repeat(40));

    const stats = await prisma.commission.aggregate({
      _count: { id: true },
      _sum: { amount: true },
    });

    const byType = await prisma.commission.groupBy({
      by: ["type"],
      _count: { id: true },
      _sum: { amount: true },
    });

    console.log(`   Total Records: ${stats._count.id}`);
    console.log(
      `   Total Amount: ₹${stats._sum.amount?.toLocaleString() || 0}`
    );

    byType.forEach((t) => {
      console.log(
        `   ${t.type}: ${t._count.id} records, ₹${
          t._sum.amount?.toLocaleString() || 0
        }`
      );
    });

    console.log("\n" + "=".repeat(60));
    console.log("                    VERIFICATION COMPLETE");
    console.log("=".repeat(60) + "\n");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCalculation();
