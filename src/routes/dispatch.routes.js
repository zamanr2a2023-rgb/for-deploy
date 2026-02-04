/** @format */

// src/routes/dispatch.routes.js
import { Router } from "express";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import {
  getDispatchOverview,
  getTechnicianStatus,
  getRecentWorkOrders,
  getTechnicianLocations,
} from "../controllers/dispatch.controller.js";

const router = Router();

// All dispatch routes require DISPATCHER, ADMIN, or CALL_CENTER role
router.use(authMiddleware);
router.use(requireRole("DISPATCHER", "ADMIN", "CALL_CENTER"));

// Get dispatch overview statistics
router.get("/overview", getDispatchOverview);

// Get technician status summary
router.get("/technician-status", getTechnicianStatus);

// Get recent work orders
router.get("/recent-work-orders", getRecentWorkOrders);

// Get technician locations for map view
router.get("/technician-locations", getTechnicianLocations);

export default router;
