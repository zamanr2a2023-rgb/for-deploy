/** @format */

// src/routes/auth.routes.js
import { Router } from "express";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import {
  register,
  setPassword,
  login,
  logout,
  changePassword,
  getProfile,
  updateProfile,
  updateCustomerProfile,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", register); // Legacy endpoint (requires OTP in body)
router.post("/set-password", setPassword); // New flow: verify OTP first, then set password
router.post("/employee/register", register); // Employee registration (Step 1: Enter details + send OTP)
router.post("/employee/verify-otp", setPassword); // Employee OTP verification (Step 2: Verify code)
router.post("/employee/set-password", setPassword); // Employee password setup (Step 3: Create password)
router.post("/login", login);
router.post("/logout", authMiddleware, logout);
router.post("/change-password", authMiddleware, changePassword);

// Profile management routes
router.get("/profile", authMiddleware, getProfile);
router.patch("/profile", authMiddleware, updateProfile);

// CALL_CENTER can update any customer's profile
router.patch(
  "/customer/:userId",
  authMiddleware,
  requireRole("CALL_CENTER", "ADMIN"),
  updateCustomerProfile
);

export default router;
