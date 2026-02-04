/** @format */
// test_push_notifications.js - Test real push notifications with actual data format

import {
  initializeFirebase,
  sendPushNotification,
} from "./src/utils/firebase.js";
import dotenv from "dotenv";

dotenv.config();

// FCM Token to test
const TEST_TOKEN =
  "e_eVaPS2S5qHubfkYVzeqc:APA91bGwOywrvi9pgUXUItTwn0yFahtH-ZesGWAMM7g4b3bnIxHeOAo1UjQLu8_gP0hVrbNXeUl948K79j-xeXvvUn46yGGhq8-MOg2SXTpZEPOctusMp2U";

// Real notification examples from the system
const NOTIFICATION_EXAMPLES = [
  {
    name: "🔔 Work Order Assigned",
    notification: {
      title: "🔔 New Job Assigned!",
      body: "Work Order WO-2025-0001 - Customer: Rahim Khan. You have been assigned this work order.",
    },
    data: {
      type: "WO_ASSIGNED",
      notificationId: "101",
      woId: "15",
      woNumber: "WO-2025-0001",
      customerId: "9",
      customerName: "Rahim Khan",
      priority: "high",
      sound: "default",
    },
  },
  {
    name: "✅ Work Order Accepted",
    notification: {
      title: "✅ Work Order Accepted",
      body: "John Internal Tech accepted work order WO-2025-0001",
    },
    data: {
      type: "WO_ACCEPTED",
      notificationId: "102",
      woId: "15",
      woNumber: "WO-2025-0001",
      priority: "high",
      sound: "default",
    },
  },
  {
    name: "🏁 Work Order Completed",
    notification: {
      title: "✅ Work Order Completed",
      body: "Work order WO-2025-0001 has been completed",
    },
    data: {
      type: "WO_COMPLETED",
      notificationId: "103",
      woId: "15",
      woNumber: "WO-2025-0001",
      priority: "high",
      sound: "default",
    },
  },
  {
    name: "💰 Payment Verified",
    notification: {
      title: "💰 Payment Verified",
      body: "Payment of ৳2500 verified for WO WO-2025-0001",
    },
    data: {
      type: "PAYMENT_VERIFIED",
      notificationId: "104",
      woId: "15",
      woNumber: "WO-2025-0001",
      amount: "2500",
      priority: "high",
      sound: "default",
    },
  },
  {
    name: "💵 Commission Paid",
    notification: {
      title: "💵 Commission Paid",
      body: "Your commission of ৳125 has been paid",
    },
    data: {
      type: "COMMISSION_PAID",
      notificationId: "105",
      payoutId: "10",
      amount: "125",
      priority: "high",
      sound: "default",
    },
  },
  {
    name: "📋 New Service Request",
    notification: {
      title: "New Service Request",
      body: "New service request SR-2025-0001 has been created and needs assignment.",
    },
    data: {
      type: "NEW_SR_AVAILABLE",
      notificationId: "106",
      srId: "20",
      srNumber: "SR-2025-0001",
      priority: "high",
      sound: "default",
    },
  },
  {
    name: "🚫 Account Blocked",
    notification: {
      title: "🚫 Account Blocked",
      body: "Your account has been blocked. Reason: Policy violation - repeated late arrivals",
    },
    data: {
      type: "TECHNICIAN_BLOCKED",
      notificationId: "107",
      reason: "Policy violation - repeated late arrivals",
      priority: "high",
      sound: "default",
    },
  },
  {
    name: "📍 En Route Notification",
    notification: {
      title: "🚗 Technician On The Way",
      body: "Your technician is en route to your location. ETA: 15-20 minutes.",
    },
    data: {
      type: "TECHNICIAN_EN_ROUTE",
      notificationId: "108",
      woId: "15",
      woNumber: "WO-2025-0001",
      technicianName: "John Internal Tech",
      eta: "15-20 minutes",
      priority: "high",
      sound: "default",
    },
  },
];

async function testPushNotifications() {
  console.log("\n" + "=".repeat(70));
  console.log("       PUSH NOTIFICATION TEST - REAL NOTIFICATION EXAMPLES");
  console.log("=".repeat(70));
  console.log(`\n📱 Testing with token: ${TEST_TOKEN.substring(0, 40)}...`);

  // Initialize Firebase
  console.log("\n🔥 Initializing Firebase...");
  try {
    initializeFirebase();
    console.log("✅ Firebase initialized successfully\n");
  } catch (error) {
    console.log("❌ Firebase initialization failed:", error.message);
    return;
  }

  // Ask which notification to send
  console.log("Available notification types:");
  console.log("-".repeat(50));
  NOTIFICATION_EXAMPLES.forEach((example, idx) => {
    console.log(`${idx + 1}. ${example.name}`);
  });
  console.log(
    `${
      NOTIFICATION_EXAMPLES.length + 1
    }. Send ALL notifications (with 3s delay)`
  );
  console.log("-".repeat(50));

  // For automated testing, send all notifications
  const args = process.argv.slice(2);
  const choice = args[0] ? parseInt(args[0]) : NOTIFICATION_EXAMPLES.length + 1;

  if (choice === NOTIFICATION_EXAMPLES.length + 1) {
    // Send all notifications
    console.log("\n📤 Sending ALL notification types...\n");

    for (let i = 0; i < NOTIFICATION_EXAMPLES.length; i++) {
      const example = NOTIFICATION_EXAMPLES[i];
      console.log(
        `\n[${i + 1}/${NOTIFICATION_EXAMPLES.length}] Sending: ${example.name}`
      );
      console.log(`   Title: ${example.notification.title}`);
      console.log(`   Body: ${example.notification.body}`);
      console.log(
        `   Data: ${JSON.stringify(example.data, null, 2)
          .split("\n")
          .map((l, idx) => (idx === 0 ? l : "         " + l))
          .join("\n")}`
      );

      try {
        const result = await sendPushNotification(
          TEST_TOKEN,
          example.notification,
          example.data
        );
        console.log(`   ✅ Sent! Response: ${result}`);
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        if (
          error.code === "messaging/invalid-registration-token" ||
          error.code === "messaging/registration-token-not-registered"
        ) {
          console.log(
            "   ⚠️ Token is invalid or expired. User needs to re-register."
          );
          break;
        }
      }

      // Wait 3 seconds between notifications
      if (i < NOTIFICATION_EXAMPLES.length - 1) {
        console.log("   ⏳ Waiting 3 seconds...");
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  } else if (choice >= 1 && choice <= NOTIFICATION_EXAMPLES.length) {
    // Send specific notification
    const example = NOTIFICATION_EXAMPLES[choice - 1];
    console.log(`\n📤 Sending: ${example.name}`);
    console.log(`Title: ${example.notification.title}`);
    console.log(`Body: ${example.notification.body}`);
    console.log(`Data:`, JSON.stringify(example.data, null, 2));

    try {
      const result = await sendPushNotification(
        TEST_TOKEN,
        example.notification,
        example.data
      );
      console.log(`\n✅ Notification sent successfully!`);
      console.log(`Response: ${result}`);
    } catch (error) {
      console.log(`\n❌ Failed to send: ${error.message}`);
    }
  } else {
    console.log("Invalid choice");
    return;
  }

  console.log("\n" + "=".repeat(70));
  console.log("                    TEST COMPLETE");
  console.log("=".repeat(70));
  console.log("\n📱 Check your mobile device for notifications!\n");
}

testPushNotifications();
