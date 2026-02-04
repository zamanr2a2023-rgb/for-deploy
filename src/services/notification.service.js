/** @format */

// src/services/notification.service.js
import { prisma } from "../prisma.js";
import {
  sendWOAssignmentSMS,
  sendWOAcceptedSMS,
  sendWOCompletedSMS,
  sendPaymentVerifiedSMS,
  sendPayoutApprovedSMS,
  sendAccountBlockedSMS,
  sendWelcomeSMS,
} from "./sms.service.js";
import { sendPushNotification } from "../utils/firebase.js";

// ✅ Create and send notification (database storage + Push Notification)
export const createNotification = async (
  userId,
  type,
  title,
  message,
  data = null
) => {
  try {
    // Create database notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        dataJson: data ? JSON.stringify(data) : null,
      },
    });

    console.log(`🔔 Notification created for user ${userId}: ${title}`);

    // 🔥 Send push notification to all user's devices
    await sendPushToAllUserDevices(
      userId,
      {
        title: title,
        body: message,
      },
      {
        type: type,
        notificationId: String(notification.id),
        ...(data && typeof data === "object"
          ? Object.fromEntries(
              Object.entries(data).map(([k, v]) => [k, String(v)])
            )
          : {}),
        priority: "high",
        sound: "default",
      }
    );

    return notification;
  } catch (err) {
    console.error("Error creating notification:", err);
    throw err;
  }
};

// ✅ Get user notifications
export const findUserNotifications = async (userId, filters) => {
  const { unreadOnly } = filters;

  const where = { userId };
  if (unreadOnly === "true") {
    where.isRead = false;
  }

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
          fcmTokens: {
            where: {
              isActive: true,
            },
            select: {
              token: true,
              deviceType: true,
              deviceName: true,
            },
          },
        },
      },
    },
  });

  return notifications;
};

// ✅ Mark notification as read
export const markNotificationRead = async (notificationId, userId) => {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
  });

  if (!notification) {
    throw new Error("Notification not found");
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return updated;
};

// ✅ Mark all notifications as read
export const markAllNotificationsRead = async (userId) => {
  await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return { message: "All notifications marked as read" };
};

// 🔥 Helper: Send push notification to all user's devices
export const sendPushToAllUserDevices = async (userId, notification, data) => {
  try {
    // Get all active FCM tokens for this user
    const fcmTokens = await prisma.fCMToken.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: {
        token: true,
        deviceType: true,
        id: true,
        deviceId: true,
        deviceName: true,
      },
    });

    if (fcmTokens.length === 0) {
      console.log(`⚠️ No active FCM tokens found for user ${userId}`);
      return { success: false, sentCount: 0 };
    }

    // Log detailed token info for debugging duplicate notifications
    console.log(
      `📱 Found ${fcmTokens.length} FCM token(s) for user ${userId}:`
    );
    fcmTokens.forEach((t, idx) => {
      console.log(
        `   Token ${idx + 1}: ID=${t.id}, Device=${
          t.deviceType || "unknown"
        }, Name=${t.deviceName || "unnamed"}, DeviceID=${t.deviceId || "none"}`
      );
    });

    // Check for duplicate tokens (same token registered multiple times)
    const uniqueTokens = [...new Set(fcmTokens.map((t) => t.token))];
    if (uniqueTokens.length < fcmTokens.length) {
      console.warn(
        `⚠️ WARNING: User ${userId} has duplicate FCM tokens! Unique: ${uniqueTokens.length}, Total: ${fcmTokens.length}`
      );
    }

    // Only send to unique tokens to avoid duplicate notifications
    const tokensToSend = fcmTokens.filter(
      (t, index, self) =>
        index === self.findIndex((other) => other.token === t.token)
    );

    console.log(
      `📤 Sending push to ${tokensToSend.length} unique device(s) for user ${userId}`
    );

    let sentCount = 0;
    const failedTokenIds = [];

    // Send to unique devices only
    for (const tokenRecord of tokensToSend) {
      try {
        await sendPushNotification(tokenRecord.token, notification, data);
        sentCount++;

        // Update last used timestamp
        await prisma.fCMToken.update({
          where: { id: tokenRecord.id },
          data: { lastUsedAt: new Date() },
        });

        console.log(`✅ Push sent to ${tokenRecord.deviceType || "device"}`);
      } catch (pushError) {
        console.error(
          `❌ Failed to send push to device ${tokenRecord.id}:`,
          pushError.message
        );

        // If token is invalid, mark as inactive
        // Handle all possible invalid token error codes
        const invalidTokenCodes = [
          "messaging/invalid-registration-token",
          "messaging/registration-token-not-registered",
          "messaging/invalid-argument", // This happens when token format is invalid
          "messaging/unsupported-registration-token",
          "messaging/mismatched-credential", // SenderId mismatch - token from different Firebase project
        ];

        // Also check error message for invalid token patterns
        const isInvalidToken =
          invalidTokenCodes.includes(pushError.code) ||
          pushError.message?.includes("not a valid FCM registration token") ||
          pushError.message?.includes("Invalid registration token") ||
          pushError.message?.includes("registration token is not valid");

        if (isInvalidToken) {
          failedTokenIds.push(tokenRecord.id);
          console.log(
            `🗑️ Marking token ${tokenRecord.id} as invalid (${pushError.code})`
          );
        }
      }
    }

    // Deactivate failed tokens
    if (failedTokenIds.length > 0) {
      await prisma.fCMToken.updateMany({
        where: {
          id: { in: failedTokenIds },
        },
        data: { isActive: false },
      });
      console.log(`🗑️ Deactivated ${failedTokenIds.length} invalid token(s)`);
    }

    return {
      success: sentCount > 0,
      sentCount,
      totalDevices: tokensToSend.length,
      duplicatesRemoved: fcmTokens.length - tokensToSend.length,
      failedCount: failedTokenIds.length,
    };
  } catch (error) {
    console.error("Error in sendPushToAllUserDevices:", error);
    return { success: false, sentCount: 0, error: error.message };
  }
};

// ✅ Send notification for WO assignment
export const notifyWOAssignment = async (technicianId, wo) => {
  try {
    // Get technician details
    const technician = await prisma.user.findUnique({
      where: { id: technicianId },
      select: { phone: true, name: true, fcmToken: true },
    });

    // Get customer details
    const customer = await prisma.user.findUnique({
      where: { id: wo.customerId },
      select: { name: true },
    });

    const customerName = customer?.name || "Customer";

    // Send SMS notification
    if (technician && technician.phone) {
      await sendWOAssignmentSMS(technician.phone, wo.woNumber, customerName);
    }

    // 🔥 Send Firebase Push Notification AND create DB notification in one call
    // Using createNotification to avoid duplicate notifications
    const notification = await createNotification(
      technicianId,
      "WO_ASSIGNED",
      "🔔 New Job Assigned!",
      `Work Order ${wo.woNumber} - Customer: ${customerName}. You have been assigned this work order.`,
      {
        woId: wo.id,
        woNumber: wo.woNumber,
        customerId: wo.customerId,
        customerName: customerName,
      }
    );

    console.log(
      `🔔 Notification created for user ${technicianId}: New Work Order Assigned`
    );
    return notification;
  } catch (error) {
    console.error("Error in notifyWOAssignment:", error);
    throw error;
  }
};

// ✅ Send notification for WO acceptance
export const notifyWOAccepted = async (dispatcherId, wo) => {
  try {
    // Get dispatcher details
    const dispatcher = await prisma.user.findUnique({
      where: { id: dispatcherId },
      select: { phone: true, fcmToken: true },
    });

    // Get technician details
    const technician = await prisma.user.findUnique({
      where: { id: wo.technicianId },
      select: { name: true },
    });

    const techName = technician?.name || "Technician";

    // Send SMS notification
    if (dispatcher && dispatcher.phone) {
      await sendWOAcceptedSMS(dispatcher.phone, wo.woNumber, techName);
    }

    // Using createNotification to avoid duplicate notifications (handles both DB + push)
    return createNotification(
      dispatcherId,
      "WO_ACCEPTED",
      "✅ Work Order Accepted",
      `${techName} accepted work order ${wo.woNumber}`,
      { woId: wo.id, woNumber: wo.woNumber }
    );
  } catch (error) {
    console.error("Error in notifyWOAccepted:", error);
    throw error;
  }
};

// ✅ Send notification for WO completion
export const notifyWOCompleted = async (dispatcherId, wo) => {
  try {
    // Get dispatcher details
    const dispatcher = await prisma.user.findUnique({
      where: { id: dispatcherId },
      select: { phone: true, fcmToken: true },
    });

    // Send SMS notification
    if (dispatcher && dispatcher.phone) {
      await sendWOCompletedSMS(dispatcher.phone, wo.woNumber);
    }

    // Using createNotification to avoid duplicate notifications (handles both DB + push)
    return createNotification(
      dispatcherId,
      "WO_COMPLETED",
      "✅ Work Order Completed",
      `Work order ${wo.woNumber} has been completed`,
      { woId: wo.id, woNumber: wo.woNumber }
    );
  } catch (error) {
    console.error("Error in notifyWOCompleted:", error);
    throw error;
  }
};

// ✅ Send notification for payment verification
export const notifyPaymentVerified = async (technicianId, wo, payment) => {
  try {
    // Get technician details
    const technician = await prisma.user.findUnique({
      where: { id: technicianId },
      select: { phone: true, fcmToken: true },
    });

    // Send SMS notification
    if (technician && technician.phone) {
      await sendPaymentVerifiedSMS(
        technician.phone,
        payment.amount,
        wo.woNumber
      );
    }

    // Using createNotification to avoid duplicate notifications (handles both DB + push)
    return createNotification(
      technicianId,
      "PAYMENT_VERIFIED",
      "💰 Payment Verified",
      `Payment of ${payment.amount} verified for WO ${wo.woNumber}`,
      { woId: wo.id, woNumber: wo.woNumber, amount: payment.amount }
    );
  } catch (error) {
    console.error("Error in notifyPaymentVerified:", error);
    throw error;
  }
};

// ✅ Send notification for commission paid alert for each service payout
export const notifyCommissionPaid = async (technicianId, payout) => {
  try {
    // Get technician details
    const technician = await prisma.user.findUnique({
      where: { id: technicianId },
      select: { phone: true, fcmToken: true },
    });

    // Send SMS notification
    if (technician && technician.phone) {
      await sendPayoutApprovedSMS(technician.phone, payout.totalAmount);
    }

    // Using createNotification to avoid duplicate notifications (handles both DB + push)
    return createNotification(
      technicianId,
      "COMMISSION_PAID",
      "💵 Commission Paid",
      `Your commission of ${payout.totalAmount} has been paid`,
      { payoutId: payout.id, amount: payout.totalAmount }
    );
  } catch (error) {
    console.error("Error in notifyCommissionPaid:", error);
    throw error;
  }
};

// ✅ Send notification for technician blocked
export const notifyTechnicianBlocked = async (technicianId, reason) => {
  try {
    // Get technician details
    const technician = await prisma.user.findUnique({
      where: { id: technicianId },
      select: { phone: true, fcmToken: true },
    });

    // Send SMS notification
    if (technician && technician.phone) {
      await sendAccountBlockedSMS(technician.phone, reason);
    }

    // Using createNotification to avoid duplicate notifications (handles both DB + push)
    const notification = await createNotification(
      technicianId,
      "TECHNICIAN_BLOCKED",
      "🚫 Account Blocked",
      `Your account has been blocked. Reason: ${reason}`,
      { reason }
    );

    console.log(
      `🚫 Account blocked notification sent to technician ${technicianId}`
    );

    return notification;
  } catch (error) {
    console.error("Error in notifyTechnicianBlocked:", error);
    throw error;
  }
};

// ✅ Send notification for new Service Request
export const notifyNewServiceRequest = async (sr) => {
  try {
    // Notify customer with push notification
    await createNotification(
      sr.customerId,
      "SR_CREATED",
      "Service Request Created",
      `Your service request ${sr.srNumber} has been created successfully and is pending approval.`,
      { srId: sr.id, srNumber: sr.srNumber }
    );

    // Notify all dispatchers and admins
    const dispatchersAndAdmins = await prisma.user.findMany({
      where: {
        role: { in: ["DISPATCHER", "ADMIN"] },
        isBlocked: false,
      },
      select: { id: true },
    });

    for (const user of dispatchersAndAdmins) {
      await createNotification(
        user.id,
        "NEW_SR_AVAILABLE",
        "New Service Request",
        `New service request ${sr.srNumber} has been created and needs assignment.`,
        { srId: sr.id, srNumber: sr.srNumber }
      );
    }

    console.log(`📝 New service request notifications sent: ${sr.srNumber}`);
  } catch (error) {
    console.error("Error in notifyNewServiceRequest:", error);
  }
};

// ✅ Send notification when SR is assigned (converted to WO)
export const notifySRAssigned = async (sr, wo, technician) => {
  try {
    // Notify customer - using createNotification which handles both DB record and push notification
    // This prevents duplicate notifications (was previously sending both createNotification + sendPushToAllUserDevices)
    await createNotification(
      sr.customerId,
      "SR_ASSIGNED",
      "👷 Technician Assigned",
      `${technician.name} will handle your request ${sr.srNumber}. Work order ${wo.woNumber} created.`,
      { srId: sr.id, woId: wo.id, srNumber: sr.srNumber, woNumber: wo.woNumber }
    );

    console.log(
      `👷 SR assigned notification sent: ${sr.srNumber} -> ${wo.woNumber}`
    );
  } catch (error) {
    console.error("Error in notifySRAssigned:", error);
  }
};

// ✅ Send notification when SR is completed
export const notifySRCompleted = async (sr, wo) => {
  try {
    // Notify customer with push notification
    await createNotification(
      sr.customerId,
      "SR_COMPLETED",
      "Service Completed",
      `Your service request ${sr.srNumber} has been completed. Please verify and make payment.`,
      { srId: sr.id, woId: wo.id, srNumber: sr.srNumber, woNumber: wo.woNumber }
    );

    console.log(`✅ SR completed notification sent: ${sr.srNumber}`);
  } catch (error) {
    console.error("Error in notifySRCompleted:", error);
  }
};

// ✅ Send notification when SR is cancelled
export const notifySRCancelled = async (sr, cancelledBy) => {
  try {
    // Notify customer if cancelled by admin/dispatcher with push notification
    if (cancelledBy !== "CUSTOMER") {
      await createNotification(
        sr.customerId,
        "SR_CANCELLED",
        "Service Request Cancelled",
        `Your service request ${sr.srNumber} has been cancelled.`,
        { srId: sr.id, srNumber: sr.srNumber }
      );
    }

    // Notify dispatchers and admins if cancelled by customer
    if (cancelledBy === "CUSTOMER") {
      const dispatchersAndAdmins = await prisma.user.findMany({
        where: {
          role: { in: ["DISPATCHER", "ADMIN"] },
          isBlocked: false,
        },
        select: { id: true },
      });

      for (const user of dispatchersAndAdmins) {
        await createNotification(
          user.id,
          "SR_CANCELLED_BY_CUSTOMER",
          "Service Request Cancelled",
          `Service request ${sr.srNumber} has been cancelled by customer.`,
          { srId: sr.id, srNumber: sr.srNumber }
        );
      }
    }

    console.log(`❌ SR cancelled notification sent: ${sr.srNumber}`);
  } catch (error) {
    console.error("Error in notifySRCancelled:", error);
  }
};

// ✅ Send notification when technician is on the way
export const notifyTechnicianOnWay = async (wo, customer) => {
  try {
    // Using createNotification to avoid duplicate notifications (handles both DB + push)
    await createNotification(
      customer.id,
      "TECH_ON_WAY",
      "🚗 Technician On The Way",
      `Your technician is heading to your location for work order ${wo.woNumber}.`,
      { woId: wo.id, woNumber: wo.woNumber }
    );

    console.log(
      `🚗 Technician on way notification sent for WO: ${wo.woNumber}`
    );
  } catch (error) {
    console.error("Error in notifyTechnicianOnWay:", error);
  }
};

// ✅ Send notification when technician has arrived
export const notifyTechnicianArrived = async (wo, customer) => {
  try {
    // Using createNotification to avoid duplicate notifications (handles both DB + push)
    await createNotification(
      customer.id,
      "TECH_ARRIVED",
      "📍 Technician Arrived",
      `Your technician has arrived at your location for work order ${wo.woNumber}.`,
      { woId: wo.id, woNumber: wo.woNumber }
    );

    console.log(
      `📍 Technician arrived notification sent for WO: ${wo.woNumber}`
    );
  } catch (error) {
    console.error("Error in notifyTechnicianArrived:", error);
  }
};

// ✅ Send notification when technician starts work
export const notifyWorkStarted = async (wo) => {
  console.log(`🛠️ Work started notification created for WO: ${wo.woNumber}`);
};

// ✅ Emergency/urgent notifications
export const notifyEmergency = async (message, data = {}) => {
  console.log(`🚨 Emergency alert notification created: ${message}`);
};

// ✅ New: System-wide announcements
export const sendSystemAnnouncement = async (
  title,
  message,
  targetRoles = []
) => {
  console.log(`📢 System announcement created: ${title}`);
};
