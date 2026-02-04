// src/routes/callcenter.routes.js
import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { 
  createCustomer, 
  getWOTechnicianInfo 
} from '../controllers/callcenter.controller.js';

const router = Router();

// Create new customer (Call Center & Admin only)
router.post(
  '/customers',
  authMiddleware,
  requireRole('CALL_CENTER', 'ADMIN'),
  createCustomer
);

// Get technician info for a work order
router.get(
  '/wos/:woId/technician',
  authMiddleware,
  requireRole('CALL_CENTER', 'ADMIN', 'DISPATCHER'),
  getWOTechnicianInfo
);

export default router;
