// src/routes/otp.routes.js
import { Router } from 'express';
import { sendOTP, verifyOTP } from '../controllers/otp.controller.js';

const router = Router();

router.post('/send', sendOTP);
router.post('/verify', verifyOTP);

export default router; 
