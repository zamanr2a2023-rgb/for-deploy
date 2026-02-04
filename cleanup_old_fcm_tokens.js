/**
 * Script to cleanup old FCM tokens that are from different Firebase projects
 * Run this after changing Firebase project to remove invalid tokens
 */

import { prisma } from './src/prisma.js';
import dotenv from 'dotenv';
dotenv.config();

async function cleanupOldTokens() {
  console.log('🧹 Starting FCM token cleanup...\n');

  try {
    // Get all active tokens
    const allTokens = await prisma.fCMToken.findMany({
      where: { isActive: true },
      select: {
        id: true,
        userId: true,
        token: true,
        deviceType: true,
        deviceName: true,
        createdAt: true,
      },
    });

    console.log(`📊 Found ${allTokens.length} active FCM tokens\n`);

    // Deactivate all old tokens (they need to be re-registered with new Firebase project)
    const result = await prisma.fCMToken.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    console.log(`✅ Deactivated ${result.count} FCM tokens`);
    console.log('\n💡 Next steps:');
    console.log('   1. Users need to logout and login again');
    console.log('   2. Flutter app will generate new FCM tokens');
    console.log('   3. New tokens will be registered automatically\n');

    // Also clear legacy fcmToken field
    await prisma.user.updateMany({
      where: {
        fcmToken: { not: null },
      },
      data: { fcmToken: null },
    });

    console.log('✅ Cleared legacy fcmToken fields from User table\n');
    console.log('🎉 Cleanup completed!\n');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupOldTokens();

