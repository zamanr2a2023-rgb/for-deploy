import { prisma } from "./src/prisma.js";

async function checkAllTokens() {
  try {
    console.log("🔍 Checking all FCM tokens in database\n");

    const allTokens = await prisma.fCMToken.findMany({
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

    console.log(`📊 Total tokens in database: ${allTokens.length}\n`);

    if (allTokens.length === 0) {
      console.log("❌ No FCM tokens found in database!");
      console.log(
        "\n💡 Users need to login from the mobile app with FCM token included"
      );
    } else {
      allTokens.forEach((t, idx) => {
        console.log(`Token ${idx + 1}:`);
        console.log(`   ID: ${t.id}`);
        console.log(`   User: ${t.user.name} (ID: ${t.user.id})`);
        console.log(`   Phone: ${t.user.phone}`);
        console.log(`   Role: ${t.user.role}`);
        console.log(`   Device: ${t.deviceType || "Unknown"}`);
        console.log(`   Device Name: ${t.deviceName || "Unknown"}`);
        console.log(`   Active: ${t.isActive}`);
        console.log(`   Token: ${t.token.substring(0, 50)}...`);
        console.log(`   Created: ${t.createdAt}`);
        console.log(`   Last Used: ${t.lastUsedAt}\n`);
      });
    }

    // Check users who triggered the notification
    console.log("\n📱 Checking users 1 and 7:");
    const users = await prisma.user.findMany({
      where: {
        id: { in: [1, 7] },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        fcmTokens: true,
      },
    });

    users.forEach((u) => {
      console.log(`\nUser ${u.id}:`);
      console.log(`   Name: ${u.name}`);
      console.log(`   Phone: ${u.phone}`);
      console.log(`   Role: ${u.role}`);
      console.log(`   FCM Tokens: ${u.fcmTokens.length}`);
      u.fcmTokens.forEach((t, idx) => {
        console.log(
          `     Token ${idx + 1}: Active=${t.isActive}, Device=${
            t.deviceType
          }`
        );
      });
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllTokens();
