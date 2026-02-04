/** @format */

// Test notification sending with specific FCM token
import { prisma } from "./src/prisma.js";
import { sendPushNotification } from "./src/utils/firebase.js";
import { initializeFirebase } from "./src/utils/firebase.js";

async function testNotification() {
  try {
    console.log("🔥 Initializing Firebase...");
    initializeFirebase();

    const testToken =
      "dRY2ovVMQAmOnjhvcg5X9_:APA91bHXa5TMvnU8tl3a7vRnk8MwxhTfmJOUkGXPzwDPuOnWvgpOiR9qg6BJSBs5Spai2Zh_6LB6nEwsDZVJwwkJTXDSvbGvJk_UxTg68s-XAcq4dedyAk8";

    console.log("\n📱 Testing notification to token...");
    console.log(`Token: ${testToken.substring(0, 30)}...`);

    const notification = {
      title: "🎉 Test Notification",
      body: "This is a test notification - App OPEN or CLOSED, you should see this!",
    };

    const data = {
      type: "TEST",
      notificationId: String(Date.now()),
      priority: "high",
      sound: "default",
      timestamp: new Date().toISOString(),
    };

    console.log("\n📤 Sending push notification...");
    await sendPushNotification(testToken, notification, data);

    console.log("\n✅ Notification sent successfully!");
    console.log(
      "\n📲 Check your device - notification should appear even if app is open!"
    );
  } catch (error) {
    console.error("\n❌ Error:", error);
    console.error("\nError details:", {
      code: error.code,
      message: error.message,
    });
  } finally {
    await prisma.$disconnect();
  }
}

testNotification();
