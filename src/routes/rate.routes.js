/** @format */

// src/routes/rate.routes.js
import { Router } from "express";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import {
  getRateSummary,
  getRateStructures,
  getRateStructure,
  createRateStructure,
  updateRateStructure,
  deleteRateStructure,
  setDefaultRate,
  getDefaultRate,
  // Individual technician rate management
  getTechniciansWithRates,
  getTechnicianRate,
  setTechnicianRate,
  applyRateStructureToTechnician,
  bulkApplyRateStructure,
  resetTechnicianRateToDefault,
} from "../controllers/rate.controller.js";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// =====================================
// Routes accessible by ADMIN and DISPATCHER
// =====================================

// Get default rate for a tech type (used for viewing commission rates)
// GET /api/rates/default/FREELANCER
// GET /api/rates/default/INTERNAL
router.get(
  "/default/:techType",
  requireRole("ADMIN", "DISPATCHER"),
  getDefaultRate,
);

// Dashboard summary (must be before /:id to avoid conflict)
router.get("/summary", requireRole("ADMIN", "DISPATCHER"), getRateSummary);

// Get all technicians with their rates (for assignment UI)
// Must be before /technicians/:technicianId
router.get(
  "/technicians/list",
  requireRole("ADMIN", "DISPATCHER"),
  getTechniciansWithRates,
);

// Get single technician's rate details
router.get(
  "/technicians/:technicianId",
  requireRole("ADMIN", "DISPATCHER"),
  getTechnicianRate,
);

// Get all rate structures (read-only for dispatcher)
router.get("/", requireRole("ADMIN", "DISPATCHER"), getRateStructures);

// Get single rate structure by ID (must be after specific routes like /summary, /default)
router.get("/:id", requireRole("ADMIN", "DISPATCHER"), getRateStructure);

// =====================================
// Admin-only routes (write operations)
// =====================================

// Create rate structure
router.post("/", requireRole("ADMIN"), createRateStructure);

// Update rate structure
router.patch("/:id", requireRole("ADMIN"), updateRateStructure);

// Delete rate structure
router.delete("/:id", requireRole("ADMIN"), deleteRateStructure);

// Set a rate as default
router.patch("/:id/set-default", requireRole("ADMIN"), setDefaultRate);

// Set individual rate for a technician
router.patch(
  "/technicians/:technicianId",
  requireRole("ADMIN"),
  setTechnicianRate,
);

// Apply a rate structure to a single technician
router.post(
  "/technicians/:technicianId/apply/:rateStructureId",
  requireRole("ADMIN"),
  applyRateStructureToTechnician,
);

// Reset technician's rate to default
router.post(
  "/technicians/:technicianId/reset-to-default",
  requireRole("ADMIN"),
  resetTechnicianRateToDefault,
);

// Bulk apply rate structure to multiple technicians
router.post(
  "/:rateStructureId/bulk-apply",
  requireRole("ADMIN"),
  bulkApplyRateStructure,
);

export default router;
