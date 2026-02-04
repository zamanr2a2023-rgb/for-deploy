/** @format */
// check_fcm.js - Debug push notification issues

import { PrismaClient } from "@prisma/client";
import {
  initializeFirebase,
  sendPushNotification,
} from "./src/utils/firebase.js";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function checkFCM() {
  try {
    console.log("\n" + "=".repeat(60));
    console.log("       PUSH NOTIFICATION DEBUG CHECK");
    console.log("=".repeat(60));

    // 1. Check Firebase Config
    console.log("\n📋 FIREBASE CONFIGURATION:");
    console.log("-".repeat(40));
    console.log(
      "FIREBASE_PROJECT_ID:",
      process.env.FIREBASE_PROJECT_ID ? "✅ SET" : "❌ NOT SET"
    );
    console.log(
      "FIREBASE_CLIENT_EMAIL:",
      process.env.FIREBASE_CLIENT_EMAIL ? "✅ SET" : "❌ NOT SET"
    );
    console.log(
      "FIREBASE_PRIVATE_KEY:",
      process.env.FIREBASE_PRIVATE_KEY
        ? `✅ SET (${process.env.FIREBASE_PRIVATE_KEY.length} chars)`
        : "❌ NOT SET"
    );

    // 2. Initialize Firebase
    console.log("\n🔥 FIREBASE INITIALIZATION:");
    console.log("-".repeat(40));
    try {
      initializeFirebase();
      console.log("✅ Firebase Admin SDK initialized successfully");
    } catch (firebaseError) {
      console.log("❌ Firebase initialization failed:", firebaseError.message);
      return;
    }

    // 3. Check FCM Tokens in Database
    console.log("\n📱 FCM TOKENS IN DATABASE:");
    console.log("-".repeat(40));

    const fcmTokens = await prisma.fCMToken.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (fcmTokens.length === 0) {
      console.log("⚠️  NO FCM TOKENS FOUND IN DATABASE!");
      console.log("   Users need to register their device tokens first.");
      console.log(
        "   The mobile app should call POST /api/auth/fcm-token after login."
      );
    } else {
      console.log(`Found ${fcmTokens.length} FCM token(s):\n`);
      fcmTokens.forEach((token, idx) => {
        console.log(
          `${idx + 1}. User: ${token.user?.name || "Unknown"} (${
            token.user?.phone
          })`
        );
        console.log(`   Role: ${token.user?.role}`);
        console.log(`   Token: ${token.token.substring(0, 40)}...`);
        console.log(
          `   Device: ${token.deviceType || "unknown"} - ${
            token.deviceName || "unnamed"
          }`
        );
        console.log(`   Active: ${token.isActive ? "✅ Yes" : "❌ No"}`);
        console.log(`   Last Used: ${token.lastUsedAt}`);
        console.log("");
      });
    }

    // 4. Check Active Tokens Only
    const activeTokens = fcmTokens.filter((t) => t.isActive);
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total Tokens: ${fcmTokens.length}`);
    console.log(`   Active Tokens: ${activeTokens.length}`);
    console.log(
      `   Inactive Tokens: ${fcmTokens.length - activeTokens.length}`
    );

    // 5. Test Send (if there are active tokens)
    if (activeTokens.length > 0) {
      console.log("\n🧪 TEST PUSH NOTIFICATION:");
      console.log("-".repeat(40));

      const testToken = activeTokens[0];
      console.log(
        `Testing with token for: ${testToken.user?.name} (${testToken.user?.phone})`
      );

      try {
        const result = await sendPushNotification(
          testToken.token,
          {
            title: "🧪 Test Notification",
            body: "This is a test push notification from the server.",
          },
          {
            type: "TEST",
            timestamp: new Date().toISOString(),
          }
        );
        console.log("✅ Test notification sent successfully!");
        console.log("   Response:", result);
      } catch (sendError) {
        console.log("❌ Test notification failed:", sendError.message);
        console.log("   Error code:", sendError.code);

        if (
          sendError.code === "messaging/invalid-registration-token" ||
          sendError.code === "messaging/registration-token-not-registered"
        ) {
          console.log("\n⚠️  This token is invalid or expired.");
          console.log("   The user needs to re-register their device.");
        }
      }
    }

    // 6. Check Notification Records
    console.log("\n📬 RECENT NOTIFICATIONS IN DATABASE:");
    console.log("-".repeat(40));

    const recentNotifications = await prisma.notification.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { name: true, phone: true },
        },
      },
    });

    if (recentNotifications.length === 0) {
      console.log("No notifications found in database.");
    } else {
      recentNotifications.forEach((notif, idx) => {
        console.log(`${idx + 1}. ${notif.title}`);
        console.log(`   To: ${notif.user?.name} (${notif.user?.phone})`);
        console.log(`   Type: ${notif.type}`);
        console.log(`   Created: ${notif.createdAt}`);
        console.log(`   Read: ${notif.isRead ? "Yes" : "No"}`);
        console.log("");
      });
    }

    console.log("\n" + "=".repeat(60));
    console.log("                    CHECK COMPLETE");
    console.log("=".repeat(60) + "\n");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFCM();
