// src/routes/report.routes.js
import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import {
  getWorkOrderReport,
  getCommissionReport,
  getPaymentReport,
  getTechnicianPerformance,
  getFinancialReport,
} from '../controllers/report.controller.js';

const router = Router();

// Admin and Dispatcher can access reports
router.get('/work-orders', authMiddleware, requireRole('ADMIN', 'DISPATCHER'), getWorkOrderReport);
router.get('/commissions', authMiddleware, requireRole('ADMIN', 'DISPATCHER'), getCommissionReport);
router.get('/payments', authMiddleware, requireRole('ADMIN', 'DISPATCHER'), getPaymentReport);
router.get('/technician-performance', authMiddleware, requireRole('ADMIN', 'DISPATCHER'), getTechnicianPerformance);
router.get('/financial', authMiddleware, requireRole('ADMIN'), getFinancialReport);

export default router;
 