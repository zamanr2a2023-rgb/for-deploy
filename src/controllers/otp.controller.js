/** @format */

// src/controllers/otp.controller.js
import * as otpService from "../services/otp.service.js";
import { isValidPhone } from "../utils/phone.js";

export const sendOTP = async (req, res, next) => {
  try {
    const { phone, type, name, role } = req.body;

    if (!phone || !type) {
      return res.status(400).json({ message: "Phone and type are required" });
    }

    // For REGISTRATION type, name and role are required
    if (type === "REGISTRATION" && !name) {
      return res
        .status(400)
        .json({ message: "Name is required for registration" });
    }

    // Validate role if provided
    if (role) {
      const validRoles = [
        "CUSTOMER",
        "TECH_FREELANCER",
        "TECH_INTERNAL",
        "DISPATCHER",
        "CALL_CENTER",
        "ADMIN",
      ];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          message: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
        });
      }
    }

    // Validate phone format (exactly 8 digits starting with 2, 3, or 4)
    if (!isValidPhone(phone)) {
      return res.status(400).json({
        message:
          "Invalid phone format. Must be exactly 8 digits starting with 2, 3, or 4 (e.g., 22345678, 31234567, 45678901)",
      });
    }

    // Validate type
    const validTypes = [
      "LOGIN",
      "REGISTRATION",
      "PASSWORD_RESET",
      "VERIFICATION",
    ];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        message: `Invalid type. Must be one of: ${validTypes.join(", ")}`,
      });
    }

    const result = await otpService.sendOTP(phone, type, name, role);

    return res.json(result);
  } catch (err) {
    console.error("Error in sendOTP controller:", err);
    next(err);
  }
};

export const verifyOTP = async (req, res, next) => {
  try {
    const { phone, code, type } = req.body;

    if (!phone || !code || !type) {
      return res
        .status(400)
        .json({ message: "Phone, code and type are required" });
    }

    // Validate OTP code format (6 digits)
    const codeRegex = /^[0-9]{6}$/;
    if (!codeRegex.test(code)) {
      return res.status(400).json({
        message: "Invalid OTP format. OTP must be 6 digits",
      });
    }

    const result = await otpService.verifyOTPByCode(phone, code, type);

    return res.json(result);
  } catch (err) {
    if (err.message === "Invalid or expired OTP") {
      return res.status(400).json({ message: err.message });
    }
    console.error("Error in verifyOTP controller:", err);
    next(err);
  }
};
