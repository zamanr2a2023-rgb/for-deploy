/** @format */

// src/services/otp.service.js
import { prisma } from "../prisma.js";
import { sendSMS } from "./sms.service.js";
import { normalizePhoneForDB, formatPhoneForSMS } from "../utils/phone.js";
import { signToken } from "../utils/jwt.js";

// Generate a random 6-digit OTP
const generateOTPCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ✅ Send OTP to phone number
export const sendOTP = async (phone, type, name = null, role = null) => {
  try {
    // Generate OTP code
    const code = generateOTPCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Normalize phone for database (without country code)
    const normalizedPhone = normalizePhoneForDB(phone);

    // Format phone number with country code for SMS
    const formattedPhone = formatPhoneForSMS(phone);

    console.log(`📱 Original phone: ${phone}`);
    console.log(`📱 Normalized phone (DB): ${normalizedPhone}`);
    console.log(`📱 Formatted phone (SMS): ${formattedPhone}`);
    if (name) {
      console.log(`👤 Registration name: ${name}`);
    }
    if (role) {
      console.log(`👤 Registration role: ${role}`);
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    // Generate JWT token if user exists (for LOGIN type)
    let jwtToken = null;
    if (user && type === "LOGIN") {
      jwtToken = signToken(
        {
          id: user.id,
          role: user.role,
          phone: user.phone,
        },
        "7d"
      ); // 7 days expiry
      console.log(`🔑 Generated JWT token for user ${user.id}`);
    }

    // Create OTP message
    const otpMessage = `Your FSM verification code is: ${code}. Valid for 5 minutes. Do not share this code with anyone.`;

    // Send OTP via BulkGate SMS API
    console.log(`📤 Sending OTP SMS to ${formattedPhone}...`);
    const smsResult = await sendSMS(formattedPhone, otpMessage, {
      unicode: 0,
      messageType: "transactional",
    });

    console.log(`📊 SMS Result:`, JSON.stringify(smsResult, null, 2));

    if (!smsResult.success) {
      console.warn(`⚠️ SMS sending failed: ${smsResult.error}`);
    } else {
      console.log(`✅ OTP SMS sent successfully to ${formattedPhone}`);
    }

    // Generate temporary token (valid for 10 minutes) for immediate use
    const tempToken = `temp_${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)}`;
    const tempTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP to database with normalized phone, temp token, and optional name/role
    const metadata = {};
    if (name) metadata.name = name;
    if (role) metadata.role = role;

    console.log(`📋 Storing metadata in OTP:`, metadata);
    console.log(`📋 JSON stringified:`, JSON.stringify(metadata));

    const otpRecord = await prisma.oTP.create({
      data: {
        phone: normalizedPhone,
        code,
        type,
        expiresAt,
        userId: user?.id,
        tempToken,
        tempTokenExpiry,
        metadataJson:
          Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null, // Store name and role for registration flow
      },
    });

    // Always log OTP code for debugging
    console.log(`📱 OTP for ${normalizedPhone}: ${code}`);
    console.log(`🔑 Temp token: ${tempToken}`);
    console.log(
      `✅ OTP record created with metadata: ${otpRecord.metadataJson}`
    );

    // Build response
    const response = {
      message: smsResult.success
        ? "OTP sent successfully"
        : "OTP generated but SMS not sent (no credits)",
      code: code, // Always return OTP code so client can see it
      expiresAt: expiresAt,
      tempToken: tempToken, // Include temp token in response
      tempTokenExpiry: tempTokenExpiry,
      smsStatus: smsResult.success ? "sent" : "failed",
    };

    // Add JWT token if user exists and it's a LOGIN request
    if (jwtToken) {
      response.token = jwtToken;
      response.user = {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      };
    }

    // Add SMS details if needed
    if (!smsResult.success && smsResult.message) {
      response.smsError = smsResult.message;
    }

    return response;
  } catch (error) {
    console.error("❌ Error in sendOTP service:", error);
    throw error;
  }
};

// ✅ Verify OTP by phone, code, and type - returns temp token
export const verifyOTPByCode = async (phone, code, type) => {
  try {
    // Normalize phone number
    const normalizedPhone = normalizePhoneForDB(phone);

    // Verify OTP from database
    const otp = await prisma.oTP.findFirst({
      where: {
        phone: normalizedPhone,
        code,
        type,
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!otp) {
      throw new Error("Invalid or expired OTP");
    }

    // Mark OTP as used
    await prisma.oTP.update({
      where: { id: otp.id },
      data: { isUsed: true },
    });

    console.log(`✅ OTP verified successfully: ${code}`);

    // Get or create user for JWT token generation
    let user = await prisma.user.findUnique({
      where: { phone: otp.phone },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
      },
    });

    // If user doesn't exist and it's a LOGIN type, create a basic account with specified role
    // For REGISTRATION type, don't auto-create - wait for setPassword endpoint with role
    if (!user && type === "LOGIN") {
      // Get role from metadata if stored during Send OTP
      let loginRole = "CUSTOMER"; // Default role for login
      if (otp.metadataJson) {
        try {
          const metadata = JSON.parse(otp.metadataJson);
          if (metadata.role) {
            loginRole = metadata.role;
          }
        } catch (e) {
          console.log("Could not parse OTP metadata for role");
        }
      }

      console.log(
        `👤 Creating new ${loginRole} account for login: ${otp.phone}`
      );
      user = await prisma.user.create({
        data: {
          phone: otp.phone,
          passwordHash: "", // Empty password, user can set it later
          role: loginRole,
          name: otp.phone, // Use phone as default name
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          role: true,
        },
      });
      console.log(`✅ Created new ${loginRole} account with ID: ${user.id}`);
    }

    // Generate JWT token for authenticated session
    let jwtToken = null;
    if (user) {
      jwtToken = signToken(
        {
          id: user.id,
          role: user.role,
          phone: user.phone,
        },
        "7d"
      ); // 7 days expiry
      console.log(`🔑 Generated JWT token for user ${user.id}`);
    }

    // Use the existing tempToken from the OTP record (it already has metadata!)
    const tempToken = otp.tempToken;
    const tempTokenExpiry = otp.tempTokenExpiry;

    console.log(`🔑 Using existing temp token from OTP: ${tempToken}`);
    console.log(`📋 OTP metadata preserved: ${otp.metadataJson}`);

    const response = {
      message: "OTP verified successfully. You can now set your password.",
      verified: true,
      phone: otp.phone,
      tempToken,
      tempTokenExpiry,
    };

    // Add JWT token if generated (for LOGIN or existing users)
    if (jwtToken) {
      response.token = jwtToken;
    }

    // Add user info only for LOGIN type (not REGISTRATION)
    if (user && type === "LOGIN") {
      response.user = {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
      };
    }

    return response;
  } catch (error) {
    console.error("❌ Error verifying OTP:", error);
    throw error;
  }
};

// ✅ Verify OTP (legacy - with phone)
export const verifyOTP = async (phone, code, type) => {
  try {
    // Normalize phone number
    const normalizedPhone = normalizePhoneForDB(phone);

    // Verify OTP from database
    const otp = await prisma.oTP.findFirst({
      where: {
        phone: normalizedPhone,
        code,
        type,
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!otp) {
      throw new Error("Invalid or expired OTP");
    }

    // Mark OTP as used
    await prisma.oTP.update({
      where: { id: otp.id },
      data: { isUsed: true },
    });

    console.log(`✅ OTP verified successfully for ${phone}`);

    return {
      message: "OTP verified successfully",
      verified: true,
    };
  } catch (error) {
    console.error("❌ Error verifying OTP:", error);
    throw error;
  }
};
