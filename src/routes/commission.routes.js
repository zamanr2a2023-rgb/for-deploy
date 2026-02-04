/** @format */

// src/routes/commission.routes.js
import { Router } from "express";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import {
  getWalletBalance,
  getMyCommissions,
  getTechnicianDashboard,
  requestPayout,
  getPayoutRequests,
  reviewPayoutRequest,
  runWeeklyPayout,
} from "../controllers/commission.controller.js";

const router = Router();

// Technician routes
router.get(
  "/wallet",
  authMiddleware,
  requireRole("TECH_INTERNAL", "TECH_FREELANCER"),
  getWalletBalance
);
router.get(
  "/my-commissions",
  authMiddleware,
  requireRole("TECH_INTERNAL", "TECH_FREELANCER"),
  getMyCommissions
);
router.get(
  "/dashboard",
  authMiddleware,
  requireRole("TECH_INTERNAL", "TECH_FREELANCER"),
  getTechnicianDashboard
);
router.post(
  "/payout-request",
  authMiddleware,
  requireRole("TECH_INTERNAL", "TECH_FREELANCER"),
  requestPayout
);
router.get(
  "/my-payout-requests",
  authMiddleware,
  requireRole("TECH_INTERNAL", "TECH_FREELANCER"),
  getPayoutRequests
);

// Admin routes
router.get(
  "/payout-requests",
  authMiddleware,
  requireRole("ADMIN", "DISPATCHER"),
  getPayoutRequests
);
router.patch(
  "/payout-requests/:id",
  authMiddleware,
  requireRole("ADMIN"),
  reviewPayoutRequest
);

// Admin triggers weekly payout (you can later move to cron)
router.post(
  "/payouts/weekly",
  authMiddleware,
  requireRole("ADMIN"),
  runWeeklyPayout
);

export default router;
