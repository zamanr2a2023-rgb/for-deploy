/** @format */

// src/controllers/notification.controller.js
import { prisma } from "../prisma.js";

// Helper function to format date
const formatDate = (date) => {
  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return new Date(date).toLocaleString("en-US", options);
};

export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { unreadOnly } = req.query;

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
                lastUsedAt: true,
              },
            },
          },
        },
      },
    });

    // Debug: Log fcmTokens count for verification
    if (notifications.length > 0 && notifications[0].user) {
      console.log(
        `📱 User ${userId} has ${
          notifications[0].user.fcmTokens?.length || 0
        } active FCM token(s)`
      );
    }

    // Format notifications with createdAtFormatted and referenceId
    const formattedNotifications = notifications.map((notification) => {
      const data = notification.dataJson
        ? JSON.parse(notification.dataJson)
        : null;
      return {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        referenceId: data?.srId || data?.woId || data?.paymentId || null,
        createdAt: notification.createdAt,
        createdAtFormatted: formatDate(notification.createdAt),
        isRead: notification.isRead,
        readAt: notification.readAt,
        data: data,
        user: notification.user,
      };
    });

    return res.json(formattedNotifications);
  } catch (err) {
    next(err);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const notificationId = Number(req.params.id);
    const userId = req.user.id;

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      return res.status(404).json({ message: "Notification not found" });
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

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

    return res.json({ message: "All notifications marked as read" });
  } catch (err) {
    next(err);
  }
};

// Helper: Validate FCM token format
const isValidFCMToken = (token) => {
  if (!token || typeof token !== "string") {
    return false;
  }

  // Reject test/dummy tokens
  if (
    token.startsWith("test_") ||
    token.startsWith("dummy_") ||
    token.startsWith("fake_") ||
    token.toLowerCase().includes("test_fcm")
  ) {
    return false;
  }

  // Valid FCM tokens are typically long strings (150+ characters)
  // Format: Usually contains alphanumeric characters, colons, and hyphens
  // Example: dXp8RXE5TgG9VqK:APA91bH...
  if (token.length < 50) {
    return false;
  }

  // Basic format check - should contain alphanumeric and some special chars
  const validPattern = /^[A-Za-z0-9_\-:]+$/;
  return validPattern.test(token);
};

// Register or update FCM token for push notifications (supports multiple devices)
export const registerFCMToken = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { fcmToken, deviceType, deviceName, deviceId } = req.body;

    if (!fcmToken) {
      return res.status(400).json({ message: "FCM token is required" });
    }

    // Validate FCM token format
    if (!isValidFCMToken(fcmToken)) {
      console.warn(
        `⚠️ Invalid FCM token format rejected for user ${userId}: ${fcmToken.substring(
          0,
          30
        )}...`
      );
      return res.status(400).json({
        message:
          "Invalid FCM token format. Please provide a valid FCM token from your device.",
      });
    }

    // Check if token already exists with retry logic for connection issues
    let existingToken = null;
    let retries = 3;

    while (retries > 0) {
      try {
        existingToken = await prisma.fCMToken.findUnique({
          where: { token: fcmToken },
        });
        break; // Success, exit retry loop
      } catch (dbError) {
        retries--;
        if (retries === 0) {
          console.error(
            `❌ Database connection failed after all retries:`,
            dbError.message
          );
          return res.status(503).json({
            message:
              "Database temporarily unavailable. Please try again in a few seconds.",
            retryAfter: 5,
          });
        }
        console.warn(
          `⚠️ Database connection attempt failed, retrying... (${retries} left)`
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    if (existingToken) {
      // Update existing token - also update userId in case token was reassigned to different user
      const updatedToken = await prisma.fCMToken.update({
        where: { token: fcmToken },
        data: {
          userId, // Update userId to ensure token is associated with current user
          isActive: true,
          lastUsedAt: new Date(),
          deviceType,
          deviceName,
          deviceId,
        },
      });

      console.log(
        `✅ FCM token updated for user ${userId} (${
          deviceType || "unknown device"
        }) - Token ID: ${updatedToken.id}, Previous User: ${
          existingToken.userId
        }`
      );
    } else {
      // Create new token entry
      await prisma.fCMToken.create({
        data: {
          userId,
          token: fcmToken,
          deviceType,
          deviceName,
          deviceId,
        },
      });

      console.log(
        `✅ New FCM token registered for user ${userId} (${
          deviceType || "unknown device"
        })`
      );
    }

    // Also update the legacy fcmToken field for backward compatibility
    await prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
    });

    return res.json({
      message: "FCM token registered successfully",
      userId,
      deviceType,
    });
  } catch (err) {
    next(err);
  }
};

// Remove FCM token (on logout or device removal)
export const removeFCMToken = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { fcmToken, deviceId } = req.body;

    if (fcmToken) {
      // Remove specific token
      await prisma.fCMToken.deleteMany({
        where: {
          userId,
          token: fcmToken,
        },
      });
      console.log(`✅ FCM token removed for user ${userId}`);
    } else if (deviceId) {
      // Remove by device ID
      await prisma.fCMToken.deleteMany({
        where: {
          userId,
          deviceId,
        },
      });
      console.log(`✅ FCM tokens removed for device ${deviceId}`);
    } else {
      // Remove all tokens for user (logout from all devices)
      await prisma.fCMToken.deleteMany({
        where: { userId },
      });
      console.log(`✅ All FCM tokens removed for user ${userId}`);
    }

    // Also clear legacy fcmToken field
    await prisma.user.update({
      where: { id: userId },
      data: { fcmToken: null },
    });

    return res.json({ message: "FCM token removed successfully" });
  } catch (err) {
    next(err);
  }
};

// Admin: Send custom notification to specific user
export const sendNotification = async (req, res, next) => {
  try {
    const { userId, title, message, data } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({
        message: "userId, title, and message are required",
      });
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
      select: { name: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create database notification
    const notification = await prisma.notification.create({
      data: {
        userId: Number(userId),
        type: data?.type || "CUSTOM",
        title,
        message,
        dataJson: data ? JSON.stringify(data) : null,
      },
    });

    // 🔥 Send push notification to all user's devices using the new multi-device system
    const { sendPushToAllUserDevices } = await import(
      "../services/notification.service.js"
    );

    const pushResult = await sendPushToAllUserDevices(
      Number(userId),
      {
        title,
        body: message,
      },
      {
        ...data,
        notificationId: String(notification.id),
        type: data?.type || "CUSTOM",
        priority: "high",
        sound: "default",
      }
    );

    return res.json({
      message: "Notification sent successfully",
      notification,
      pushSent: pushResult.success,
      devicesNotified: pushResult.sentCount,
      totalDevices: pushResult.totalDevices,
      failedDevices: pushResult.failedCount,
    });
  } catch (err) {
    next(err);
  }
};

// Admin: Send notification to multiple users (topic-style)
// Admin: Cleanup invalid FCM tokens (format-based validation only)
export const cleanupInvalidTokens = async (req, res, next) => {
  try {
    // Get all active tokens
    const allTokens = await prisma.fCMToken.findMany({
      where: { isActive: true },
      select: {
        id: true,
        token: true,
        userId: true,
        deviceType: true,
        deviceName: true,
      },
    });

    console.log(`🔍 Checking ${allTokens.length} active FCM tokens...`);

    const invalidTokenIds = [];

    // Validate token format (without sending actual notifications)
    for (const tokenRecord of allTokens) {
      if (!isValidFCMToken(tokenRecord.token)) {
        invalidTokenIds.push(tokenRecord.id);
        console.log(
          `🗑️ Invalid token format found: ${tokenRecord.id} (user ${
            tokenRecord.userId
          }, device: ${tokenRecord.deviceType || "unknown"})`
        );
      }
    }

    // Deactivate invalid tokens
    if (invalidTokenIds.length > 0) {
      await prisma.fCMToken.updateMany({
        where: { id: { in: invalidTokenIds } },
        data: { isActive: false },
      });
      console.log(`✅ Deactivated ${invalidTokenIds.length} invalid tokens`);
    }

    return res.json({
      message: "Token cleanup completed",
      totalChecked: allTokens.length,
      invalidFound: invalidTokenIds.length,
      validTokens: allTokens.length - invalidTokenIds.length,
      deactivated: invalidTokenIds.length,
    });
  } catch (err) {
    next(err);
  }
};

// Test endpoint: Check Firebase connection and FCM token status
export const testNotificationSystem = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Check Firebase initialization
    let firebaseStatus = "❌ Not initialized";
    try {
      const { getFirebaseMessaging } = await import("../utils/firebase.js");
      const messaging = getFirebaseMessaging();
      firebaseStatus = "✅ Firebase initialized";
    } catch (firebaseError) {
      firebaseStatus = `❌ Firebase error: ${firebaseError.message}`;
    }

    // Check user's FCM tokens
    const fcmTokens = await prisma.fCMToken.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: {
        id: true,
        token: true,
        deviceType: true,
        deviceName: true,
        deviceId: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    // Check legacy fcmToken field
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true, name: true },
    });

    return res.json({
      message: "Notification system status",
      firebase: firebaseStatus,
      user: {
        id: userId,
        name: user?.name,
        legacyFcmToken: user?.fcmToken ? "✅ Exists" : "❌ Not set",
      },
      fcmTokens: {
        count: fcmTokens.length,
        active: fcmTokens.filter((t) => t.isActive).length,
        devices: fcmTokens.map((token) => ({
          id: token.id,
          deviceType: token.deviceType || "Unknown",
          deviceName: token.deviceName || "Unknown",
          lastUsed: token.lastUsedAt,
          registered: token.createdAt,
        })),
      },
      environment: {
        hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
        hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const sendNotificationToTopic = async (req, res, next) => {
  try {
    const { role, title, message, data } = req.body;

    if (!role || !title || !message) {
      return res.status(400).json({
        message: "role, title, and message are required",
      });
    }

    // Valid roles
    const validRoles = [
      "CUSTOMER",
      "TECH_FREELANCER",
      "TECH_INTERNAL",
      "DISPATCHER",
      "CALL_CENTER",
      "ADMIN",
    ];

    if (!validRoles.includes(role)) {
      return res.status(400).json({
        message: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
      });
    }

    // Get all users with this role
    const users = await prisma.user.findMany({
      where: {
        role,
        isBlocked: false,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (users.length === 0) {
      return res.status(404).json({
        message: `No users found with role: ${role}`,
      });
    }

    // Create notifications for all users
    const notifications = await prisma.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        type: data?.type || "ANNOUNCEMENT",
        title,
        message,
        dataJson: data ? JSON.stringify(data) : null,
      })),
    });

    // 🔥 Send push notifications to all devices for each user using the new multi-device system
    const { sendPushToAllUserDevices } = await import(
      "../services/notification.service.js"
    );

    let pushResults = {
      totalUsers: users.length,
      totalDevices: 0,
      sent: 0,
      failed: 0,
      userResults: [],
    };

    for (const user of users) {
      try {
        const pushResult = await sendPushToAllUserDevices(
          user.id,
          {
            title,
            body: message,
          },
          {
            ...data,
            type: data?.type || "ANNOUNCEMENT",
            priority: "high",
            sound: "default",
          }
        );

        pushResults.totalDevices += pushResult.totalDevices || 0;
        pushResults.sent += pushResult.sentCount || 0;
        pushResults.failed += pushResult.failedCount || 0;

        pushResults.userResults.push({
          userId: user.id,
          userName: user.name,
          devicesNotified: pushResult.sentCount || 0,
          totalDevices: pushResult.totalDevices || 0,
          success: pushResult.success,
        });
      } catch (pushError) {
        pushResults.failed++;
        console.error(
          `❌ Failed to send push to user ${user.id}:`,
          pushError.message
        );
        pushResults.userResults.push({
          userId: user.id,
          userName: user.name,
          error: pushError.message,
          success: false,
        });
      }
    }

    console.log(
      `✅ Push notifications sent to ${pushResults.sent} devices across ${pushResults.totalUsers} users with role: ${role}`
    );

    return res.json({
      message: `Notifications sent to ${users.length} users with role: ${role}`,
      totalUsers: users.length,
      notificationsCreated: notifications.count,
      pushNotifications: pushResults,
    });
  } catch (err) {
    next(err);
  }
};
