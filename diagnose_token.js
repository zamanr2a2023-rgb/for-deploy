/** @format */

// Diagnostic script for JWT token validation issues
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./src/config/env.js";
import { prisma } from "./src/prisma.js";

async function diagnoseTokenIssue() {
  console.log("=== JWT Token Diagnostic ===\n");

  // 1. Check JWT_SECRET
  console.log("1. JWT_SECRET Configuration:");
  console.log(
    `   Value: ${JWT_SECRET ? JWT_SECRET.substring(0, 10) + "..." : "NOT SET"}`,
  );
  console.log(`   Length: ${JWT_SECRET?.length || 0} characters`);

  if (!JWT_SECRET || JWT_SECRET === "supersecret") {
    console.log("   ⚠️  WARNING: Using default/weak JWT_SECRET!");
  }

  // 2. Generate a test token
  console.log("\n2. Test Token Generation:");
  const testPayload = { id: 1, role: "ADMIN", phone: "12345678" };
  try {
    const testToken = jwt.sign(testPayload, JWT_SECRET, { expiresIn: "7d" });
    console.log(`   ✅ Token generated successfully`);
    console.log(`   Token (first 50 chars): ${testToken.substring(0, 50)}...`);

    // 3. Verify the token
    console.log("\n3. Token Verification:");
    const decoded = jwt.verify(testToken, JWT_SECRET);
    console.log(`   ✅ Token verification successful`);
    console.log(`   Decoded payload:`, decoded);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // 4. Check for users with CALL_CENTER role
  console.log("\n4. Call Center Users:");
  try {
    const callCenterUsers = await prisma.user.findMany({
      where: { role: "CALL_CENTER" },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        isBlocked: true,
      },
    });

    if (callCenterUsers.length === 0) {
      console.log("   ⚠️  No CALL_CENTER users found!");
    } else {
      callCenterUsers.forEach((u) => {
        console.log(
          `   - ID: ${u.id}, Name: ${u.name}, Phone: ${u.phone}, Blocked: ${u.isBlocked}`,
        );
      });
    }
  } catch (error) {
    console.log(`   ❌ Database error: ${error.message}`);
  }

  // 5. Check for ADMIN users
  console.log("\n5. Admin Users:");
  try {
    const adminUsers = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        isBlocked: true,
      },
    });

    if (adminUsers.length === 0) {
      console.log("   ⚠️  No ADMIN users found!");
    } else {
      adminUsers.forEach((u) => {
        console.log(
          `   - ID: ${u.id}, Name: ${u.name}, Phone: ${u.phone}, Blocked: ${u.isBlocked}`,
        );
      });
    }
  } catch (error) {
    console.log(`   ❌ Database error: ${error.message}`);
  }

  // 6. Generate a fresh token for an existing user
  console.log("\n6. Fresh Token for Call Center Login:");
  try {
    const callCenterUser = await prisma.user.findFirst({
      where: { role: "CALL_CENTER", isBlocked: false },
    });

    if (callCenterUser) {
      const freshToken = jwt.sign(
        {
          id: callCenterUser.id,
          role: callCenterUser.role,
          phone: callCenterUser.phone,
        },
        JWT_SECRET,
        { expiresIn: "7d" },
      );
      console.log(`   User: ${callCenterUser.name} (ID: ${callCenterUser.id})`);
      console.log(`   Fresh Token:\n   ${freshToken}`);
      console.log(
        "\n   📋 Copy this token and use it in your Authorization header as:",
      );
      console.log(`   Bearer ${freshToken}`);
    } else {
      console.log("   ⚠️  No active CALL_CENTER user found to generate token");
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  await prisma.$disconnect();
}

diagnoseTokenIssue();
