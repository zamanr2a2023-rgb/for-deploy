/** @format */

// src/routes/specialization.routes.js
import { Router } from "express";
import * as specializationController from "../controllers/specialization.controller.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const router = Router();

/**
 * @desc Get all specializations
 * @route GET /api/specializations
 * @access Private - Admin, Dispatcher, Technician (read-only)
 */
router.get(
  "/",
  authMiddleware,
  requireRole("ADMIN", "DISPATCHER", "TECHNICIAN"),
  specializationController.getSpecializations,
);

/**
 * @desc Get specialization statistics
 * @route GET /api/specializations/stats
 * @access Private - Admin, Dispatcher
 */
router.get(
  "/stats",
  authMiddleware,
  requireRole("ADMIN", "DISPATCHER"),
  specializationController.getSpecializationStats,
);

/**
 * @desc Get specialization by ID
 * @route GET /api/specializations/:id
 * @access Private - Admin, Dispatcher, Technician (read-only)
 */
router.get(
  "/:id",
  authMiddleware,
  requireRole("ADMIN", "DISPATCHER", "TECHNICIAN"),
  specializationController.getSpecializationById,
);

/**
 * @desc Create new specialization
 * @route POST /api/specializations
 * @access Private - Admin only
 */
router.post(
  "/",
  authMiddleware,
  requireRole("ADMIN"),
  specializationController.createSpecialization,
);

/**
 * @desc Seed default specializations
 * @route POST /api/specializations/seed
 * @access Private - Admin only
 */
router.post(
  "/seed",
  authMiddleware,
  requireRole("ADMIN"),
  specializationController.seedSpecializations,
);

/**
 * @desc Update specialization
 * @route PUT /api/specializations/:id
 * @access Private - Admin only
 */
router.put(
  "/:id",
  authMiddleware,
  requireRole("ADMIN"),
  specializationController.updateSpecialization,
);

/**
 * @desc Delete specialization
 * @route DELETE /api/specializations/:id
 * @access Private - Admin only
 */
router.delete(
  "/:id",
  authMiddleware,
  requireRole("ADMIN"),
  specializationController.deleteSpecialization,
);

export default router;
