/** @format */

// src/routes/payment.routes.js
import { Router } from "express";
import multer from "multer";
import os from "os";
import path from "path";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import {
  getAllPayments,
  getPaymentById,
  uploadPaymentProof,
  verifyPayment,
  getPaymentStats,
} from "../controllers/payment.controller.js";

const router = Router();

// Configure multer for temporary file storage (will be uploaded to external service)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, os.tmpdir()); // Use system temp directory
  },
  filename: (req, file, cb) => {
    cb(
      null,
      "payment-" +
        Date.now() +
        "-" +
        Math.round(Math.random() * 1e9) +
        path.extname(file.originalname),
    );
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only JPEG, PNG, and GIF images are allowed.",
        ),
      );
    }
  },
});

// Get all payments (Admin/Dispatcher)
router.get(
  "/",
  authMiddleware,
  requireRole("ADMIN", "DISPATCHER"),
  getAllPayments,
);

// Get payment statistics (must be before /:id to avoid matching "stats" as id)
router.get(
  "/stats",
  authMiddleware,
  requireRole("ADMIN", "DISPATCHER"),
  getPaymentStats,
);

// Get payment statistics (alternative path)
router.get(
  "/stats/overview",
  authMiddleware,
  requireRole("ADMIN", "DISPATCHER"),
  getPaymentStats,
);

// Get payment by ID (must be after specific routes like /stats)
router.get(
  "/:id",
  authMiddleware,
  requireRole("ADMIN", "DISPATCHER", "TECH_INTERNAL", "TECH_FREELANCER"),
  getPaymentById,
);

// Technician uploads payment proof (multipart/form-data)
router.post(
  "/",
  authMiddleware,
  requireRole("TECH_INTERNAL", "TECH_FREELANCER"),
  upload.single("proof"),
  uploadPaymentProof,
);

// Dispatcher/Admin verifies payment
router.patch(
  "/:id/verify",
  authMiddleware,
  requireRole("DISPATCHER", "ADMIN"),
  verifyPayment,
);

export default router;
