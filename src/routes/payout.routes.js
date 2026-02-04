/** @format */

// src/routes/payout.routes.js
import { Router } from "express";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import {
  getPayoutSummary,
  getPendingCommissions,
  getEarlyPayoutRequests,
  createWeeklyBatch,
  getPayoutBatches,
  getPayoutHistory,
  processPayoutBatch,
  markBatchPaid,
  approveEarlyPayout,
  rejectEarlyPayout,
  getPayoutById,
} from "../controllers/payout.controller.js";

const router = Router();

// All routes require Admin role
router.use(authMiddleware, requireRole("ADMIN"));

// Get payout dashboard summary
router.get("/summary", getPayoutSummary);

// Get pending commissions & bonuses
router.get("/pending-commissions", getPendingCommissions);

// Get early payout requests
router.get("/early-requests", getEarlyPayoutRequests);

// Create weekly payout batch
router.post("/batches", createWeeklyBatch);

// Get payout batches
router.get("/batches", getPayoutBatches);

// Get payout by ID with details
router.get("/batches/:id", getPayoutById);

// Get payout history
router.get("/history", getPayoutHistory);

// Process/complete a payout batch (auto deducts from wallet)
router.patch("/batches/:id/process", processPayoutBatch);

// Mark payout batch as paid (manual confirmation after external payment)
router.post("/batches/:id/mark-paid", markBatchPaid);

// Approve early payout request
router.patch("/early-requests/:id/approve", approveEarlyPayout);

// Reject early payout request
router.patch("/early-requests/:id/reject", rejectEarlyPayout);

export default router;
