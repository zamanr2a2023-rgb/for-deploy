/** @format */

// src/routes/wo.routes.js
import { Router } from "express";
import multer from "multer";
import path from "path";
import os from "os";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import {
  getAllWorkOrders,
  getWOById,
  createWOFromSR,
  assignWO,
  reassignWO,
  rescheduleWO,
  respondWO,
  startWO,
  completeWO,
  cancelWO,
} from "../controllers/wo.controller.js";
import {
  getRemainingTime,
  getActiveDeadlines,
  checkAndCleanupExpiredWorkOrders,
  TIME_CONFIG,
} from "../services/timeLimit.service.js";

const router = Router();

// Configure multer for completion photos - using temp directory
// Files will be uploaded to external service and then deleted
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (req, file, cb) => {
    cb(
      null,
      `temp-wo-${Date.now()}-${Math.random().toString(36).substring(7)}-${
        file.originalname
      }`
    );
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max per file
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only images (JPEG, PNG) and PDFs are allowed"));
    }
  },
});

// Get all work orders with filtering and pagination - MUST come before /:woId
router.get("/", authMiddleware, getAllWorkOrders);

// Get work order by ID (woNumber)
router.get("/:woId", authMiddleware, getWOById);

router.post(
  "/from-sr/:srId",
  authMiddleware,
  requireRole("DISPATCHER", "ADMIN"),
  createWOFromSR
);

router.patch(
  "/:woId/assign",
  authMiddleware,
  requireRole("DISPATCHER", "ADMIN"),
  assignWO
);

router.patch(
  "/:woId/reassign",
  authMiddleware,
  requireRole("DISPATCHER", "ADMIN"),
  reassignWO
);

router.patch(
  "/:woId/reschedule",
  authMiddleware,
  requireRole("DISPATCHER", "ADMIN"),
  rescheduleWO
);

router.patch(
  "/:woId/respond",
  authMiddleware,
  requireRole("TECH_INTERNAL", "TECH_FREELANCER"),
  respondWO
);

router.patch(
  "/:woId/start",
  authMiddleware,
  requireRole("TECH_INTERNAL", "TECH_FREELANCER"),
  startWO
);

router.patch(
  "/:woId/complete",
  authMiddleware,
  requireRole("TECH_INTERNAL", "TECH_FREELANCER"),
  upload.array("photos", 5), // Max 5 photos
  completeWO
);

router.patch(
  "/:woId/cancel",
  authMiddleware,
  requireRole("DISPATCHER", "ADMIN", "CUSTOMER"),
  cancelWO
);

// Time limit management routes
router.get(
  "/:woId/time-remaining",
  authMiddleware,
  requireRole("TECH_INTERNAL", "TECH_FREELANCER", "DISPATCHER", "ADMIN"),
  (req, res) => {
    const woId = Number(req.params.woId);
    const remaining = getRemainingTime(woId);

    if (!remaining) {
      return res.json({
        message: "No active deadline for this work order",
        hasDeadline: false,
      });
    }

    res.json({
      woId,
      hasDeadline: true,
      ...remaining,
      timeConfig: TIME_CONFIG,
    });
  }
);

// Admin route to view all active deadlines
router.get(
  "/admin/active-deadlines",
  authMiddleware,
  requireRole("ADMIN", "DISPATCHER"),
  (req, res) => {
    const deadlines = getActiveDeadlines();
    res.json({
      totalActive: deadlines.length,
      deadlines: deadlines.map((d) => ({
        ...d,
        remainingMinutes: Math.ceil(d.remainingMs / (60 * 1000)),
      })),
      timeConfig: TIME_CONFIG,
    });
  }
);

// Admin route to manually cleanup expired work orders
router.post(
  "/admin/cleanup-expired",
  authMiddleware,
  requireRole("ADMIN"),
  async (req, res, next) => {
    try {
      const expired = await checkAndCleanupExpiredWorkOrders();
      res.json({
        message: `Processed ${expired.length} expired work orders`,
        expiredWorkOrders: expired,
        processedAt: new Date(),
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
