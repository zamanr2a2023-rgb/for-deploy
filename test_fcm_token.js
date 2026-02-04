import { prisma } from "./src/prisma.js";
import { sendPushNotification } from "./src/utils/firebase.js";

// Test FCM token provided by user
const TEST_TOKEN =
  "dRY2ovVMQAmOnjhvcg5X9_:APA91bHXa5TMvnU8tl3a7vRnk8MwxhTfmJOUkGXPzwDPuOnWvgpOiR9qg6BJSBs5Spai2Zh_6LB6nEwsDZVJwwkJTXDSvbGvJk_UxTg68s-XAcq4dedyAk8";
const TEST_USER_ID = 4; // User ID to test with

async function testFCMToken() {
  try {
    console.log("🧪 Testing FCM Token System\n");

    // Step 1: Check existing tokens for user
    console.log(`📋 Step 1: Checking existing tokens for user ${TEST_USER_ID}`);
    const existingTokens = await prisma.fCMToken.findMany({
      where: { userId: TEST_USER_ID },
    });
    console.log(`   Found ${existingTokens.length} existing token(s):`);
    existingTokens.forEach((t) => {
      console.log(
        `   - ID: ${t.id}, Active: ${t.isActive}, Token: ${t.token.substring(
          0,
          20
        )}...`
      );
    });

    // Step 2: Save test token
    console.log(`\n💾 Step 2: Saving test token`);
    let tokenRecord;
    const existing = await prisma.fCMToken.findUnique({
      where: { token: TEST_TOKEN },
    });

    if (existing) {
      console.log(`   Token already exists, updating...`);
      tokenRecord = await prisma.fCMToken.update({
        where: { token: TEST_TOKEN },
        data: {
          userId: TEST_USER_ID,
          deviceType: "ANDROID",
          deviceName: "Test Device",
          deviceId: "test-device-id",
          isActive: true,
          lastUsedAt: new Date(),
        },
      });
      console.log(`   ✅ Token updated`);
    } else {
      console.log(`   Creating new token record...`);
      tokenRecord = await prisma.fCMToken.create({
        data: {
          userId: TEST_USER_ID,
          token: TEST_TOKEN,
          deviceType: "ANDROID",
          deviceName: "Test Device",
          deviceId: "test-device-id",
          isActive: true,
        },
      });
      console.log(`   ✅ Token created`);
    }

    // Step 3: Verify token is saved
    console.log(`\n🔍 Step 3: Verifying token is saved`);
    const allTokensForUser = await prisma.fCMToken.findMany({
      where: { userId: TEST_USER_ID, isActive: true },
    });
    console.log(`   Found ${allTokensForUser.length} active token(s) for user`);

    // Step 4: Send test notification
    console.log(`\n📨 Step 4: Sending test notification`);
    try {
      await sendPushNotification(
        TEST_TOKEN,
        {
          title: "🧪 Test Notification",
          body: "This is a test notification from R2A Server",
        },
        {
          type: "TEST",
          timestamp: new Date().toISOString(),
        }
      );
      console.log(`   ✅ Notification sent successfully!`);
    } catch (pushError) {
      console.error(`   ❌ Failed to send notification:`, pushError.message);
      console.error(`   Error code:`, pushError.code);
    }

    // Step 5: Test the notification service
    console.log(`\n🔔 Step 5: Testing notification service`);
    const { sendPushToAllUserDevices } = await import(
      "./src/services/notification.service.js"
    );

    const result = await sendPushToAllUserDevices(
      TEST_USER_ID,
      {
        title: "🔔 Service Test",
        body: "Testing notification service",
      },
      {
        type: "SERVICE_TEST",
        timestamp: new Date().toISOString(),
      }
    );

    console.log(`   Result:`, result);

    console.log(`\n✅ All tests completed!`);
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testFCMToken();
