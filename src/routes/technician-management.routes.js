/** @format */

// src/routes/technician-management.routes.js
import { Router } from "express";
import multer from "multer";
import os from "os";
import path from "path";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import {
  getTechnicianOverview,
  getTechniciansDirectory,
  getTechnicianDetails,
  createTechnician,
  updateTechnician,
  toggleBlockTechnician,
  uploadTechnicianDocuments,
  exportTechniciansCSV,
} from "../controllers/technician-management.controller.js";

const router = Router();

// Configure multer for temporary file storage (files will be uploaded to external service)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use system temp directory instead of project folder
    cb(null, os.tmpdir());
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    cb(
      null,
      `temp-${Date.now()}-${Math.random().toString(36).substring(7)}-${
        file.originalname
      }`
    );
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
      "image/webp",
      "application/pdf",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error("Invalid file type. Only images and PDF files are allowed.")
      );
    }
  },
});

// All routes require Admin or Dispatcher role
router.use(authMiddleware, requireRole("ADMIN", "DISPATCHER"));

// Get overview statistics
router.get("/overview", getTechnicianOverview);

// Get technicians directory (list with filters)
router.get("/directory", getTechniciansDirectory);

// Export technicians to CSV
router.get("/export", exportTechniciansCSV);

// Get single technician details
router.get("/:id", getTechnicianDetails);

// Create new technician (supports both JSON and multipart/form-data)
router.post(
  "/",
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "idCardUrl", maxCount: 1 },
    { name: "degreesUrl", maxCount: 5 },
  ]),
  createTechnician
);

// Update technician (supports both JSON and multipart/form-data)
router.patch(
  "/:id",
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "idCardUrl", maxCount: 1 },
    { name: "degreesUrl", maxCount: 5 },
  ]),
  updateTechnician
);

// Block/unblock technician
router.patch("/:id/block", toggleBlockTechnician);

// Upload technician documents
router.patch(
  "/:id/documents",
  upload.fields([
    { name: "photoUrl", maxCount: 1 },
    { name: "idCardUrl", maxCount: 1 },
    { name: "residencePermitUrl", maxCount: 1 },
    { name: "degreesUrl", maxCount: 5 },
  ]),
  uploadTechnicianDocuments
);

export default router;
