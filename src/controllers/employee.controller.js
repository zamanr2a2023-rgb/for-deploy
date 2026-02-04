/** @format */

// src/controllers/employee.controller.js
import * as otpService from "../services/otp.service.js";
import * as authService from "../services/auth.service.js";
import { prisma } from "../prisma.js";

/**
 * Step 1: Employee Registration - Enter Details & Send OTP
 * UI: Full Name, Employee ID, Phone Number fields
 */
export const initiateEmployeeRegistration = async (req, res, next) => {
  try {
    const { name, employeeId, phone } = req.body;

    // Validate required fields
    if (!name || !employeeId || !phone) {
      return res.status(400).json({
        message: "Full name, employee ID, and phone number are required",
      });
    }

    // Validate phone format (exactly 8 digits starting with 2, 3, or 4)
    if (!isValidPhone(phone)) {
      return res.status(400).json({
        message:
          "Invalid phone format. Must be exactly 8 digits starting with 2, 3, or 4 (e.g., 22345678, 31234567, 45678901)",
      });
    }

    // Check if phone is already registered
    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Phone number already registered. Please login instead.",
      });
    }

    // TODO: In production, verify employeeId against internal employee database
    // For now, we'll accept any employeeId format

    // Send OTP with employee registration metadata
    const result = await otpService.sendOTP(phone, "REGISTRATION", name);

    // Store employeeId in OTP metadata for later verification
    await prisma.oTP.update({
      where: { id: result.otpId },
      data: {
        metadataJson: JSON.stringify({ name, employeeId }),
      },
    });

    return res.json({
      success: true,
      message: `Verification code sent to ${phone}`,
      otpId: result.otpId,
      phone: phone,
      expiresIn: 300, // 5 minutes
    });
  } catch (err) {
    console.error("Error in initiateEmployeeRegistration:", err);
    next(err);
  }
};

/**
 * Step 2: Verify OTP Code
 * UI: 6-digit OTP input, Resend OTP button
 */
export const verifyEmployeeOTP = async (req, res, next) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({
        message: "Phone number and OTP code are required",
      });
    }

    // Validate OTP code format (6 digits)
    const codeRegex = /^[0-9]{6}$/;
    if (!codeRegex.test(code)) {
      return res.status(400).json({
        message: "Invalid OTP format. OTP must be 6 digits",
      });
    }

    const result = await otpService.verifyOTPByCode(
      phone,
      code,
      "REGISTRATION",
    );

    // Get employee metadata from OTP record
    const otpRecord = await prisma.oTP.findFirst({
      where: {
        phone,
        code,
        type: "REGISTRATION",
        isUsed: false,
      },
    });

    let employeeData = {};
    if (otpRecord?.metadataJson) {
      try {
        employeeData = JSON.parse(otpRecord.metadataJson);
      } catch (e) {
        console.error("Error parsing OTP metadata:", e);
      }
    }

    return res.json({
      success: true,
      message: "Phone number verified successfully",
      tempToken: result.tempToken,
      phone: phone,
      name: employeeData.name,
      employeeId: employeeData.employeeId,
    });
  } catch (err) {
    if (err.message === "Invalid or expired OTP") {
      return res.status(400).json({ message: err.message });
    }
    console.error("Error in verifyEmployeeOTP:", err);
    next(err);
  }
};

/**
 * Step 3: Set Password & Create Account
 * UI: Password input (min 6 characters), Create Account button
 */
export const completeEmployeeRegistration = async (req, res, next) => {
  try {
    const { phone, password, tempToken, name, employeeId } = req.body;

    if (!phone || !password || !tempToken) {
      return res.status(400).json({
        message: "Phone, password, and verification token are required",
      });
    }

    // Validate password strength (min 6 characters as shown in UI)
    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
      });
    }

    // Verify tempToken
    const otpRecord = await prisma.oTP.findFirst({
      where: {
        phone,
        tempToken,
        type: "REGISTRATION",
        isUsed: false,
        tempTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!otpRecord) {
      return res.status(400).json({
        message: "Invalid or expired verification token",
      });
    }

    // Get employee metadata
    let employeeData = { name, employeeId };
    if (otpRecord.metadataJson) {
      try {
        const metadata = JSON.parse(otpRecord.metadataJson);
        employeeData = {
          name: name || metadata.name,
          employeeId: employeeId || metadata.employeeId,
        };
      } catch (e) {
        console.error("Error parsing metadata:", e);
      }
    }

    // Create internal technician account
    const result = await authService.registerUser({
      phone,
      password,
      name: employeeData.name,
      role: "TECH_INTERNAL",
      otp: otpRecord.code,
      tempToken,
    });

    // Mark OTP as used
    await prisma.oTP.update({
      where: { id: otpRecord.id },
      data: { isUsed: true },
    });

    // Create technician profile with employee details
    await prisma.technicianProfile.create({
      data: {
        userId: result.user.id,
        type: "INTERNAL",
        commissionRate: 0.05, // Default 5%, will use system config when useCustomRate=false
        bonusRate: 0.05, // Default 5%, will use system config when useCustomRate=false
        useCustomRate: false, // New employees use system default rates
        status: "ACTIVE",
        // Store employeeId in metadata or add a field to schema
        specialization: `Employee ID: ${employeeData.employeeId}`,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Employee account created successfully",
      user: {
        id: result.user.id,
        name: result.user.name,
        phone: result.user.phone,
        role: result.user.role,
      },
      token: result.token,
    });
  } catch (err) {
    if (err.message === "Phone already registered") {
      return res.status(400).json({ message: err.message });
    }
    if (err.message === "Invalid or expired OTP") {
      return res.status(400).json({ message: err.message });
    }
    console.error("Error in completeEmployeeRegistration:", err);
    next(err);
  }
};

/**
 * Resend OTP for employee registration
 */
export const resendEmployeeOTP = async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    // Get the last OTP record to retrieve employee data
    const lastOTP = await prisma.oTP.findFirst({
      where: {
        phone,
        type: "REGISTRATION",
      },
      orderBy: { createdAt: "desc" },
    });

    let name = null;
    if (lastOTP?.metadataJson) {
      try {
        const metadata = JSON.parse(lastOTP.metadataJson);
        name = metadata.name;
      } catch (e) {
        console.error("Error parsing metadata:", e);
      }
    }

    // Send new OTP
    const result = await otpService.sendOTP(phone, "REGISTRATION", name);

    // Copy metadata to new OTP record if available
    if (lastOTP?.metadataJson) {
      await prisma.oTP.update({
        where: { id: result.otpId },
        data: { metadataJson: lastOTP.metadataJson },
      });
    }

    return res.json({
      success: true,
      message: `New verification code sent to ${phone}`,
      otpId: result.otpId,
      expiresIn: 300,
    });
  } catch (err) {
    console.error("Error in resendEmployeeOTP:", err);
    next(err);
  }
};
