/** @format */

// src/controllers/payout.controller.js
import { prisma } from "../prisma.js";

/**
 * Get Payout Summary - Admin Dashboard
 * Shows overview of pending commissions, early payout requests, next payout date, and total paid
 */
export const getPayoutSummary = async (req, res, next) => {
  try {
    // Get pending commissions (EARNED status, not yet paid)
    const pendingCommissions = await prisma.commission.aggregate({
      where: {
        status: "EARNED",
        payoutId: null,
      },
      _sum: { amount: true },
      _count: true,
    });

    // Get early payout requests (PENDING status)
    const earlyPayoutRequests = await prisma.payoutRequest.aggregate({
      where: {
        status: "PENDING",
      },
      _sum: { amount: true },
      _count: true,
    });

    // Get total paid this month
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );
    const paidThisMonth = await prisma.payout.aggregate({
      where: {
        status: "COMPLETED",
        processedAt: { gte: startOfMonth },
      },
      _sum: { totalAmount: true },
      _count: true,
    });

    // Calculate next payout date (next Monday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextPayoutDate = new Date(today);
    nextPayoutDate.setDate(today.getDate() + daysUntilMonday);

    return res.json({
      pendingCommissions: {
        amount: pendingCommissions._sum.amount || 0,
        count: pendingCommissions._count || 0,
      },
      earlyPayoutRequests: {
        amount: earlyPayoutRequests._sum.amount || 0,
        count: earlyPayoutRequests._count || 0,
      },
      nextPayoutDate: nextPayoutDate.toISOString().split("T")[0],
      nextPayoutDay: "Weekly Monday",
      totalPaidThisMonth: {
        amount: paidThisMonth._sum.totalAmount || 0,
        count: paidThisMonth._count || 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Pending Commissions & Bonuses
 * List all verified payments that are ready for payout
 */
export const getPendingCommissions = async (req, res, next) => {
  try {
    const { type, search } = req.query; // type: COMMISSION, BONUS, or all

    const where = {
      status: "EARNED",
      payoutId: null,
    };

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
            role: true,
          },
        },
        workOrder: {
          select: {
            woNumber: true,
            service: { select: { name: true } },
            category: { select: { name: true } },
            subservice: { select: { name: true } },
          },
        },
        payment: {
          select: {
            amount: true,
            method: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Filter by search if provided
    let filtered = commissions;
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = commissions.filter(
        (c) =>
          c.technician?.name?.toLowerCase().includes(searchLower) ||
          c.workOrder?.woNumber?.toLowerCase().includes(searchLower),
      );
    }

    const formatted = filtered.map((commission) => ({
      id: commission.id,
      workOrder: commission.workOrder?.woNumber || "N/A",
      technician: commission.technician?.name || "N/A",
      technicianId: commission.technicianId,
      type: commission.type,
      service:
        commission.workOrder?.subservice?.name ||
        commission.workOrder?.service?.name ||
        commission.workOrder?.category?.name ||
        "Service",
      payment: commission.payment?.amount || 0,
      rate: commission.rate,
      amount: commission.amount,
      date: commission.createdAt,
    }));

    return res.json(formatted);
  } catch (err) {
    next(err);
  }
};

/**
 * Get Early Payout Requests
 * List all pending early payout requests from technicians
 */
export const getEarlyPayoutRequests = async (req, res, next) => {
  try {
    const requests = await prisma.payoutRequest.findMany({
      where: {
        status: "PENDING",
      },
      include: {
        technician: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formatted = requests.map((req) => ({
      id: req.id,
      technician: req.technician?.name || "N/A",
      technicianId: req.technicianId,
      amount: req.amount,
      reason: req.reason,
      paymentMethod: req.paymentMethod,
      requestedAt: req.createdAt,
    }));

    return res.json(formatted);
  } catch (err) {
    next(err);
  }
};

/**
 * Create Weekly Payout Batch
 * Creates a payout batch for all pending commissions
 */
export const createWeeklyBatch = async (req, res, next) => {
  try {
    const adminId = req.user.id;

    // Get all pending commissions
    const pendingCommissions = await prisma.commission.findMany({
      where: {
        status: "EARNED",
        payoutId: null,
      },
      include: {
        technician: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (pendingCommissions.length === 0) {
      return res.status(400).json({
        message: "No pending commissions to process",
      });
    }

    // Group by technician
    const technicianGroups = {};
    pendingCommissions.forEach((commission) => {
      if (!technicianGroups[commission.technicianId]) {
        technicianGroups[commission.technicianId] = {
          technician: commission.technician,
          commissions: [],
          totalAmount: 0,
        };
      }
      technicianGroups[commission.technicianId].commissions.push(commission);
      // Round to 2 decimal places to avoid floating-point precision issues
      technicianGroups[commission.technicianId].totalAmount =
        Math.round(
          (technicianGroups[commission.technicianId].totalAmount +
            commission.amount) *
            100,
        ) / 100;
    });

    // Calculate next Monday
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    nextMonday.setHours(0, 0, 0, 0);

    // Create payouts for each technician
    const payouts = [];
    for (const techId in technicianGroups) {
      const group = technicianGroups[techId];

      const payout = await prisma.payout.create({
        data: {
          technicianId: parseInt(techId),
          totalAmount: group.totalAmount,
          type: "WEEKLY",
          status: "SCHEDULED",
          requestedAt: nextMonday,
          createdById: adminId,
        },
      });

      // Update commissions to link to this payout
      await prisma.commission.updateMany({
        where: {
          id: { in: group.commissions.map((c) => c.id) },
        },
        data: {
          payoutId: payout.id,
          status: "PENDING_PAYOUT",
        },
      });

      payouts.push({
        id: payout.id,
        technician: group.technician.name,
        amount: group.totalAmount,
        commissionCount: group.commissions.length,
      });
    }

    return res.status(201).json({
      message: "Weekly payout batch created successfully",
      scheduledFor: nextMonday.toISOString().split("T")[0],
      // Round to 2 decimal places to avoid floating-point precision issues
      totalAmount:
        Math.round(
          Object.values(technicianGroups).reduce(
            (sum, g) => sum + g.totalAmount,
            0,
          ) * 100,
        ) / 100,
      totalCommissions: pendingCommissions.length,
      payouts,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Payout Batches
 * List all payout batches with their status
 */
export const getPayoutBatches = async (req, res, next) => {
  try {
    const { status } = req.query; // SCHEDULED, COMPLETED, FAILED

    const where = {};
    if (status) {
      where.status = status;
    }

    const batches = await prisma.payout.findMany({
      where,
      include: {
        technician: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        commissions: {
          select: {
            id: true,
            amount: true,
          },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formatted = batches.map((batch) => ({
      id: batch.id,
      technician: batch.technician?.name || "N/A",
      technicianId: batch.technicianId,
      totalAmount: batch.totalAmount,
      commissionsCount: batch.commissions.length,
      type: batch.type,
      status: batch.status,
      scheduledFor: batch.requestedAt,
      processedAt: batch.processedAt,
      createdBy: batch.createdBy?.name || "System",
      createdAt: batch.createdAt,
    }));

    return res.json(formatted);
  } catch (err) {
    next(err);
  }
};

/**
 * Get Payout History
 * List all completed payouts with details
 */
export const getPayoutHistory = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {
      status: "COMPLETED",
    };

    if (startDate || endDate) {
      where.processedAt = {};
      if (startDate) {
        where.processedAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.processedAt.lte = new Date(endDate);
      }
    }

    const history = await prisma.payout.findMany({
      where,
      include: {
        technician: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        commissions: {
          select: {
            id: true,
            amount: true,
            type: true,
          },
        },
      },
      orderBy: {
        processedAt: "desc",
      },
    });

    const formatted = history.map((payout) => ({
      id: payout.id,
      technician: payout.technician?.name || "N/A",
      technicianId: payout.technicianId,
      totalAmount: payout.totalAmount,
      commissionsCount: payout.commissions.length,
      type: payout.type,
      processedAt: payout.processedAt,
      createdAt: payout.createdAt,
    }));

    return res.json(formatted);
  } catch (err) {
    next(err);
  }
};

/**
 * Process Payout Batch
 * Mark a scheduled payout batch as completed and deduct from wallet
 */
export const processPayoutBatch = async (req, res, next) => {
  try {
    const { id } = req.params;

    const payout = await prisma.payout.findUnique({
      where: { id: Number(id) },
      include: {
        commissions: true,
        technician: {
          include: {
            wallet: true,
          },
        },
      },
    });

    if (!payout) {
      return res.status(404).json({ message: "Payout batch not found" });
    }

    if (payout.status === "COMPLETED") {
      return res.status(400).json({ message: "Payout already completed" });
    }

    // Check wallet exists
    const wallet = payout.technician?.wallet;
    if (!wallet) {
      return res.status(400).json({
        message: "Technician wallet not found",
        technicianId: payout.technicianId,
      });
    }

    // Check sufficient balance
    if (wallet.balance < payout.totalAmount) {
      return res.status(400).json({
        message: "Insufficient wallet balance for payout",
        requested: payout.totalAmount,
        available: wallet.balance,
      });
    }

    // Update payout status
    const updated = await prisma.payout.update({
      where: { id: Number(id) },
      data: {
        status: "COMPLETED",
        processedAt: new Date(),
      },
    });

    // Update all commissions to PAID
    await prisma.commission.updateMany({
      where: { payoutId: Number(id) },
      data: { status: "PAID" },
    });

    // ✅ CRITICAL FIX: Deduct from wallet balance
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: { decrement: payout.totalAmount },
      },
    });

    // ✅ CRITICAL FIX: Create wallet transaction (DEBIT)
    const walletTransaction = await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        technicianId: payout.technicianId,
        type: "DEBIT",
        sourceType: "PAYOUT",
        sourceId: payout.id,
        amount: payout.totalAmount,
        description: `Weekly payout batch processed`,
      },
    });

    // ✅ Send notification to technician
    const { notifyCommissionPaid } =
      await import("../services/notification.service.js");
    await notifyCommissionPaid(payout.technicianId, payout);

    // Get the payout with full details to return
    const payoutWithDetails = await prisma.payout.findUnique({
      where: { id: Number(id) },
      include: {
        commissions: {
          include: {
            workOrder: {
              select: {
                woNumber: true,
                completedAt: true,
                customer: { select: { name: true } },
                category: { select: { name: true } },
                service: { select: { name: true } },
                subservice: { select: { name: true } },
              },
            },
            payment: {
              select: { amount: true, method: true },
            },
          },
        },
      },
    });

    return res.json({
      message: "Payout batch processed successfully",
      payout: {
        id: updated.id,
        technicianId: updated.technicianId,
        totalAmount: updated.totalAmount,
        type: updated.type,
        status: updated.status,
        processedAt: updated.processedAt,
        createdAt: updated.createdAt,
      },
      walletDeducted: payout.totalAmount,
      walletTransaction: {
        id: walletTransaction.id,
        type: walletTransaction.type,
        amount: walletTransaction.amount,
        description: walletTransaction.description,
        createdAt: walletTransaction.createdAt,
      },
      details:
        payoutWithDetails?.commissions.map((commission) => ({
          id: commission.id,
          woNumber: commission.workOrder?.woNumber || "N/A",
          serviceName:
            commission.workOrder?.subservice?.name ||
            commission.workOrder?.service?.name ||
            commission.workOrder?.category?.name ||
            "Service",
          customerName: commission.workOrder?.customer?.name || "N/A",
          completedAt: commission.workOrder?.completedAt,
          paymentAmount: commission.payment?.amount || 0,
          commissionType: commission.type,
          commissionRate: commission.rate,
          commissionAmount: commission.amount,
        })) || [],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Mark Payout Batch as Paid
 * Simple endpoint to mark a batch as PAID after admin has confirmed payment externally
 * This is for cases where payment is done outside the system (bank transfer, cash, etc.)
 */
export const markBatchPaid = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const { paymentReference, paymentMethod, notes } = req.body;

    const payout = await prisma.payout.findUnique({
      where: { id: Number(id) },
      include: {
        commissions: true,
        technician: {
          select: {
            id: true,
            name: true,
            phone: true,
            wallet: true,
          },
        },
      },
    });

    if (!payout) {
      return res.status(404).json({ message: "Payout batch not found" });
    }

    if (payout.status === "COMPLETED" || payout.status === "PAID") {
      return res.status(400).json({
        message: "Payout batch already marked as paid",
        status: payout.status,
        processedAt: payout.processedAt,
      });
    }

    // Update payout status to COMPLETED (PAID)
    const updated = await prisma.payout.update({
      where: { id: Number(id) },
      data: {
        status: "COMPLETED",
        processedAt: new Date(),
      },
    });

    // Update all commissions to PAID status
    await prisma.commission.updateMany({
      where: { payoutId: Number(id) },
      data: { status: "PAID" },
    });

    // Deduct from wallet if exists
    const wallet = payout.technician?.wallet;
    let walletTransaction = null;

    if (wallet && wallet.balance >= payout.totalAmount) {
      // Deduct from wallet balance
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: payout.totalAmount },
        },
      });

      // Create wallet transaction (DEBIT)
      walletTransaction = await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          technicianId: payout.technicianId,
          type: "DEBIT",
          sourceType: "PAYOUT",
          sourceId: payout.id,
          amount: payout.totalAmount,
          description: `Payout batch #${payout.id} marked as paid${paymentReference ? ` - Ref: ${paymentReference}` : ""}${paymentMethod ? ` via ${paymentMethod}` : ""}`,
        },
      });
    }

    // Create audit log (use user relation and metadataJson; AuditLog has no details field)
    const auditDetails = `Marked payout batch #${payout.id} as paid for ${payout.technician?.name}. Amount: ${payout.totalAmount}${paymentReference ? `. Reference: ${paymentReference}` : ""}${notes ? `. Notes: ${notes}` : ""}`;
    await prisma.auditLog.create({
      data: {
        ...(adminId && { user: { connect: { id: adminId } } }),
        action: "PAYOUT_MARKED_PAID",
        entityType: "PAYOUT",
        entityId: payout.id,
        metadataJson: JSON.stringify({ details: auditDetails }),
      },
    });

    // Send notification to technician
    try {
      const { notifyCommissionPaid } =
        await import("../services/notification.service.js");
      await notifyCommissionPaid(payout.technicianId, payout);
    } catch (notifyError) {
      console.error("Failed to send payout notification:", notifyError);
    }

    console.log(
      `💰 Admin ${adminId} marked payout batch #${payout.id} as PAID for ${payout.technician?.name}`,
    );

    return res.json({
      message: "Payout batch marked as paid successfully",
      payout: {
        id: updated.id,
        technicianId: updated.technicianId,
        technicianName: payout.technician?.name,
        totalAmount: updated.totalAmount,
        commissionsCount: payout.commissions.length,
        type: updated.type,
        status: updated.status,
        processedAt: updated.processedAt,
        createdAt: updated.createdAt,
      },
      walletDeducted: walletTransaction ? payout.totalAmount : 0,
      walletTransaction: walletTransaction
        ? {
            id: walletTransaction.id,
            type: walletTransaction.type,
            amount: walletTransaction.amount,
          }
        : null,
      paymentReference: paymentReference || null,
      paymentMethod: paymentMethod || null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Approve Early Payout Request
 * Early payout is a cash advance against the technician's wallet balance
 * Wallet balance = accumulated earnings that haven't been paid out yet
 */
export const approveEarlyPayout = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const request = await prisma.payoutRequest.findUnique({
      where: { id: Number(id) },
      include: {
        technician: {
          include: {
            wallet: true,
          },
        },
      },
    });

    if (!request) {
      return res.status(404).json({ message: "Payout request not found" });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({ message: "Request already processed" });
    }

    // Check wallet exists and has sufficient balance
    const wallet = request.technician?.wallet;
    if (!wallet) {
      return res.status(400).json({ message: "Technician wallet not found" });
    }

    if (wallet.balance < request.amount) {
      return res.status(400).json({
        message: "Insufficient wallet balance for early payout",
        requested: request.amount,
        available: wallet.balance,
      });
    }

    // Create early payout record
    const payout = await prisma.payout.create({
      data: {
        technicianId: request.technicianId,
        totalAmount: request.amount,
        type: "EARLY",
        status: "COMPLETED",
        processedAt: new Date(),
        createdById: adminId,
      },
    });

    // Try to link any unlinked EARNED commissions to this payout (optional, for tracking)
    const earnedCommissions = await prisma.commission.findMany({
      where: {
        technicianId: request.technicianId,
        status: "EARNED",
        payoutId: null,
      },
      orderBy: { createdAt: "asc" },
    });

    // Link commissions up to the requested amount (for audit purposes)
    if (earnedCommissions.length > 0) {
      let remaining = request.amount;
      const commissionsToUpdate = [];

      for (const commission of earnedCommissions) {
        if (remaining <= 0) break;
        commissionsToUpdate.push(commission.id);
        remaining -= commission.amount;
      }

      if (commissionsToUpdate.length > 0) {
        await prisma.commission.updateMany({
          where: { id: { in: commissionsToUpdate } },
          data: {
            payoutId: payout.id,
            status: "PAID",
          },
        });
      }
    }

    // Deduct from wallet balance
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: { decrement: request.amount },
      },
    });

    // Create wallet transaction (DEBIT)
    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        technicianId: request.technicianId,
        type: "DEBIT",
        sourceType: "PAYOUT",
        sourceId: payout.id,
        amount: request.amount,
        description: `Early payout - ${request.paymentMethod || "Cash"}`,
      },
    });

    // Update request status
    await prisma.payoutRequest.update({
      where: { id: Number(id) },
      data: {
        status: "APPROVED",
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });

    // ✅ Send notification to technician
    const { notifyCommissionPaid } =
      await import("../services/notification.service.js");
    await notifyCommissionPaid(request.technicianId, payout);

    // Get the payout with full details to return
    const payoutWithDetails = await prisma.payout.findUnique({
      where: { id: payout.id },
      include: {
        commissions: {
          include: {
            workOrder: {
              select: {
                woNumber: true,
                completedAt: true,
                customer: { select: { name: true } },
                category: { select: { name: true } },
                service: { select: { name: true } },
                subservice: { select: { name: true } },
              },
            },
            payment: {
              select: { amount: true, method: true },
            },
          },
        },
      },
    });

    // Get wallet transaction for this payout
    const walletTransaction = await prisma.walletTransaction.findFirst({
      where: {
        technicianId: request.technicianId,
        sourceType: "PAYOUT",
        sourceId: payout.id,
      },
    });

    return res.json({
      message: "Early payout request approved and processed",
      payout: {
        id: payout.id,
        technicianId: payout.technicianId,
        totalAmount: payout.totalAmount,
        type: payout.type,
        status: payout.status,
        processedAt: payout.processedAt,
        createdAt: payout.createdAt,
      },
      walletDeducted: request.amount,
      walletTransaction: walletTransaction
        ? {
            id: walletTransaction.id,
            type: walletTransaction.type,
            amount: walletTransaction.amount,
            description: walletTransaction.description,
            createdAt: walletTransaction.createdAt,
          }
        : null,
      details:
        payoutWithDetails?.commissions.map((commission) => ({
          id: commission.id,
          woNumber: commission.workOrder?.woNumber || "N/A",
          serviceName:
            commission.workOrder?.subservice?.name ||
            commission.workOrder?.service?.name ||
            commission.workOrder?.category?.name ||
            "Service",
          customerName: commission.workOrder?.customer?.name || "N/A",
          completedAt: commission.workOrder?.completedAt,
          paymentAmount: commission.payment?.amount || 0,
          commissionType: commission.type,
          commissionRate: commission.rate,
          commissionAmount: commission.amount,
        })) || [],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Reject Early Payout Request
 */
export const rejectEarlyPayout = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const updated = await prisma.payoutRequest.update({
      where: { id: Number(id) },
      data: {
        status: "REJECTED",
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });

    return res.json({
      message: "Early payout request rejected",
      request: updated,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Payout by ID with Details
 * Returns payout with all included commissions and wallet transaction
 */
export const getPayoutById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const payout = await prisma.payout.findUnique({
      where: { id: Number(id) },
      include: {
        technician: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
          },
        },
        commissions: {
          include: {
            workOrder: {
              select: {
                woNumber: true,
                completedAt: true,
                customer: {
                  select: { name: true },
                },
                category: {
                  select: { name: true },
                },
                service: {
                  select: { name: true },
                },
                subservice: {
                  select: { name: true },
                },
              },
            },
            payment: {
              select: {
                amount: true,
                method: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!payout) {
      return res.status(404).json({ message: "Payout not found" });
    }

    // Get wallet transaction for this payout
    const walletTransaction = await prisma.walletTransaction.findFirst({
      where: {
        technicianId: payout.technicianId,
        sourceType: "PAYOUT",
        sourceId: payout.id,
      },
    });

    // Format the response with details
    const formatted = {
      id: payout.id,
      technician: {
        id: payout.technician?.id,
        name: payout.technician?.name,
        phone: payout.technician?.phone,
        role: payout.technician?.role,
      },
      totalAmount: payout.totalAmount,
      type: payout.type,
      status: payout.status,
      requestedAt: payout.requestedAt,
      processedAt: payout.processedAt,
      createdBy: payout.createdBy?.name || "System",
      createdAt: payout.createdAt,
      walletTransaction: walletTransaction
        ? {
            id: walletTransaction.id,
            type: walletTransaction.type,
            amount: walletTransaction.amount,
            description: walletTransaction.description,
            createdAt: walletTransaction.createdAt,
          }
        : null,
      details: payout.commissions.map((commission) => ({
        id: commission.id,
        woNumber: commission.workOrder?.woNumber || "N/A",
        serviceName:
          commission.workOrder?.subservice?.name ||
          commission.workOrder?.service?.name ||
          commission.workOrder?.category?.name ||
          "Service",
        customerName: commission.workOrder?.customer?.name || "N/A",
        completedAt: commission.workOrder?.completedAt,
        paymentAmount: commission.payment?.amount || 0,
        paymentMethod: commission.payment?.method || "N/A",
        commissionType: commission.type,
        commissionRate: commission.rate,
        commissionAmount: commission.amount,
        status: commission.status,
        createdAt: commission.createdAt,
      })),
      summary: {
        totalCommissions: payout.commissions.length,
        totalAmount: payout.totalAmount,
        averagePerJob:
          payout.commissions.length > 0
            ? Math.round(
                (payout.totalAmount / payout.commissions.length) * 100,
              ) / 100
            : 0,
      },
    };

    return res.json(formatted);
  } catch (err) {
    next(err);
  }
};
