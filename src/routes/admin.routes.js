/** @format */

// src/routes/admin.routes.js
import { Router } from "express";
import multer from "multer";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import {
  getDashboard,
  listUsers,
  listCustomers,
  createUser,
  updateUser,
  resetUserPassword,
  blockTechnician,
  updateTechnicianProfile,
  getAuditLogs,
  getTechnicianLocations,
  getTop5Technicians,
  createWeeklyPayoutBatch,
  getInProgressWorkOrders,
  getTechnicianStatusSummary,
  getWorkOrderAuditTrail,
  getTechnicianStats,
  getSystemConfig,
  updateSystemConfig,
} from "../controllers/admin.controller.js";

const router = Router();

// Configure multer for profile image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Organize files by type
    let subDir = "";
    if (file.fieldname === "photoUrl") {
      subDir = "profiles";
    } else if (
      ["idCardUrl", "residencePermitUrl", "degreesUrl"].includes(file.fieldname)
    ) {
      subDir = "documents";
    }
    const uploadPath = subDir ? `uploads/${subDir}` : "uploads";
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Create unique filename with timestamp and field type
    const timestamp = Date.now();
    const fieldPrefix = file.fieldname.replace("Url", "");
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.]/g, "_");
    const filename = `${fieldPrefix}-${timestamp}-${sanitizedName}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "application/pdf",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only JPEG, PNG, GIF, and PDF are allowed.",
        ),
      );
    }
  },
});

// Admin only routes
router.get(
  "/dashboard",
  authMiddleware,
  requireRole("ADMIN", "DISPATCHER"),
  getDashboard,
);
router.get(
  "/users",
  authMiddleware,
  requireRole("ADMIN", "DISPATCHER"),
  listUsers,
);
router.get(
  "/customers",
  authMiddleware,
  requireRole("ADMIN", "DISPATCHER", "CALL_CENTER"),
  listCustomers,
);
router.post(
  "/users",
  authMiddleware,
  requireRole("ADMIN", "DISPATCHER"),
  createUser,
);
router.patch("/users/:id", authMiddleware, requireRole("ADMIN"), updateUser);
router.post(
  "/users/:id/reset-password",
  authMiddleware,
  requireRole("ADMIN"),
  resetUserPassword,
);
router.patch(
  "/users/:id/block",
  authMiddleware,
  requireRole("ADMIN", "DISPATCHER"),
  blockTechnician,
);
router.patch(
  "/users/:id/profile",
  authMiddleware,
  requireRole("ADMIN", "DISPATCHER"),
  upload.fields([
    { name: "photoUrl", maxCount: 1 },
    { name: "photo", maxCount: 1 }, // Alternative field name
    { name: "idCardUrl", maxCount: 1 },
    { name: "residencePermitUrl", maxCount: 1 },
    { name: "degreesUrl", maxCount: 5 },
  ]),
  updateTechnicianProfile,
);

// Alternative route path for technician profile update
router.put(
  "/technician/:id/profile",
  authMiddleware,
  requireRole("ADMIN", "DISPATCHER"),
  upload.fields([
    { name: "photoUrl", maxCount: 1 },
    { name: "photo", maxCount: 1 }, // Support both field names
    { name: "idCardUrl", maxCount: 1 },
    { name: "residencePermitUrl", maxCount: 1 },
    { name: "degreesUrl", maxCount: 5 },
  ]),
  updateTechnicianProfile,
);

router.patch(
  "/technician/:id/profile",
  authMiddleware,
  requireRole("ADMIN", "DISPATCHER"),
  upload.fields([
    { name: "photoUrl", maxCount: 1 },
    { name: "photo", maxCount: 1 },
    { name: "idCardUrl", maxCount: 1 },
    { name: "residencePermitUrl", maxCount: 1 },
    { name: "degreesUrl", maxCount: 5 },
  ]),
  updateTechnicianProfile,
);
router.get("/audit-logs", authMiddleware, requireRole("ADMIN"), getAuditLogs);
router.get(
  "/technician-locations",
  authMiddleware,
  requireRole("ADMIN", "DISPATCHER"),
  getTechnicianLocations,
);
router.get(
  "/top-5-technicians",
  authMiddleware,
  requireRole("ADMIN"),
  getTop5Technicians,
);
router.post(
  "/payouts/batch",
  authMiddleware,
  requireRole("ADMIN"),
  createWeeklyPayoutBatch,
);

// New admin endpoints
router.get(
  "/work-orders/in-progress",
  authMiddleware,
  requireRole("ADMIN"),
  getInProgressWorkOrders,
);
router.get(
  "/technicians/status-summary",
  authMiddleware,
  requireRole("ADMIN"),
  getTechnicianStatusSummary,
);
router.get(
  "/work-orders/:woId/audit-trail",
  authMiddleware,
  requireRole("ADMIN"),
  getWorkOrderAuditTrail,
);
router.get(
  "/technicians/stats",
  authMiddleware,
  requireRole("ADMIN"),
  getTechnicianStats,
);

// System configuration routes (commission/bonus rates)
router.get(
  "/system-config",
  authMiddleware,
  requireRole("ADMIN"),
  getSystemConfig,
);
router.patch(
  "/system-config",
  authMiddleware,
  requireRole("ADMIN"),
  updateSystemConfig,
);

export default router;
