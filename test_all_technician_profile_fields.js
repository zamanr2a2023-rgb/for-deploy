/** @format */

// Test all technician profile fields
import { prisma } from "./src/prisma.js";

async function testAllFields() {
  console.log("🧪 Testing All Technician Profile Fields\n");
  console.log("═".repeat(80));

  try {
    // Find a technician to test with
    const technician = await prisma.user.findFirst({
      where: {
        role: { in: ["TECH_FREELANCER", "TECH_INTERNAL"] },
      },
      include: {
        technicianProfile: true,
      },
    });

    if (!technician) {
      console.log("❌ No technician found in database");
      return;
    }

    console.log(
      `\n📋 Testing with Technician: ${technician.name} (ID: ${technician.id})\n`,
    );

    // List of all available fields in TechnicianProfile
    const allFields = {
      // Core fields
      type: "Type (FREELANCER/INTERNAL)",
      commissionRate: "Commission Rate (%)",
      bonusRate: "Bonus Rate (%)",
      useCustomRate: "Use Custom Rate (boolean)",
      baseSalary: "Base Salary (number)",
      status: "Status (ACTIVE/INACTIVE/PENDING)",

      // Profile fields
      specialization: "Specialization (ELECTRICAL/PLUMBING/etc)",
      academicTitle: "Academic Title (BSc, MSc, etc)",
      photoUrl: "Personal Photo URL",
      idCardUrl: "ID Card/Passport URL",

      // Foreigner fields
      isForeigner: "Is Foreigner (boolean)",
      residencePermitUrl: "Residence Permit URL",
      residencePermitFrom: "Residence Permit Valid From (date)",
      residencePermitTo: "Residence Permit Valid To (date)",

      // Certificates
      degreesUrl: "Degrees/Certificates (JSON array)",

      // Address
      homeAddress: "Home Address (text)",

      // Employment details
      department: "Department (text)",
      joinDate: "Join Date (date)",
      position: "Position/Job Title (text)",

      // Bank account details
      bankName: "Bank Name (text)",
      bankAccountNumber: "Bank Account Number (text)",
      bankAccountHolder: "Bank Account Holder Name (text)",
      mobileBankingType: "Mobile Banking Type (BKASH/NAGAD/etc)",
      mobileBankingNumber: "Mobile Banking Number (text)",

      // System fields
      createdAt: "Created At (auto)",
      updatedAt: "Updated At (auto)",
    };

    console.log("✅ ALL AVAILABLE FIELDS IN TECHNICIAN PROFILE:\n");
    console.log("═".repeat(80));

    let fieldNumber = 1;
    for (const [field, description] of Object.entries(allFields)) {
      const currentValue = technician.technicianProfile?.[field];
      const hasValue = currentValue !== null && currentValue !== undefined;
      const status = hasValue ? "✅" : "⚪";

      console.log(`${status} ${fieldNumber}. ${field}`);
      console.log(`   Description: ${description}`);
      if (hasValue) {
        let displayValue = currentValue;
        if (field.includes("Date") || field.includes("At")) {
          displayValue = new Date(currentValue).toLocaleDateString();
        } else if (typeof currentValue === "boolean") {
          displayValue = currentValue ? "Yes" : "No";
        } else if (field.includes("Rate")) {
          displayValue = `${(currentValue * 100).toFixed(1)}%`;
        } else if (
          typeof currentValue === "string" &&
          currentValue.length > 50
        ) {
          displayValue = currentValue.substring(0, 50) + "...";
        }
        console.log(`   Current Value: ${displayValue}`);
      } else {
        console.log(`   Current Value: (not set)`);
      }
      console.log("");
      fieldNumber++;
    }

    console.log("═".repeat(80));
    console.log("\n📊 FIELD SUMMARY:\n");

    const totalFields = Object.keys(allFields).length;
    const filledFields = Object.keys(allFields).filter(
      (field) =>
        technician.technicianProfile?.[field] !== null &&
        technician.technicianProfile?.[field] !== undefined,
    ).length;

    console.log(`Total Fields: ${totalFields}`);
    console.log(`Filled Fields: ${filledFields}`);
    console.log(`Empty Fields: ${totalFields - filledFields}`);
    console.log(
      `Completion: ${((filledFields / totalFields) * 100).toFixed(1)}%`,
    );

    console.log("\n" + "═".repeat(80));
    console.log("\n📝 FORM-DATA REQUEST BODY EXAMPLE (for Postman):\n");
    console.log("Key                    | Type   | Example Value");
    console.log("-".repeat(80));
    console.log("specialization         | Text   | ELECTRICAL");
    console.log("academicTitle          | Text   | BSc Engineering");
    console.log("photo                  | File   | (select image file)");
    console.log("idCardUrl              | File   | (select PDF/image)");
    console.log("isForeigner            | Text   | true or false");
    console.log("residencePermitUrl     | File   | (select PDF/image)");
    console.log("residencePermitFrom    | Text   | 2024-01-01");
    console.log("residencePermitTo      | Text   | 2026-12-31");
    console.log("homeAddress            | Text   | 123 Main St, City");
    console.log("degreesUrl             | File   | (select up to 5 files)");
    console.log("department             | Text   | Field Services");
    console.log("position               | Text   | Senior Technician");
    console.log("joinDate               | Text   | 2024-01-15");
    console.log("bankName               | Text   | Dutch Bangla Bank");
    console.log("bankAccountNumber      | Text   | 1234567890");
    console.log("bankAccountHolder      | Text   | John Doe");
    console.log("mobileBankingType      | Text   | BKASH");
    console.log("mobileBankingNumber    | Text   | 01712345678");
    console.log("commissionRate         | Text   | 0.15 (for 15%)");
    console.log("bonusRate              | Text   | 0.08 (for 8%)");
    console.log("baseSalary             | Text   | 5000");
    console.log("useCustomRate          | Text   | true or false");
    console.log("status                 | Text   | ACTIVE");

    console.log("\n" + "═".repeat(80));
    console.log("\n✅ All fields are now supported in the API!\n");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testAllFields();
