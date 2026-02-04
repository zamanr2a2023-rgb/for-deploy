/** @format */

// test_specialization_system.js
// Test script to verify the specialization CRUD system is working

import { PrismaClient } from "@prisma/client";
import * as specializationService from "./src/services/specialization.service.js";

const prisma = new PrismaClient();

async function testSpecializationSystem() {
  console.log("🔧 Testing Specialization System...\n");

  try {
    // First, check if we have an admin user
    const adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (!adminUser) {
      console.log("❌ No admin user found. Please create an admin user first.");
      return;
    }

    console.log(`✅ Found admin user: ${adminUser.name} (ID: ${adminUser.id})`);
    const adminId = adminUser.id;

    // Test 1: Seed default specializations
    console.log("\n1️⃣ Seeding default specializations...");
    const seededSpecializations =
      await specializationService.seedDefaultSpecializations(adminId);
    console.log(`✅ Seeded ${seededSpecializations.length} specializations:`);
    seededSpecializations.forEach((spec) => {
      console.log(
        `   - ${spec.name} (${spec.isActive ? "Active" : "Inactive"})`,
      );
    });

    // Test 2: Get all specializations
    console.log("\n2️⃣ Getting all specializations...");
    const allSpecializations = await specializationService.getSpecializations();
    console.log(`✅ Found ${allSpecializations.length} specializations total`);

    // Test 3: Get only active specializations
    console.log("\n3️⃣ Getting only active specializations...");
    const activeSpecializations =
      await specializationService.getSpecializations({ activeOnly: true });
    console.log(
      `✅ Found ${activeSpecializations.length} active specializations`,
    );

    // Test 4: Create a new custom specialization
    console.log("\n4️⃣ Creating custom specialization...");
    const customSpecialization =
      await specializationService.createSpecialization(
        {
          name: "Smart Home Systems",
          description:
            "Installation and maintenance of smart home automation systems",
        },
        adminId,
      );
    console.log(
      `✅ Created: ${customSpecialization.name} (ID: ${customSpecialization.id})`,
    );

    // Test 5: Update a specialization
    console.log("\n5️⃣ Updating specialization...");
    const updatedSpecialization =
      await specializationService.updateSpecialization(
        customSpecialization.id,
        {
          description:
            "Complete smart home automation solutions and IoT device integration",
        },
      );
    console.log(`✅ Updated description for: ${updatedSpecialization.name}`);

    // Test 6: Get specialization statistics
    console.log("\n6️⃣ Getting specialization statistics...");
    const stats = await specializationService.getSpecializationStats();
    console.log(`✅ Statistics for ${stats.length} specializations:`);
    stats.forEach((stat) => {
      console.log(`   - ${stat.name}: ${stat.technicianCount} technicians`);
    });

    // Test 7: Test duplicate prevention
    console.log("\n7️⃣ Testing duplicate name prevention...");
    try {
      await specializationService.createSpecialization(
        {
          name: "Smart Home Systems", // This should fail - duplicate
          description: "Duplicate test",
        },
        adminId,
      );
      console.log("❌ Duplicate prevention failed!");
    } catch (error) {
      if (error.message.includes("already exists")) {
        console.log("✅ Duplicate name prevention working correctly");
      } else {
        console.log(`❌ Unexpected error: ${error.message}`);
      }
    }

    // Test 8: Soft delete (deactivate)
    console.log("\n8️⃣ Testing deactivation...");
    const deactivated = await specializationService.updateSpecialization(
      customSpecialization.id,
      { isActive: false },
    );
    console.log(`✅ Deactivated: ${deactivated.name}`);

    // Test 9: Verify active-only filter works
    console.log("\n9️⃣ Verifying active-only filter...");
    const activeAfterDeactivation =
      await specializationService.getSpecializations({ activeOnly: true });
    const isCustomHidden = !activeAfterDeactivation.some(
      (s) => s.id === customSpecialization.id,
    );
    console.log(
      `✅ Active-only filter ${isCustomHidden ? "correctly excludes" : "❌ fails to exclude"} deactivated specialization`,
    );

    console.log("\n🎉 All tests completed successfully!");
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error("Stack trace:", error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testSpecializationSystem();
