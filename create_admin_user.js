/** @format */

// create_admin_user.js
// Quick script to create an admin user for testing

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function createAdminUser() {
  console.log("👨‍💼 Creating admin user for testing...");

  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (existingAdmin) {
      console.log(
        `✅ Admin user already exists: ${existingAdmin.name} (${existingAdmin.phone})`,
      );
      return existingAdmin;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash("admin123", 10);

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        name: "System Administrator",
        phone: "20000001", // 8 digits starting with 2
        passwordHash: hashedPassword,
        role: "ADMIN",
        isBlocked: false,
        registrationSource: "ADMIN",
      },
    });

    console.log(`✅ Admin user created successfully:`);
    console.log(`   Name: ${adminUser.name}`);
    console.log(`   Phone: ${adminUser.phone}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   ID: ${adminUser.id}`);

    return adminUser;
  } catch (error) {
    console.error("❌ Error creating admin user:", error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createAdminUser();
