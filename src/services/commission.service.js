/** @format */

// src/services/commission.service.js
import { prisma } from "../prisma.js";
import { notifyCommissionPaid } from "./notification.service.js";

// auto commission / bonus after WO PAID_VERIFIED
// Commission = (total verified payment amount for the WO) × rate. Same for internal (bonus).
export const createCommissionForWO = async (woId, paymentId) => {
  const wo = await prisma.workOrder.findUnique({
    where: { id: woId },
    include: {
      technician: {
        include: { technicianProfile: true },
      },
      payments: true,
    },
  });

  if (!wo || !wo.technician) return;

  // Base amount = total of ALL VERIFIED payments for this work order (e.g. $300 job → commission on $300)
  const totalVerifiedAmount = wo.payments
    .filter((p) => p.status === "VERIFIED")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  if (totalVerifiedAmount <= 0) return;

  const techProfile = wo.technician.technicianProfile;
  if (!techProfile) return;

  // Get system config for global rates (admin configurable)
  const systemConfig = await prisma.systemConfig.findFirst({
    orderBy: { id: "asc" },
  });

  // Determine type and rate based on technician type
  // Priority: 1. useCustomRate (individual rate), 2. System config rate, 3. Default 0.05
  const isFreelancer = techProfile.type === "FREELANCER";
  const type = isFreelancer ? "COMMISSION" : "BONUS";

  // Get the rate with proper priority: useCustomRate=true → profile rate; useCustomRate=false → profile rate (kept in sync with default from RateStructure/SystemConfig)
  let rate;
  if (isFreelancer) {
    if (
      techProfile.useCustomRate === true &&
      techProfile.commissionRate != null
    ) {
      rate = techProfile.commissionRate;
    } else {
      // Profile rate is kept in sync with default when useCustomRate=false
      rate =
        techProfile.commissionRate ??
        systemConfig?.freelancerCommissionRate ??
        0.05;
    }
  } else {
    if (
      techProfile.useCustomRate === true &&
      techProfile.bonusRate != null
    ) {
      rate = techProfile.bonusRate;
    } else {
      rate =
        techProfile.bonusRate ??
        systemConfig?.internalEmployeeBonusRate ??
        0.05;
    }
  }

  const commissionAmount = Math.round(totalVerifiedAmount * rate * 100) / 100;

  console.log(`📊 Commission Calculation for WO ${wo.woNumber}:`);
  console.log(
    `   Technician: ${wo.technician.name} (${
      isFreelancer ? "FREELANCER" : "INTERNAL"
    })`
  );
  console.log(`   Total Verified Payment Amount: ${totalVerifiedAmount}`);
  console.log(`   Rate: ${rate} (${rate * 100}%)`);
  console.log(
    `   Commission: ${totalVerifiedAmount} × ${rate} = ${commissionAmount}`
  );

  const existing = await prisma.commission.findFirst({
    where: { woId },
  });

  if (existing) {
    const previousAmount = existing.amount;
    const delta = commissionAmount - previousAmount;
    if (delta === 0) return;

    await prisma.commission.update({
      where: { id: existing.id },
      data: { amount: commissionAmount, rate },
    });

    let wallet = await prisma.wallet.findUnique({
      where: { technicianId: wo.technicianId },
    });
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { technicianId: wo.technicianId, balance: 0 },
      });
    }
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: delta } },
    });
    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        technicianId: wo.technicianId,
        type: "CREDIT",
        sourceType: type,
        sourceId: existing.id,
        amount: delta,
        description: `${type === "COMMISSION" ? "Commission" : "Bonus"} adjustment for WO ${wo.woNumber} (total verified amount updated)`,
      },
    });
    return;
  }

  const commission = await prisma.commission.create({
    data: {
      woId,
      technicianId: wo.technicianId,
      type,
      rate,
      amount: commissionAmount,
      status: "EARNED",
      paymentId,
    },
  });

  // Update wallet for both freelancer and internal technicians
  let wallet = await prisma.wallet.findUnique({
    where: { technicianId: wo.technicianId },
  });

  // Create wallet if doesn't exist (for TECH_INTERNAL as well)
  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        technicianId: wo.technicianId,
        balance: 0,
      },
    });
  }

  await prisma.wallet.update({
    where: { id: wallet.id },
    data: {
      balance: { increment: commissionAmount },
    },
  });

  await prisma.walletTransaction.create({
    data: {
      walletId: wallet.id,
      technicianId: wo.technicianId,
      type: "CREDIT",
      sourceType: type === "COMMISSION" ? "COMMISSION" : "BONUS",
      sourceId: commission.id,
      amount: commissionAmount,
      description: `${type === "COMMISSION" ? "Commission" : "Bonus"} for WO ${
        wo.woNumber
      }`,
    },
  });

  return commission;
};

// very simple weekly payout example
export const runWeeklyPayout = async () => {
  const commissions = await prisma.commission.findMany({
    where: { status: "EARNED" },
  });

  const byTech = {};
  for (const c of commissions) {
    if (!byTech[c.technicianId]) byTech[c.technicianId] = [];
    byTech[c.technicianId].push(c);
  }

  const payouts = [];

  for (const [techId, items] of Object.entries(byTech)) {
    // Round to 2 decimal places to avoid floating-point precision issues
    const total =
      Math.round(items.reduce((sum, c) => sum + c.amount, 0) * 100) / 100;

    const payout = await prisma.payout.create({
      data: {
        technicianId: Number(techId),
        totalAmount: total,
        type: "WEEKLY",
        status: "PAID",
        processedAt: new Date(),
      },
    });

    await prisma.commission.updateMany({
      where: { id: { in: items.map((c) => c.id) } },
      data: { status: "PAID", payoutId: payout.id },
    });

    const wallet = await prisma.wallet.findUnique({
      where: { technicianId: Number(techId) },
    });
    if (wallet) {
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: total },
        },
      });

      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          technicianId: Number(techId),
          type: "DEBIT",
          sourceType: "PAYOUT",
          sourceId: payout.id,
          amount: total,
          description: `Weekly payout`,
        },
      });
    }

    payouts.push(payout);

    // Notify technician
    await notifyCommissionPaid(Number(techId), payout);
  }

  return { payoutsCount: payouts.length };
};

// ✅ Get technician commissions/bonuses
export const findTechnicianCommissions = async (technicianId, filters) => {
  const { status } = filters;

  const where = { technicianId };
  if (status) {
    where.status = status;
  }

  const commissions = await prisma.commission.findMany({
    where,
    include: {
      workOrder: {
        select: {
          woNumber: true,
          address: true,
          completedAt: true,
        },
      },
      payout: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Round to 2 decimal places to avoid floating-point precision issues
  const total =
    Math.round(commissions.reduce((sum, c) => sum + c.amount, 0) * 100) / 100;
  const earned =
    Math.round(
      commissions
        .filter((c) => c.status === "EARNED")
        .reduce((sum, c) => sum + c.amount, 0) * 100
    ) / 100;
  const paid =
    Math.round(
      commissions
        .filter((c) => c.status === "PAID")
        .reduce((sum, c) => sum + c.amount, 0) * 100
    ) / 100;

  return {
    commissions,
    summary: {
      total,
      earned,
      paid,
    },
  };
};

// ✅ Request on-demand payout
export const createPayoutRequest = async (technicianId, amount, reason) => {
  if (!amount || amount <= 0) {
    throw new Error("Valid amount is required");
  }

  // Check wallet balance for freelancers
  const user = await prisma.user.findUnique({
    where: { id: technicianId },
    include: {
      wallet: true,
      technicianProfile: true,
    },
  });

  if (user.technicianProfile?.type === "FREELANCER") {
    if (!user.wallet || user.wallet.balance < amount) {
      throw new Error("Insufficient wallet balance");
    }
  }

  const payoutRequest = await prisma.payoutRequest.create({
    data: {
      technicianId,
      amount: Number(amount),
      status: "PENDING",
      reason: reason || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: technicianId,
      action: "PAYOUT_REQUESTED",
      entityType: "PAYOUT_REQUEST",
      entityId: payoutRequest.id,
      metadataJson: JSON.stringify({ amount }),
    },
  });

  return payoutRequest;
};

// ✅ Admin: Review payout request
export const processPayoutRequest = async (
  requestId,
  action,
  reason,
  reviewerId
) => {
  const payoutRequest = await prisma.payoutRequest.findUnique({
    where: { id: requestId },
    include: {
      technician: {
        include: {
          wallet: true,
          technicianProfile: true,
        },
      },
    },
  });

  if (!payoutRequest) {
    throw new Error("Payout request not found");
  }

  if (payoutRequest.status !== "PENDING") {
    throw new Error("Payout request already processed");
  }

  if (action === "APPROVE") {
    // Get earned commissions
    const earnedCommissions = await prisma.commission.findMany({
      where: {
        technicianId: payoutRequest.technicianId,
        status: "EARNED",
      },
    });

    const earnedTotal = earnedCommissions.reduce((sum, c) => sum + c.amount, 0);

    if (earnedTotal < payoutRequest.amount) {
      throw new Error("Insufficient earned commissions");
    }

    // Create payout
    const payout = await prisma.payout.create({
      data: {
        technicianId: payoutRequest.technicianId,
        totalAmount: payoutRequest.amount,
        type: "ON_DEMAND",
        status: "PAID",
        requestedAt: payoutRequest.createdAt,
        processedAt: new Date(),
        createdById: reviewerId,
      },
    });

    // Mark commissions as paid (up to the requested amount)
    let remaining = payoutRequest.amount;
    for (const commission of earnedCommissions) {
      if (remaining <= 0) break;

      await prisma.commission.update({
        where: { id: commission.id },
        data: {
          status: "PAID",
          payoutId: payout.id,
        },
      });

      remaining -= commission.amount;
    }

    // Update wallet for freelancers
    if (payoutRequest.technician.wallet) {
      await prisma.wallet.update({
        where: { id: payoutRequest.technician.wallet.id },
        data: {
          balance: { decrement: payoutRequest.amount },
        },
      });

      await prisma.walletTransaction.create({
        data: {
          walletId: payoutRequest.technician.wallet.id,
          technicianId: payoutRequest.technicianId,
          type: "DEBIT",
          sourceType: "PAYOUT",
          sourceId: payout.id,
          amount: payoutRequest.amount,
          description: "On-demand payout",
        },
      });
    }

    // Update request
    await prisma.payoutRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
    });

    // Notify technician
    await notifyCommissionPaid(payoutRequest.technicianId, payout);

    return { message: "Payout approved and processed", payout };
  } else if (action === "REJECT") {
    await prisma.payoutRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        reason: reason || "No reason provided",
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
    });

    return { message: "Payout request rejected" };
  } else {
    throw new Error("Invalid action, use APPROVE or REJECT");
  }
};

// ✅ Get all payout requests (Admin)
export const findAllPayoutRequests = async (filters) => {
  const { status } = filters;

  const where = {};
  if (status) {
    where.status = status;
  }

  const requests = await prisma.payoutRequest.findMany({
    where,
    include: {
      technician: {
        select: {
          id: true,
          name: true,
          phone: true,
          role: true,
        },
      },
      reviewedBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return requests;
};

// ✅ Get technician dashboard stats
export const getTechnicianDashboard = async (req, res, next) => {
  try {
    const technicianId = req.user.id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      openWOs,
      inProgressWOs,
      completedWOsCount,
      monthlyCommissions,
      wallet,
    ] = await Promise.all([
      prisma.workOrder.findMany({
        where: {
          technicianId,
          status: { in: ["ASSIGNED", "ACCEPTED"] },
        },
        include: {
          category: true,
          subservice: true,
        },
      }),
      prisma.workOrder.findMany({
        where: {
          technicianId,
          status: "IN_PROGRESS",
        },
        include: {
          category: true,
          subservice: true,
        },
      }),
      prisma.workOrder.count({
        where: {
          technicianId,
          status: "PAID_VERIFIED",
        },
      }),
      prisma.commission.aggregate({
        where: {
          technicianId,
          createdAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      prisma.wallet.findUnique({
        where: { technicianId },
      }),
    ]);

    return res.json({
      openWOs,
      inProgressWOs,
      completedWOsCount,
      monthlyCommission: monthlyCommissions._sum.amount || 0,
      walletBalance: wallet?.balance || 0,
    });
  } catch (err) {
    next(err);
  }
};
