// src/routes/dispatcher.routes.js
import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { 
  getNearbyTechnicians,
  getTechnicianWorkload 
} from '../controllers/dispatcher.controller.js';

const router = Router();

// Get nearby technicians with distance and availability
router.get(
  '/technicians/nearby',
  authMiddleware,
  requireRole('DISPATCHER', 'ADMIN'),
  getNearbyTechnicians
);

// Get technician workload
router.get(
  '/technicians/:id/workload',
  authMiddleware,
  requireRole('DISPATCHER', 'ADMIN'),
  getTechnicianWorkload
);
 
export default router;
