// src/services/report.service.js
import { prisma } from '../prisma.js';

// ✅ Work Order Report
export const getWorkOrderReport = async (filters) => {
  const { startDate, endDate, status, technicianId, categoryId } = filters;

  const where = {};

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }

  if (status) {
    where.status = status;
  }

  if (technicianId) {
    where.technicianId = Number(technicianId);
  }

  if (categoryId) {
    where.categoryId = Number(categoryId);
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
      technician: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      category: true,
      subservice: true,
      service: true,
      payments: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const summary = {
    total: workOrders.length,
    completed: workOrders.filter((w) => w.status === 'PAID_VERIFIED').length,
    inProgress: workOrders.filter((w) => w.status === 'IN_PROGRESS').length,
    pending: workOrders.filter((w) => w.status === 'COMPLETED_PENDING_PAYMENT').length,
    cancelled: workOrders.filter((w) => w.status === 'CANCELLED').length,
  };

  return {
    workOrders,
    summary,
  };
};

// ✅ Commission Report
export const generateCommissionReport = async (filters) => {
  const { startDate, endDate, status, technicianId, type } = filters;

  const where = {};

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }

  if (status) {
    where.status = status;
  }

  if (technicianId) {
    where.technicianId = Number(technicianId);
  }

  if (type) {
    where.type = type;
  }

  const commissions = await prisma.commission.findMany({
    where,
    include: {
      technician: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      workOrder: {
        select: {
          woNumber: true,
          address: true,
        },
      },
      payout: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const summary = {
    total: commissions.reduce((sum, c) => sum + c.amount, 0),
    earned: commissions.filter((c) => c.status === 'EARNED').reduce((sum, c) => sum + c.amount, 0),
    paid: commissions.filter((c) => c.status === 'PAID').reduce((sum, c) => sum + c.amount, 0),
    count: commissions.length,
  };

  return {
    commissions,
    summary,
  };
};

// ✅ Payment Report
export const generatePaymentReport = async (filters) => {
  const { startDate, endDate, status, method } = filters;

  const where = {};

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }

  if (status) {
    where.status = status;
  }

  if (method) {
    where.method = method;
  }

  const payments = await prisma.payment.findMany({
    where,
    include: {
      workOrder: {
        select: {
          woNumber: true,
          address: true,
        },
      },
      technician: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      verifiedBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const summary = {
    total: payments.reduce((sum, p) => sum + p.amount, 0),
    verified: payments.filter((p) => p.status === 'VERIFIED').reduce((sum, p) => sum + p.amount, 0),
    pending: payments.filter((p) => p.status === 'PENDING_VERIFICATION').reduce((sum, p) => sum + p.amount, 0),
    rejected: payments.filter((p) => p.status === 'REJECTED').reduce((sum, p) => sum + p.amount, 0),
    count: payments.length,
  };

  return {
    payments,
    summary,
  };
};

// ✅ Technician Performance Report
export const generateTechnicianPerformance = async (filters) => {
  const { startDate, endDate } = filters;

  const where = {
    role: { in: ['TECH_INTERNAL', 'TECH_FREELANCER'] },
  };

  const technicians = await prisma.user.findMany({
    where,
    include: {
      technicianProfile: true,
      technicianWOs: {
        where: {
          status: 'PAID_VERIFIED',
          ...(startDate || endDate
            ? {
                completedAt: {
                  ...(startDate ? { gte: new Date(startDate) } : {}),
                  ...(endDate ? { lte: new Date(endDate) } : {}),
                },
              }
            : {}),
        },
      },
      commissions: {
        where: {
          status: 'PAID',
          ...(startDate || endDate
            ? {
                createdAt: {
                  ...(startDate ? { gte: new Date(startDate) } : {}),
                  ...(endDate ? { lte: new Date(endDate) } : {}),
                },
              }
            : {}),
        },
      },
      wallet: true,
    },
  });

  const performance = technicians.map((tech) => ({
    id: tech.id,
    name: tech.name,
    phone: tech.phone,
    role: tech.role,
    isBlocked: tech.isBlocked,
    completedJobs: tech.technicianWOs.length,
    totalEarnings: tech.commissions.reduce((sum, c) => sum + c.amount, 0),
    walletBalance: tech.wallet?.balance || 0,
  }));

  return { technicians: performance };
};

// ✅ Financial Summary Report
export const generateFinancialReport = async (filters) => {
  const { startDate, endDate } = filters;

  const dateFilter = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) {
      dateFilter.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.createdAt.lte = new Date(endDate);
    }
  }

  const [totalRevenue, totalCommissions, totalPayouts, pendingPayments] = await Promise.all([
    prisma.payment.aggregate({
      where: {
        status: 'VERIFIED',
        ...dateFilter,
      },
      _sum: { amount: true },
    }),
    prisma.commission.aggregate({
      where: {
        status: { in: ['EARNED', 'PAID'] },
        ...dateFilter,
      },
      _sum: { amount: true },
    }),
    prisma.payout.aggregate({
      where: {
        status: 'PAID',
        ...dateFilter,
      },
      _sum: { totalAmount: true },
    }),
    prisma.payment.aggregate({
      where: {
        status: 'PENDING_VERIFICATION',
        ...dateFilter,
      },
      _sum: { amount: true },
    }),
  ]);

  return {
    totalRevenue: totalRevenue._sum.amount || 0,
    totalCommissions: totalCommissions._sum.amount || 0,
    totalPayouts: totalPayouts._sum.totalAmount || 0,
    pendingPayments: pendingPayments._sum.amount || 0,
    netProfit: (totalRevenue._sum.amount || 0) - (totalCommissions._sum.amount || 0),
  };
};
