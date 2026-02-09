/** @format */

// src/controllers/payment.controller.js
import { prisma } from "../prisma.js";
import { createCommissionForWO } from "../services/commission.service.js";
import { notifyPaymentVerified } from "../services/notification.service.js";
import { uploadImageToService } from "../utils/imageUpload.js";

export const getAllPayments = async (req, res, next) => {
  try {
    const {
      status,
      woId,
      technicianId,
      method,
      page = 1,
      limit = 10,
    } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (woId) where.woId = Number(woId);
    if (technicianId) where.technicianId = Number(technicianId);
    if (method) where.method = method;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          workOrder: {
            select: {
              id: true,
              woNumber: true,
              status: true,
              customer: {
                select: { id: true, name: true, phone: true },
              },
            },
          },
          technician: {
            select: { id: true, name: true, phone: true },
          },
          verifiedBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: Number(offset),
        take: Number(limit),
      }),
      prisma.payment.count({ where }),
    ]);

    return res.json({
      payments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getPaymentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id: Number(id) },
      include: {
        workOrder: {
          include: {
            customer: {
              select: { id: true, name: true, phone: true, email: true },
            },
            technician: {
              select: { id: true, name: true, phone: true },
            },
            category: true,
            service: true,
            subservice: {
              select: {
                id: true,
                name: true,
                baseRate: true,
              },
            },
          },
        },
        technician: {
          select: { id: true, name: true, phone: true },
        },
        verifiedBy: {
          select: { id: true, name: true, phone: true },
        },
        commissions: {
          select: {
            id: true,
            type: true,
            amount: true,
            status: true,
          },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    return res.json(payment);
  } catch (err) {
    next(err);
  }
};

export const uploadPaymentProof = async (req, res, next) => {
  try {
    const { woId, method, transactionRef, amount: manualAmount } = req.body;
    const technicianId = req.user.id;

    if (!woId || !method) {
      return res.status(400).json({ message: "woId and method are required" });
    }

    // Fetch work order with service pricing details
    const wo = await prisma.workOrder.findUnique({
      where: { id: Number(woId) },
      include: {
        service: true, // Get service pricing
        category: true,
        subservice: {
          select: {
            id: true,
            name: true,
            baseRate: true,
          },
        },
      },
    });

    if (!wo) {
      return res.status(404).json({ message: "Work Order not found" });
    }

    if (wo.status !== "COMPLETED_PENDING_PAYMENT") {
      return res
        .status(400)
        .json({ message: "Work Order is not completed yet" });
    }

    // Auto-fetch amount from service pricing or use manual override
    let finalAmount;

    if (manualAmount) {
      // Manual amount provided (for custom pricing)
      finalAmount = Number(manualAmount);
      console.log(
        `💰 Using manual amount: ₹${finalAmount} for WO ${wo.woNumber}`,
      );
    } else if (wo.subservice?.baseRate) {
      // Auto-fetch from subservice base rate
      finalAmount = wo.subservice.baseRate;
      console.log(
        `💰 Auto-fetched amount from subservice: ₹${finalAmount} for ${wo.subservice.name}`,
      );
    } else {
      return res.status(400).json({
        message: "No service pricing found. Please provide amount manually.",
        serviceInfo: {
          category: wo.category?.name,
          subservice: wo.subservice?.name,
          service: wo.service?.name,
        },
      });
    }

    // Upload image to external service (optional)
    let proofUrl = null;
    if (req.file) {
      proofUrl = await uploadImageToService(req.file);
    }

    const payment = await prisma.payment.create({
      data: {
        woId: Number(woId),
        technicianId,
        amount: finalAmount,
        method,
        transactionRef,
        ...(proofUrl && { proofUrl }),
        status: "PENDING_VERIFICATION",
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: technicianId,
        action: "PAYMENT_UPLOADED",
        entityType: "PAYMENT",
        entityId: payment.id,
      },
    });

    return res.status(201).json(payment);
  } catch (err) {
    next(err);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const paymentId = Number(req.params.id);
    const { action, reason } = req.body;
    const verifierId = req.user.id;

    if (!action || !["APPROVE", "REJECT"].includes(action)) {
      return res
        .status(400)
        .json({ message: "Action must be APPROVE or REJECT" });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { workOrder: true },
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.status !== "PENDING_VERIFICATION") {
      return res.status(400).json({ message: "Payment already verified" });
    }

    if (action === "APPROVE") {
      const updatedPayment = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: "VERIFIED",
          verifiedById: verifierId,
          verifiedAt: new Date(),
        },
      });

      await prisma.workOrder.update({
        where: { id: payment.woId },
        data: {
          status: "PAID_VERIFIED",
          paidVerifiedAt: new Date(),
        },
      });

      const wo = payment.workOrder;

      if (!payment.amount || payment.amount <= 0) {
        return res.status(400).json({
          message: "Payment amount is invalid or missing",
          paymentId: payment.id,
          amount: payment.amount,
        });
      }

      // Commission = total verified payment amount for WO × rate (handles single or multiple payments; updates existing if needed)
      await createCommissionForWO(wo.id, payment.id);

      const commission = await prisma.commission.findFirst({
        where: { woId: wo.id },
      });

      await prisma.auditLog.create({
        data: {
          userId: verifierId,
          action: "PAYMENT_VERIFIED",
          entityType: "PAYMENT",
          entityId: payment.id,
        },
      });

      try {
        await notifyPaymentVerified(wo.technicianId, wo, updatedPayment);
      } catch (notificationError) {
        console.log(
          "Notification failed (non-critical):",
          notificationError.message,
        );
      }

      return res.json({
        success: true,
        message: "Payment verified successfully",
        payment: updatedPayment,
        earnings: commission
          ? {
              type: commission.type,
              rate: commission.rate,
              ratePercentage: commission.rate * 100,
              amount: commission.amount,
            }
          : null,
      });
    } else {
      const updatedPayment = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: "REJECTED",
          rejectedReason: reason,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: verifierId,
          action: "PAYMENT_REJECTED",
          entityType: "PAYMENT",
          entityId: payment.id,
          metadataJson: JSON.stringify({ reason }),
        },
      });

      return res.json(updatedPayment);
    }
  } catch (err) {
    next(err);
  }
};

export const getPaymentStats = async (req, res, next) => {
  try {
    const [
      pendingUpload,
      awaitingVerification,
      verified,
      rejected,
      totalCommissions,
    ] = await Promise.all([
      // Pending Upload - payments with PENDING_UPLOAD or PENDING status
      // (regardless of proofUrl to match list filter)
      prisma.payment.count({
        where: {
          status: { in: ["PENDING_UPLOAD", "PENDING"] },
        },
      }),

      // Awaiting Verification - PENDING_VERIFICATION status
      // (matches list filter: status=PENDING_VERIFICATION)
      prisma.payment.count({
        where: {
          status: "PENDING_VERIFICATION",
        },
      }),

      // Verified - payments that are verified
      // (matches list filter: status=VERIFIED)
      prisma.payment.count({
        where: {
          status: "VERIFIED",
        },
      }),

      // Rejected - payments that are rejected
      // (matches list filter: status=REJECTED)
      prisma.payment.count({
        where: {
          status: "REJECTED",
        },
      }),

      // Total Commissions (from verified payments)
      prisma.commission.aggregate({
        where: {
          status: "PAID",
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    return res.json({
      pendingUpload,
      awaitingVerification,
      verified,
      rejected,
      totalCommissions: totalCommissions._sum.amount || 0,
    });
  } catch (err) {
    next(err);
  }
};
