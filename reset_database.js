/** @format */

/**
 * Database Reset Script
 * WARNING: This will DELETE ALL DATA and reset the database!
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function resetDatabase() {
  console.log("\n⚠️  DATABASE RESET - ALL DATA WILL BE DELETED!\n");
  console.log("Starting in 3 seconds...");

  await new Promise((resolve) => setTimeout(resolve, 3000));

  try {
    console.log("\n🗑️  Step 1: Deleting all data...\n");

    // Delete in correct order to avoid foreign key constraints
    await prisma.walletTransaction.deleteMany({});
    console.log("✅ Deleted WalletTransactions");

    await prisma.wallet.deleteMany({});
    console.log("✅ Deleted Wallets");

    await prisma.commission.deleteMany({});
    console.log("✅ Deleted Commissions");

    await prisma.payoutRequest.deleteMany({});
    console.log("✅ Deleted PayoutRequests");

    await prisma.payout.deleteMany({});
    console.log("✅ Deleted Payouts");

    await prisma.payment.deleteMany({});
    console.log("✅ Deleted Payments");

    await prisma.review.deleteMany({});
    console.log("✅ Deleted Reviews");

    await prisma.technicianCheckin.deleteMany({});
    console.log("✅ Deleted TechnicianCheckins");

    await prisma.workOrder.deleteMany({});
    console.log("✅ Deleted WorkOrders");

    await prisma.serviceRequest.deleteMany({});
    console.log("✅ Deleted ServiceRequests");

    await prisma.notification.deleteMany({});
    console.log("✅ Deleted Notifications");

    await prisma.fCMToken.deleteMany({});
    console.log("✅ Deleted FCMTokens");

    await prisma.auditLog.deleteMany({});
    console.log("✅ Deleted AuditLogs");

    await prisma.oTP.deleteMany({});
    console.log("✅ Deleted OTPs");

    await prisma.technicianProfile.deleteMany({});
    console.log("✅ Deleted TechnicianProfiles");

    await prisma.user.deleteMany({});
    console.log("✅ Deleted Users");

    await prisma.rateStructure.deleteMany({});
    console.log("✅ Deleted RateStructures");

    await prisma.systemConfig.deleteMany({});
    console.log("✅ Deleted SystemConfig");

    await prisma.subservice.deleteMany({});
    console.log("✅ Deleted Subservices");

    await prisma.service.deleteMany({});
    console.log("✅ Deleted Services");

    await prisma.category.deleteMany({});
    console.log("✅ Deleted Categories");

    console.log("\n✅ All data deleted successfully!\n");

    console.log("📝 Step 2: Creating fresh data...\n");

    // Create SystemConfig with 5% default rate
    const systemConfig = await prisma.systemConfig.create({
      data: {
        freelancerCommissionRate: 0.05,
        internalEmployeeBonusRate: 0.05,
        internalEmployeeBaseSalary: 0,
        payoutFrequency: "WEEKLY",
      },
    });
    console.log("✅ Created SystemConfig (5% default rate)");

    // Create Admin user
    const adminHash = await bcrypt.hash("admin123", 10);

    const admin = await prisma.user.create({
      data: {
        phone: "01700000000",
        passwordHash: adminHash,
        name: "System Admin",
        email: "admin@fsm.com",
        role: "ADMIN",
        registrationSource: "ADMIN",
      },
    });
    console.log("✅ Created Admin (phone: 01700000000, password: admin123)");

    // Create Dispatcher
    const dispatcherHash = await bcrypt.hash("dispatcher123", 10);
    const dispatcher = await prisma.user.create({
      data: {
        phone: "01700000001",
        passwordHash: dispatcherHash,
        name: "Main Dispatcher",
        email: "dispatcher@fsm.com",
        role: "DISPATCHER",
        registrationSource: "ADMIN",
      },
    });
    console.log(
      "✅ Created Dispatcher (phone: 01700000001, password: dispatcher123)"
    );

    // Create Freelance Technicians
    const tech1Hash = await bcrypt.hash("tech123", 10);
    const tech1 = await prisma.user.create({
      data: {
        phone: "01711111111",
        passwordHash: tech1Hash,
        name: "Ahmed Technician",
        email: "ahmed@tech.com",
        role: "TECH_FREELANCER",
        registrationSource: "ADMIN",
        homeAddress: "123 Dhaka Street, Dhaka-1200",
        latitude: 23.8103,
        longitude: 90.4125,
      },
    });

    await prisma.technicianProfile.create({
      data: {
        userId: tech1.id,
        type: "FREELANCER",
        commissionRate: 0.05,
        bonusRate: 0.05,
        useCustomRate: false, // Uses system default
        status: "ACTIVE",
        specialization: "ELECTRICAL",
      },
    });

    await prisma.wallet.create({
      data: {
        technicianId: tech1.id,
        balance: 0,
      },
    });
    console.log(
      "✅ Created Freelance Technician 1 (Ahmed - 5% system default)"
    );

    // Create another Freelance Technician
    const tech2Hash = await bcrypt.hash("tech123", 10);
    const tech2 = await prisma.user.create({
      data: {
        phone: "01722222222",
        passwordHash: tech2Hash,
        name: "Karim Electrician",
        email: "karim@tech.com",
        role: "TECH_FREELANCER",
        registrationSource: "ADMIN",
        homeAddress: "456 Mirpur Road, Dhaka-1216",
        latitude: 23.7956,
        longitude: 90.3537,
      },
    });

    await prisma.technicianProfile.create({
      data: {
        userId: tech2.id,
        type: "FREELANCER",
        commissionRate: 0.05,
        bonusRate: 0.05,
        useCustomRate: false, // Uses system default
        status: "ACTIVE",
        specialization: "ELECTRICAL",
      },
    });

    await prisma.wallet.create({
      data: {
        technicianId: tech2.id,
        balance: 0,
      },
    });
    console.log(
      "✅ Created Freelance Technician 2 (Karim - 5% system default)"
    );

    // Create Internal Technician
    const tech3Hash = await bcrypt.hash("tech123", 10);
    const tech3 = await prisma.user.create({
      data: {
        phone: "01733333333",
        passwordHash: tech3Hash,
        name: "Rahim Internal Tech",
        email: "rahim@fsm.com",
        role: "TECH_INTERNAL",
        registrationSource: "ADMIN",
        homeAddress: "789 Gulshan Avenue, Dhaka-1212",
        latitude: 23.7806,
        longitude: 90.4193,
      },
    });

    await prisma.technicianProfile.create({
      data: {
        userId: tech3.id,
        type: "INTERNAL",
        commissionRate: 0.05,
        bonusRate: 0.05,
        useCustomRate: false, // Uses system default
        baseSalary: 30000,
        status: "ACTIVE",
        specialization: "PLUMBING",
      },
    });

    await prisma.wallet.create({
      data: {
        technicianId: tech3.id,
        balance: 0,
      },
    });
    console.log("✅ Created Internal Technician (Rahim - 5% system default)");

    // Create Customer
    const customerHash = await bcrypt.hash("customer123", 10);
    const customer = await prisma.user.create({
      data: {
        phone: "01744444444",
        passwordHash: customerHash,
        name: "Farhan Customer",
        email: "farhan@customer.com",
        role: "CUSTOMER",
        registrationSource: "SELF_REGISTERED",
        homeAddress: "321 Banani Road, Dhaka-1213",
        latitude: 23.7937,
        longitude: 90.4066,
      },
    });
    console.log(
      "✅ Created Customer (phone: 01744444444, password: customer123)"
    );

    // Create Categories and Services
    const category = await prisma.category.create({
      data: {
        name: "Electrical Services",
        description: "All electrical repair and installation services",
        isActive: true,
      },
    });

    const service = await prisma.service.create({
      data: {
        categoryId: category.id,
        name: "Electrical Repair",
        description: "General electrical repair services",
      },
    });

    const subservice = await prisma.subservice.create({
      data: {
        serviceId: service.id,
        name: "Fan Repair",
        description: "Ceiling and table fan repair",
        baseRate: 500,
      },
    });
    console.log("✅ Created Category, Service, and Subservice");

    console.log("\n✅ DATABASE RESET COMPLETE!\n");
    console.log("═".repeat(60));
    console.log("\n📋 LOGIN CREDENTIALS:\n");
    console.log("👤 Admin:");
    console.log("   Phone: 01700000000");
    console.log("   Password: admin123\n");
    console.log("👤 Dispatcher:");
    console.log("   Phone: 01700000001");
    console.log("   Password: dispatcher123\n");
    console.log("👤 Technicians:");
    console.log("   Phone: 01711111111 (Ahmed - Freelancer)");
    console.log("   Phone: 01722222222 (Karim - Freelancer)");
    console.log("   Phone: 01733333333 (Rahim - Internal)");
    console.log("   Password: tech123\n");
    console.log("👤 Customer:");
    console.log("   Phone: 01744444444");
    console.log("   Password: customer123\n");
    console.log("═".repeat(60));
    console.log(
      "\n💡 All technicians start with 5% commission rate (system default)"
    );
    console.log("💡 To set custom rate: PATCH /api/admin/users/:id/profile");
    console.log('💡 Body: { "commissionRate": 0.18 }\n');
  } catch (error) {
    console.error("\n❌ Error during database reset:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase();
