// src/services/payment.service.js
import { prisma } from '../prisma.js';
import { createCommissionForWO } from './commission.service.js';
import { notifyPaymentVerified } from './notification.service.js';

// 🚩 Technician uploads payment proof (multipart/form-data)
export const uploadPaymentProof = async (paymentData, file, technicianId) => {
  const { woId, amount, method, transactionRef } = paymentData;

  const proofUrl = file ? `/uploads/${file.filename}` : null;

  const workOrder = await prisma.workOrder.findUnique({
    where: { id: Number(woId) },
  });

  if (!workOrder) {
    throw new Error('Work Order not found');
  }

  if (workOrder.technicianId !== technicianId) {
    throw new Error('This WO does not belong to you');
  }

  if (workOrder.status !== 'COMPLETED_PENDING_PAYMENT') {
    throw new Error('WO is not in COMPLETED_PENDING_PAYMENT status');
  }

  const payment = await prisma.payment.create({
    data: {
      woId: Number(woId),
      technicianId,
      amount: Number(amount),
      method,
      transactionRef,
      proofUrl,
      status: 'PENDING_VERIFICATION',
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: technicianId,
      action: 'PAYMENT_PROOF_UPLOADED',
      entityType: 'PAYMENT',
      entityId: payment.id,
    },
  });

  return payment;
};

// 🚩 Dispatcher/Admin verifies or rejects payment
export const processPaymentVerification = async (paymentId, action, reason, verifierId) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { workOrder: true },
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  if (payment.status !== 'PENDING_VERIFICATION') {
    throw new Error('Payment already processed');
  }

  let updatedPayment;

  if (action === 'APPROVE') {
    // 1) Update payment
    updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'VERIFIED',
        verifiedById: verifierId,
        verifiedAt: new Date(),
      },
    });

    // 2) Update WO status
    await prisma.workOrder.update({
      where: { id: payment.workOrder.id },
      data: {
        status: 'PAID_VERIFIED',
        paidVerifiedAt: new Date(),
      },
    });

    // 3) Auto create commission / bonus
    await createCommissionForWO(payment.workOrder.id, paymentId);

    // 4) Notify technician
    if (payment.technicianId) {
      await notifyPaymentVerified(payment.technicianId, payment.workOrder, updatedPayment);
    }
  } else if (action === 'REJECT') {
    updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'REJECTED',
        rejectedReason: reason || 'No reason provided',
        verifiedById: verifierId,
        verifiedAt: new Date(),
      },
    });
  } else {
    throw new Error('Invalid action, use APPROVE or REJECT');
  }

  await prisma.auditLog.create({
    data: {
      userId: verifierId,
      action: 'PAYMENT_VERIFIED',
      entityType: 'PAYMENT',
      entityId: payment.id,
      metadataJson: JSON.stringify({ action, reason }),
    },
  });

  return updatedPayment;
};
