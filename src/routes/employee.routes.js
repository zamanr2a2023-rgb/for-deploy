/** @format */

// src/routes/employee.routes.js
import { Router } from "express";
import {
  initiateEmployeeRegistration,
  verifyEmployeeOTP,
  completeEmployeeRegistration,
  resendEmployeeOTP,
} from "../controllers/employee.controller.js";

const router = Router();

/**
 * Employee Registration Flow (3 Steps)
 */

// Step 1: Enter details and send OTP
router.post("/register/initiate", initiateEmployeeRegistration);

// Step 2: Verify OTP code
router.post("/register/verify-otp", verifyEmployeeOTP);

// Step 3: Set password and create account
router.post("/register/complete", completeEmployeeRegistration);

// Resend OTP
router.post("/register/resend-otp", resendEmployeeOTP);

export default router;
