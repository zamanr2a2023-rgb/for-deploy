// src/routes/review.routes.js
import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import {
  createReview,
  getTechnicianReviews,
  getWOReview
} from '../controllers/review.controller.js';

const router = Router();

// Customer creates review
router.post(
  '/',
  authMiddleware,
  requireRole('CUSTOMER'),
  createReview
);

// Get technician's reviews (anyone can view)
router.get(
  '/technician/:technicianId',
  authMiddleware,
  getTechnicianReviews
);

// Get review for work order
router.get(
  '/wo/:woId',
  authMiddleware,
  getWOReview
);

export default router;
