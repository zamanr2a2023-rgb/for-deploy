/** @format */

// src/routes/category.routes.js
import { Router } from "express";
import multer from "multer";
import path from "path";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  activateCategory,
  deactivateCategory,
  createSubservice,
  updateSubservice,
  deleteSubservice,
  createService,
  updateService,
  deleteService,
} from "../controllers/category.controller.js";

const router = Router();

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "category-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, and WebP are allowed."));
    }
  },
});

// Public routes
router.get("/", listCategories);

// Admin only routes
router.post(
  "/",
  authMiddleware,
  requireRole("ADMIN"),
  upload.single("image"),
  createCategory
);
router.patch(
  "/:id",
  authMiddleware,
  requireRole("ADMIN"),
  upload.single("image"),
  updateCategory
);
router.delete("/:id", authMiddleware, requireRole("ADMIN"), deleteCategory);
router.patch(
  "/:id/activate",
  authMiddleware,
  requireRole("ADMIN"),
  activateCategory
);
router.patch(
  "/:id/deactivate",
  authMiddleware,
  requireRole("ADMIN"),
  deactivateCategory
);

router.post(
  "/subservices",
  authMiddleware,
  requireRole("ADMIN"),
  createSubservice
);
router.patch(
  "/subservices/:id",
  authMiddleware,
  requireRole("ADMIN"),
  updateSubservice
);
router.delete(
  "/subservices/:id",
  authMiddleware,
  requireRole("ADMIN"),
  deleteSubservice
);

router.post("/services", authMiddleware, requireRole("ADMIN"), createService);
router.patch(
  "/services/:id",
  authMiddleware,
  requireRole("ADMIN"),
  updateService
);
router.delete(
  "/services/:id",
  authMiddleware,
  requireRole("ADMIN"),
  deleteService
);

export default router;
