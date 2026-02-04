/** @format */

import express from "express";
import { getCallCenterStats } from "../controllers/call-center.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = express.Router();

// Get dashboard stats - accessible by CALL_CENTER, ADMIN, and DISPATCHER
router.get(
  "/dashboard/stats",
  authenticate,
  requireRole("CALL_CENTER", "ADMIN", "DISPATCHER"),
  getCallCenterStats,
);

export default router;
