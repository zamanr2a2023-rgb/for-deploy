/** @format */

// src/controllers/auth.controller.js
import * as authService from "../services/auth.service.js";
import { prisma } from "../prisma.js";

export const register = async (req, res, next) => {
  try {
    const { phone, password, name, email, otp, tempToken } = req.body;

    if (!phone || !password || !name) {
      return res
        .status(400)
        .json({ message: "Phone, name, and password are required" });
    }

    // Accept either OTP code or tempToken from OTP verification
    if (!otp && !tempToken) {
      return res
        .status(400)
        .json({ message: "OTP verification is required before registration" });
    }

    const result = await authService.registerUser(req.body);
    return res.status(201).json(result);
  } catch (err) {
    if (err.message === "Phone already registered") {
      return res.status(400).json({ message: err.message });
    }
    if (err.message === "Invalid or expired OTP") {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  }
};

export const setPassword = async (req, res, next) => {
  try {
    const { phone, password, name, email, tempToken, role } = req.body;

    if (!phone || !password || !tempToken) {
      return res
        .status(400)
        .json({ message: "Phone, password, and tempToken are required" });
    }

    // Validate password strength (minimum 6 characters as shown in UI)
    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
      });
    }

    const result = await authService.setPasswordAfterOTP({
      phone,
      password,
      name,
      email,
      tempToken,
      role, // Don't default here! Let the service retrieve from metadata
    });
    return res.status(201).json(result);
  } catch (err) {
    if (err.message === "Invalid or expired temporary token") {
      return res.status(400).json({ message: err.message });
    }
    if (err.message === "Phone already registered") {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { phone, password, fcmToken, deviceType, deviceName, deviceId } =
      req.body;

    if (!phone || !password) {
      return res
        .status(400)
        .json({ message: "Phone and password are required" });
    }

    const result = await authService.loginUser({
      phone,
      password,
      fcmToken,
      deviceType,
      deviceName,
      deviceId,
    });
    return res.json(result);
  } catch (err) {
    if (err.message === "Invalid password") {
      return res.status(401).json({ message: err.message });
    }
    if (err.message === "Password not set for this account") {
      return res.status(400).json({ message: err.message });
    }
    if (err.message === "User not found") {
      return res.status(404).json({ message: err.message });
    }
    if (err.message.includes("blocked")) {
      return res.status(403).json({ message: err.message });
    }
    next(err);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Old password and new password are required" });
    }

    const result = await authService.changeUserPassword(
      req.user.id,
      oldPassword,
      newPassword
    );
    return res.json(result);
  } catch (err) {
    if (err.message === "Invalid old password") {
      return res.status(401).json({ message: err.message });
    }
    next(err);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const profile = await authService.getUserProfile(req.user.id);
    return res.json(profile);
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Base allowed fields for all users
    const allowedFields = [
      "name",
      "email",
      "homeAddress",
      "latitude",
      "longitude",
    ];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Technician-specific fields
    if (userRole === "TECH_INTERNAL" || userRole === "TECH_FREELANCER") {
      const technicianFields = {
        status: req.body.status, // ACTIVE, INACTIVE, ON_BREAK
        specialization: req.body.specialization, // Skills array or comma-separated
        skills: req.body.skills, // Array of skills
        academicTitle: req.body.academicTitle,
        photoUrl: req.body.photoUrl,
        degreesUrl: req.body.degreesUrl, // Certifications array
        certifications: req.body.certifications, // Array of certifications
        bankName: req.body.bankName,
        bankAccountNumber: req.body.bankAccountNumber,
        bankAccountHolder: req.body.bankAccountHolder,
        mobileBankingType: req.body.mobileBankingType,
        mobileBankingNumber: req.body.mobileBankingNumber,
      };

      // Convert skills array to specialization string
      if (technicianFields.skills && Array.isArray(technicianFields.skills)) {
        technicianFields.specialization = JSON.stringify(
          technicianFields.skills
        );
        delete technicianFields.skills;
      }

      // Convert certifications array to degreesUrl string
      if (
        technicianFields.certifications &&
        Array.isArray(technicianFields.certifications)
      ) {
        technicianFields.degreesUrl = JSON.stringify(
          technicianFields.certifications
        );
        delete technicianFields.certifications;
      }

      // Update technician profile
      const techProfileUpdates = {};
      for (const [key, value] of Object.entries(technicianFields)) {
        if (value !== undefined) {
          techProfileUpdates[key] = value;
        }
      }

      if (Object.keys(techProfileUpdates).length > 0) {
        await prisma.technicianProfile.update({
          where: { userId },
          data: techProfileUpdates,
        });
      }
    }

    // Update base user fields if any
    if (Object.keys(updates).length > 0) {
      await authService.updateUserProfile(userId, updates);
    }

    // Return updated profile
    const updatedProfile = await authService.getUserProfile(userId);
    return res.json(updatedProfile);
  } catch (err) {
    if (err.message === "Email already in use") {
      return res.status(400).json({ message: err.message });
    }
    next(err);
  }
};

export const updateCustomerProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const allowedFields = ["name", "email"];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const updatedProfile = await authService.updateUserProfile(
      parseInt(userId),
      updates
    );
    return res.json(updatedProfile);
  } catch (err) {
    if (err.message === "Email already in use") {
      return res.status(400).json({ message: err.message });
    }
    if (err.message === "User not found") {
      return res.status(404).json({ message: err.message });
    }
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userName = req.user.name || req.user.phone;

    // Log the logout action
    await authService.logoutUser(userId);

    return res.json({
      message: "Logout successful",
      user: userName,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};
