/** @format */

import { prisma } from "../prisma.js";

/**
 * Get technician dashboard statistics
 */
export const getTechnicianDashboard = async (technicianId) => {
  const now = new Date();

  // Calculate date ranges
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  // Get all statistics in parallel
  const [
    jobsToday,
    activeJobs,
    completedThisMonth,
    inProgress,
    readyToStart,
    thisWeekCommissions,
    totalEarned,
  ] = await Promise.all([
    // Jobs Today
    prisma.workOrder.count({
      where: {
        technicianId,
        scheduledAt: {
          gte: startOfDay,
        },
      },
    }),

    // Active Jobs (Assigned + In Progress)
    prisma.workOrder.count({
      where: {
        technicianId,
        status: {
          in: ["ASSIGNED", "IN_PROGRESS"],
        },
      },
    }),

    // Completed This Month
    prisma.workOrder.count({
      where: {
        technicianId,
        status: "PAID_VERIFIED",
        completedAt: {
          gte: startOfMonth,
        },
      },
    }),

    // In Progress
    prisma.workOrder.count({
      where: {
        technicianId,
        status: "IN_PROGRESS",
      },
    }),

    // Ready to Start
    prisma.workOrder.count({
      where: {
        technicianId,
        status: "ASSIGNED",
      },
    }),

    // This Week's Bonus/Commission
    prisma.commission.aggregate({
      where: {
        technicianId,
        createdAt: {
          gte: startOfWeek,
        },
        status: {
          in: ["EARNED", "PAID"],
        },
      },
      _sum: {
        amount: true,
      },
    }),

    // Total Earned (all time)
    prisma.commission.aggregate({
      where: {
        technicianId,
        status: {
          in: ["EARNED", "PAID"],
        },
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  return {
    thisWeekBonus: thisWeekCommissions._sum.amount || 0,
    jobsToday,
    thisWeekEarned: thisWeekCommissions._sum.amount || 0,
    totalEarned: totalEarned._sum.amount || 0,
    activeJobs,
    completedThisMonth,
    inProgress,
    readyToStart,
  };
};

/**
 * Get technician's work orders by status
 */
export const getTechnicianJobs = async (technicianId, statusFilter) => {
  const where = {};

  // Map UI status to database statuses
  if (statusFilter === "available") {
    // Available: Unassigned work orders that technicians can claim
    where.technicianId = null;
    where.status = "UNASSIGNED";
  } else {
    // For all other statuses, filter by technicianId
    where.technicianId = technicianId;

    if (statusFilter === "incoming") {
      // Incoming: Newly assigned jobs that haven't been accepted yet
      where.status = "ASSIGNED";
    } else if (statusFilter === "active") {
      // Active: Jobs that are accepted or in progress
      where.status = { in: ["ACCEPTED", "IN_PROGRESS"] };
    } else if (statusFilter === "done") {
      // Done: Completed jobs (all completion statuses)
      where.status = {
        in: ["COMPLETED_PENDING_PAYMENT", "PAID_VERIFIED"],
      };
    }
  }

  const workOrders = await prisma.workOrder.findMany({
    where,
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      subservice: {
        select: {
          id: true,
          name: true,
          baseRate: true,
        },
      },
      service: {
        select: {
          id: true,
          name: true,
        },
      },
      technician: {
        select: {
          technicianProfile: {
            select: {
              commissionRate: true,
              bonusRate: true,
            },
          },
          role: true,
        },
      },
      payments: {
        select: {
          id: true,
          amount: true,
          method: true,
          status: true,
          transactionRef: true,
          createdAt: true,
          verifiedAt: true,
        },
      },
    },
    orderBy: {
      scheduledAt: "asc",
    },
  });

  // Calculate bonus for each work order
  const jobsWithBonus = workOrders.map((wo) => {
    const basePayment = wo.subservice?.baseRate || 0;
    const rate =
      wo.technician?.role === "TECH_FREELANCER"
        ? wo.technician?.technicianProfile?.commissionRate || 0
        : wo.technician?.technicianProfile?.bonusRate || 0;

    const bonusAmount = basePayment * rate;

    return {
      ...wo,
      jobPayment: basePayment,
      bonusRate: rate * 100, // Convert to percentage
      yourBonus: bonusAmount,
    };
  });

  return jobsWithBonus;
};

/**
 * Get technician's active work orders
 */
export const getActiveWorkOrders = async (technicianId, status) => {
  const where = {
    technicianId,
  };

  if (status === "active") {
    where.status = { in: ["ASSIGNED", "IN_PROGRESS"] };
  } else if (status === "in_progress") {
    where.status = "IN_PROGRESS";
  } else if (status === "completed") {
    where.status = "PAID_VERIFIED";
  } else if (status === "ready") {
    where.status = "ASSIGNED";
  }

  const workOrders = await prisma.workOrder.findMany({
    where,
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      category: {
        select: {
          name: true,
        },
      },
      subservice: {
        select: {
          name: true,
        },
      },
      service: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      scheduledAt: "asc",
    },
  });

  return workOrders;
};

/**
 * Get technician's wallet balance
 */
export const getTechnicianWallet = async (technicianId) => {
  const wallet = await prisma.wallet.findUnique({
    where: { technicianId },
    include: {
      transactions: {
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      },
    },
  });

  if (!wallet) {
    throw new Error("Wallet not found for this technician");
  }

  return wallet;
};

/**
 * Get technician's earnings summary
 */
export const getTechnicianEarnings = async (technicianId) => {
  const now = new Date();

  // Calculate date ranges
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59
  );

  // Get technician profile
  const technician = await prisma.user.findUnique({
    where: { id: technicianId },
    include: {
      technicianProfile: {
        select: {
          type: true,
          commissionRate: true,
          bonusRate: true,
          baseSalary: true,
          useCustomRate: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!technician || !technician.technicianProfile) {
    throw new Error("Technician profile not found");
  }

  const profile = technician.technicianProfile;
  const isFreelancer = technician.role === "TECH_FREELANCER";

  const systemConfig = await prisma.systemConfig.findFirst({
    orderBy: { id: "asc" },
  });

  // Statuses that count as "earned" for total bonus and breakdown (include PENDING_PAYOUT so batch-scheduled commissions aren't excluded)
  const EARNED_STATUSES = ["EARNED", "PENDING_PAYOUT", "PAID"];

  // Effective rate: useCustomRate true → profile rate; false → current default (RateStructure → SystemConfig → 0.05)
  const {
    getDefaultCommissionRate,
    getDefaultBonusRate,
  } = await import("./defaultRates.service.js");

  let commissionRate;
  if (profile.useCustomRate && profile.commissionRate != null) {
    commissionRate = profile.commissionRate;
  } else {
    commissionRate = await getDefaultCommissionRate();
  }

  let bonusRate;
  if (profile.useCustomRate && profile.bonusRate != null) {
    bonusRate = profile.bonusRate;
  } else {
    bonusRate = await getDefaultBonusRate();
  }

  // Get all earnings aggregations in parallel
  const [
    todayEarnings,
    weekEarnings,
    monthEarnings,
    lastMonthEarnings,
    totalEarnings,
    weekJobsCount,
    recentBonuses,
    availableEarnings,
    availableJobsCount,
    recentWithdrawals,
    totalWithdrawn,
    wallet,
    pendingPayoutRequests,
  ] = await Promise.all([
    // Today
    prisma.commission.aggregate({
      where: {
        technicianId,
        createdAt: { gte: startOfDay },
        status: { in: EARNED_STATUSES },
      },
      _sum: { amount: true },
    }),

    // This Week
    prisma.commission.aggregate({
      where: {
        technicianId,
        createdAt: { gte: startOfWeek },
        status: { in: EARNED_STATUSES },
      },
      _sum: { amount: true },
    }),

    // This Month
    prisma.commission.aggregate({
      where: {
        technicianId,
        createdAt: { gte: startOfMonth },
        status: { in: EARNED_STATUSES },
      },
      _sum: { amount: true },
    }),

    // Last Month
    prisma.commission.aggregate({
      where: {
        technicianId,
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        status: { in: EARNED_STATUSES },
      },
      _sum: { amount: true },
    }),

    // Total All Time (full amount for all earned/scheduled/paid commissions)
    prisma.commission.aggregate({
      where: {
        technicianId,
        status: { in: EARNED_STATUSES },
      },
      _sum: { amount: true },
    }),

    // This week's jobs count
    prisma.commission.count({
      where: {
        technicianId,
        createdAt: { gte: startOfWeek },
        status: { in: EARNED_STATUSES },
      },
    }),

    // Recent bonuses (last 10)
    prisma.commission.findMany({
      where: {
        technicianId,
        status: { in: EARNED_STATUSES },
      },
      include: {
        workOrder: {
          include: {
            customer: {
              select: { name: true },
            },
            category: {
              select: { name: true },
            },
            service: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    }),

    // Available bonus (only EARNED, not yet paid out)
    prisma.commission.aggregate({
      where: {
        technicianId,
        status: "EARNED",
      },
      _sum: { amount: true },
    }),

    // Available jobs count (only EARNED, not yet paid out)
    prisma.commission.count({
      where: {
        technicianId,
        status: "EARNED",
      },
    }),

    // Recent withdrawals/payouts (DEBIT transactions)
    prisma.walletTransaction.findMany({
      where: {
        technicianId,
        type: "DEBIT",
      },
      include: {
        wallet: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 15,
    }),

    // Total withdrawn amount
    prisma.walletTransaction.aggregate({
      where: {
        technicianId,
        type: "DEBIT",
      },
      _sum: { amount: true },
    }),

    // Get wallet balance (actual available amount)
    prisma.wallet.findUnique({
      where: { technicianId },
    }),
    // Sum of PENDING early payout requests (to reserve from available amount)
    prisma.payoutRequest.aggregate({
      where: {
        technicianId,
        status: "PENDING",
      },
      _sum: { amount: true },
    }),
  ]);

  const today = todayEarnings._sum.amount || 0;
  const thisWeek = weekEarnings._sum.amount || 0;
  const thisMonth = monthEarnings._sum.amount || 0;
  const lastMonth = lastMonthEarnings._sum.amount || 0;
  const totalAllTime = totalEarnings._sum.amount || 0;
  // Use wallet balance as base available amount, then reserve any PENDING payout requests
  const walletBalance = wallet?.balance || 0;
  const pendingReserved = pendingPayoutRequests._sum.amount || 0;
  const availableAmount =
    walletBalance > 0
      ? Math.max(
          0,
          Math.round((walletBalance - pendingReserved) * 100) / 100,
        )
      : 0;
  const totalWithdrawnAmount = totalWithdrawn._sum.amount || 0;

  // Calculate increase rate from last month
  let increaseRate = 0;
  if (lastMonth > 0) {
    increaseRate = ((thisMonth - lastMonth) / lastMonth) * 100;
  } else if (thisMonth > 0) {
    increaseRate = 100; // 100% increase from 0
  }

  // Format recent bonuses
  const formattedBonuses = recentBonuses.map((commission) => ({
    id: commission.id,
    type: "EARNING",
    jobName:
      commission.workOrder?.service?.name ||
      commission.workOrder?.category?.name ||
      "Service",
    customerName: commission.workOrder?.customer?.name || "Customer",
    date: commission.createdAt,
    jobPayment: commission.workOrder?.subservice?.baseRate || 0,
    bonus: commission.amount,
    status: commission.status,
    woNumber: commission.workOrder?.woNumber,
  }));

  // Format recent withdrawals/payouts
  const formattedWithdrawals = recentWithdrawals.map((transaction) => ({
    id: transaction.id,
    type: "WITHDRAWAL",
    description: transaction.description || "Payout",
    sourceType: transaction.sourceType,
    sourceId: transaction.sourceId,
    date: transaction.createdAt,
    amount: transaction.amount,
    status: "COMPLETED",
  }));

  // Build response with role-specific naming
  const earnings = {
    totalBonuses: {
      amount: totalAllTime,
      increaseRate: parseFloat(increaseRate.toFixed(1)),
      increaseText:
        increaseRate >= 0
          ? `+${increaseRate.toFixed(1)}% from last month`
          : `${increaseRate.toFixed(1)}% from last month`,
    },
    breakdown: {
      today: today,
      thisWeek: thisWeek,
      thisWeekPercentage: isFreelancer ? commissionRate * 100 : bonusRate * 100,
      thisMonth: thisMonth,
    },
    availableBonus: {
      amount: availableAmount,
      jobsCount: availableJobsCount,
      jobsText: `${availableJobsCount} job${
        availableJobsCount !== 1 ? "s" : ""
      }`,
      bonusText: `${isFreelancer ? commissionRate * 100 : bonusRate * 100}% ${
        isFreelancer ? "commission" : "bonus"
      }`,
      payoutInfo: "Regular payout: Every Monday",
    },
    // Withdrawal summary
    withdrawalSummary: {
      totalWithdrawn: totalWithdrawnAmount,
      withdrawalCount: recentWithdrawals.length,
    },
    // Role-specific rate display: Freelancers see "commissionRate", Internal see "bonusRate"
    // Show updatedAt based on whether custom rate or system config rate is being used
    ...(isFreelancer
      ? {
          commissionRate: {
            rate: commissionRate,
            ratePercentage: commissionRate * 100,
            type: "Commission",
            description: `Earn ${(commissionRate * 100).toFixed(
              0
            )}% commission on every verified job completion. Commissions are paid every Monday, with early payout available during the week for urgent needs.`,
            updatedAt: profile.useCustomRate
              ? profile.updatedAt
              : systemConfig?.updatedAt || null,
          },
        }
      : {
          bonusRate: {
            rate: bonusRate,
            ratePercentage: bonusRate * 100,
            type: "Bonus",
            description: `Earn ${(bonusRate * 100).toFixed(
              0
            )}% bonus on every verified job completion. Bonuses are paid every Monday, with early payout available during the week for urgent needs.`,
            updatedAt: profile.useCustomRate
              ? profile.updatedAt
              : systemConfig?.updatedAt || null,
          },
        }),
    monthlySalary: {
      baseSalary: profile.baseSalary || 0,
      thisMonthBonus: thisMonth,
      total: (profile.baseSalary || 0) + thisMonth,
      isFreelancer,
    },
    // Role-specific naming: Freelancers see "recentTransactions", Internal staff see "recentBonuses"
    ...(isFreelancer
      ? { recentTransactions: formattedBonuses }
      : { recentBonuses: formattedBonuses }),
    // Withdrawal history for all technicians
    recentWithdrawals: formattedWithdrawals,
  };

  return earnings;
};

/**
 * Get technician work history
 */
export const getWorkHistory = async (technicianId) => {
  // Get all completed work orders for the technician
  const workOrders = await prisma.workOrder.findMany({
    where: {
      technicianId: technicianId,
      status: {
        in: ["COMPLETED", "PAID_VERIFIED"],
      },
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      service: {
        select: {
          id: true,
          name: true,
        },
      },
      subservice: {
        select: {
          id: true,
          name: true,
        },
      },
      payments: {
        select: {
          id: true,
          amount: true,
          status: true,
          verifiedAt: true,
        },
      },
      commissions: {
        select: {
          id: true,
          amount: true,
          status: true,
          createdAt: true,
        },
      },
      review: {
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      completedAt: "desc",
    },
  });

  // Format the work history
  const formattedHistory = workOrders.map((wo) => {
    const payment = wo.payments[0];
    const commission = wo.commissions[0];

    return {
      id: wo.id,
      woNumber: wo.woNumber,
      completedAt: wo.completedAt,
      status: wo.status,
      customer: wo.customer,
      category: wo.category,
      service: wo.service,
      subservice: wo.subservice,
      address: wo.address,
      payment: payment
        ? {
            amount: payment.amount,
            status: payment.status,
            verifiedAt: payment.verifiedAt,
          }
        : null,
      commission: commission
        ? {
            amount: commission.amount,
            status: commission.status,
          }
        : null,
      review: wo.review,
      notes: wo.completionNotes,
    };
  });

  // Calculate summary statistics
  const totalJobs = workOrders.length;
  const totalEarnings = workOrders.reduce((sum, wo) => {
    const commission = wo.commissions[0];
    return sum + (commission?.amount || 0);
  }, 0);
  // Safe division for average rating to avoid NaN
  const reviewedOrders = workOrders.filter((wo) => wo.review);
  const averageRating =
    reviewedOrders.length > 0
      ? reviewedOrders.reduce((sum, wo) => sum + (wo.review?.rating || 0), 0) /
        reviewedOrders.length
      : 0;

  return {
    summary: {
      totalJobs,
      totalEarnings,
      averageRating: averageRating ? parseFloat(averageRating.toFixed(2)) : 0,
      totalReviews: workOrders.filter((wo) => wo.review).length,
    },
    workOrders: formattedHistory,
  };
};
