/** @format */

import { Router } from "express";
import * as technicianController from "../controllers/technician.controller.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/technician/dashboard
 * @desc    Get technician dashboard statistics
 * @access  Private - Technicians only
 */
router.get("/dashboard", technicianController.getDashboard);

/**
 * @route   GET /api/technician/jobs
 * @desc    Get technician's jobs by status
 * @query   status - Filter by status (incoming, active, done)
 * @access  Private - Technicians only
 */
router.get("/jobs", technicianController.getJobs);

/**
 * @route   GET /api/technician/work-orders
 * @desc    Get technician's work orders
 * @query   status - Filter by status (active, in_progress, completed, ready)
 * @access  Private - Technicians only
 */
router.get("/work-orders", technicianController.getWorkOrders);

/**
 * @route   GET /api/technician/wallet
 * @desc    Get technician's wallet balance and transactions
 * @access  Private - Freelancer technicians only
 */
router.get("/wallet", technicianController.getWallet);

/**
 * @route   GET /api/technician/earnings
 * @desc    Get technician's earnings summary (bonus rate, monthly salary, recent bonuses)
 * @access  Private - Technicians only
 */
router.get("/earnings", technicianController.getEarnings);

/**
 * @route   GET /api/technician/work-history
 * @desc    Get technician's complete work history with all work orders
 * @access  Private - Technicians only
 */
router.get("/work-history", technicianController.getWorkHistory);

export default router;
