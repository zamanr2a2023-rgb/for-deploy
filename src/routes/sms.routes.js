/** @format */

// src/routes/sms.routes.js
import { Router } from "express";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import {
  sendSMS,
  sendOTPViaBulkGate,
  verifyOTPViaBulkGate,
  sendBulkSMS,
  checkSMSStatus,
  testHTTPSMS,
  testOTPAPI,
  sendWOAssignmentSMS,
  sendWOAcceptedSMS,
  sendWOCompletedSMS,
  sendPaymentVerifiedSMS,
  sendPayoutApprovedSMS,
  sendAccountBlockedSMS,
  sendWelcomeSMS,
} from "../services/sms.service.js";

const router = Router();

// ========================================
// 🧪 Test Routes (Admin Only)
// ========================================

/**
 * Test HTTP SMS API
 * POST /api/sms/test/http
 */
router.post(
  "/test/http",
  authMiddleware,
  requireRole("ADMIN"),
  async (req, res, next) => {
    try {
      const { phone } = req.body;

      if (!phone) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      const result = await testHTTPSMS(phone);

      return res.json({
        message: "HTTP SMS API test completed",
        result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Test OTP API
 * POST /api/sms/test/otp
 */
router.post(
  "/test/otp",
  authMiddleware,
  requireRole("ADMIN"),
  async (req, res, next) => {
    try {
      const { phone } = req.body;

      if (!phone) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      const result = await testOTPAPI(phone);

      return res.json({
        message: "OTP API test completed",
        result,
        note: "Check your phone for OTP code",
      });
    } catch (error) {
      next(error);
    }
  }
);

// ========================================
// 📱 Normal SMS Routes (Admin/Dispatcher)
// ========================================

/**
 * Send normal SMS to single recipient
 * POST /api/sms/send
 */
router.post(
  "/send",
  authMiddleware,
  requireRole("ADMIN", "DISPATCHER"),
  async (req, res, next) => {
    try {
      const { phone, text, unicode, messageType, senderId } = req.body;

      if (!phone || !text) {
        return res.status(400).json({
          message: "Phone and text are required",
        });
      }

      const result = await sendSMS(phone, text, {
        unicode: unicode || 1,
        messageType: messageType || "transactional",
        senderId: senderId || "FSM-System",
      });

      return res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Send SMS to multiple recipients
 * POST /api/sms/send-bulk
 */
router.post(
  "/send-bulk",
  authMiddleware,
  requireRole("ADMIN", "DISPATCHER"),
  async (req, res, next) => {
    try {
      const { phones, text, unicode, messageType, senderId } = req.body;

      if (!phones || !Array.isArray(phones) || phones.length === 0) {
        return res.status(400).json({
          message: "Phones array is required and must not be empty",
        });
      }

      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }

      const result = await sendBulkSMS(phones, text, {
        unicode: unicode || 1,
        messageType: messageType || "transactional",
        senderId: senderId || "FSM-System",
      });

      return res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Check SMS delivery status
 * GET /api/sms/status/:messageId
 */
router.get(
  "/status/:messageId",
  authMiddleware,
  requireRole("ADMIN", "DISPATCHER"),
  async (req, res, next) => {
    try {
      const { messageId } = req.params;

      if (!messageId) {
        return res.status(400).json({ message: "Message ID is required" });
      }

      const result = await checkSMSStatus(messageId);

      return res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// ========================================
// 🔐 OTP Routes (Admin only for testing)
// ========================================

/**
 * Send OTP via BulkGate
 * POST /api/sms/otp/send
 */
router.post(
  "/otp/send",
  authMiddleware,
  requireRole("ADMIN"),
  async (req, res, next) => {
    try {
      const { phone, length, expire, channel } = req.body;

      if (!phone) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      const result = await sendOTPViaBulkGate(phone, {
        length: length || 6,
        expire: expire || 5,
        channel: channel || "sms",
      });

      return res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Verify OTP via BulkGate
 * POST /api/sms/otp/verify
 */
router.post(
  "/otp/verify",
  authMiddleware,
  requireRole("ADMIN"),
  async (req, res, next) => {
    try {
      const { otpId, code } = req.body;

      if (!otpId || !code) {
        return res.status(400).json({
          message: "OTP ID and code are required",
        });
      }

      const result = await verifyOTPViaBulkGate(otpId, code);

      return res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// ========================================
// 📧 Notification Templates (Admin Only)
// ========================================

/**
 * Send work order assignment notification
 * POST /api/sms/notify/wo-assignment
 */
router.post(
  "/notify/wo-assignment",
  authMiddleware,
  requireRole("ADMIN", "DISPATCHER"),
  async (req, res, next) => {
    try {
      const { phone, woNumber, customerName } = req.body;

      if (!phone || !woNumber || !customerName) {
        return res.status(400).json({
          message: "Phone, woNumber, and customerName are required",
        });
      }

      const result = await sendWOAssignmentSMS(phone, woNumber, customerName);

      return res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Send work order accepted notification
 * POST /api/sms/notify/wo-accepted
 */
router.post(
  "/notify/wo-accepted",
  authMiddleware,
  requireRole("ADMIN", "DISPATCHER"),
  async (req, res, next) => {
    try {
      const { phone, woNumber, technicianName } = req.body;

      if (!phone || !woNumber || !technicianName) {
        return res.status(400).json({
          message: "Phone, woNumber, and technicianName are required",
        });
      }

      const result = await sendWOAcceptedSMS(phone, woNumber, technicianName);

      return res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Send work order completed notification
 * POST /api/sms/notify/wo-completed
 */
router.post(
  "/notify/wo-completed",
  authMiddleware,
  requireRole("ADMIN", "DISPATCHER"),
  async (req, res, next) => {
    try {
      const { phone, woNumber } = req.body;

      if (!phone || !woNumber) {
        return res.status(400).json({
          message: "Phone and woNumber are required",
        });
      }

      const result = await sendWOCompletedSMS(phone, woNumber);

      return res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Send payment verified notification
 * POST /api/sms/notify/payment-verified
 */
router.post(
  "/notify/payment-verified",
  authMiddleware,
  requireRole("ADMIN", "DISPATCHER"),
  async (req, res, next) => {
    try {
      const { phone, amount, woNumber } = req.body;

      if (!phone || !amount || !woNumber) {
        return res.status(400).json({
          message: "Phone, amount, and woNumber are required",
        });
      }

      const result = await sendPaymentVerifiedSMS(phone, amount, woNumber);

      return res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Send payout approved notification
 * POST /api/sms/notify/payout-approved
 */
router.post(
  "/notify/payout-approved",
  authMiddleware,
  requireRole("ADMIN"),
  async (req, res, next) => {
    try {
      const { phone, amount } = req.body;

      if (!phone || !amount) {
        return res.status(400).json({
          message: "Phone and amount are required",
        });
      }

      const result = await sendPayoutApprovedSMS(phone, amount);

      return res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Send account blocked notification
 * POST /api/sms/notify/account-blocked
 */
router.post(
  "/notify/account-blocked",
  authMiddleware,
  requireRole("ADMIN"),
  async (req, res, next) => {
    try {
      const { phone, reason } = req.body;

      if (!phone || !reason) {
        return res.status(400).json({
          message: "Phone and reason are required",
        });
      }

      const result = await sendAccountBlockedSMS(phone, reason);

      return res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Send welcome notification
 * POST /api/sms/notify/welcome
 */
router.post(
  "/notify/welcome",
  authMiddleware,
  requireRole("ADMIN", "CALL_CENTER"),
  async (req, res, next) => {
    try {
      const { phone, name } = req.body;

      if (!phone || !name) {
        return res.status(400).json({
          message: "Phone and name are required",
        });
      }

      const result = await sendWelcomeSMS(phone, name);

      return res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
