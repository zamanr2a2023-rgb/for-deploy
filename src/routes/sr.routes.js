/** @format */

// src/routes/sr.routes.js
import { Router } from "express";
import {
  authMiddleware,
  optionalAuth,
  requireRole,
} from "../middleware/auth.js";
import {
  createSR,
  listSR,
  getMySRs,
  getSRById,
  cancelSR,
  rejectSR,
  searchCustomer,
  rebookService,
  bookAgain,
  getRecentServices,
} from "../controllers/sr.controller.js";

const router = Router();

// Search customer by phone (Call Center only)
router.get(
  "/search-customer",
  authMiddleware,
  requireRole("CALL_CENTER", "DISPATCHER", "ADMIN"),
  searchCustomer
);

// Customer / Guest create SR (optional auth - supports both authenticated and guest users)
router.post("/", optionalAuth, createSR);

// Get Recent Services - Simple list for dashboard
router.get("/recent", authMiddleware, getRecentServices);

// Get My SRs - Dedicated endpoint for customers with readable status
router.get("/my", authMiddleware, requireRole("CUSTOMER"), getMySRs);

// List SRs - Customers see their own, Dispatcher/Admin/Call Center see all
router.get(
  "/",
  authMiddleware,
  requireRole("CUSTOMER", "DISPATCHER", "ADMIN", "CALL_CENTER"),
  listSR
);

// Get SR by ID (srNumber)
router.get(
  "/:id",
  authMiddleware,
  requireRole("CUSTOMER", "DISPATCHER", "ADMIN", "CALL_CENTER"),
  getSRById
);

// Cancel SR - Customers can cancel their own, Dispatcher/Admin/Call Center can cancel any
router.patch(
  "/:id/cancel",
  authMiddleware,
  requireRole("CUSTOMER", "DISPATCHER", "ADMIN", "CALL_CENTER"),
  cancelSR
);

// Reject SR - Only Dispatcher/Admin/Call Center can reject
router.patch(
  "/:id/reject",
  authMiddleware,
  requireRole("DISPATCHER", "ADMIN", "CALL_CENTER"),
  rejectSR
);

// Rebook Service - Customers can rebook completed services with new date/time
router.post(
  "/:srId/rebook",
  authMiddleware,
  requireRole("CUSTOMER"),
  rebookService
);

// Book Again - Simplified version that copies SR exactly
router.post(
  "/:srId/book-again",
  authMiddleware,
  requireRole("CUSTOMER"),
  bookAgain
);

export default router;
