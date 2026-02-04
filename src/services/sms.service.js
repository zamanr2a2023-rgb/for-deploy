/** @format */

// src/services/sms.service.js
// Using built-in fetch API (Node.js 18+)
import dotenv from "dotenv";
dotenv.config();

// ========================================
// 🔑 BulkGate API Credentials
// ========================================

// HTTP API - For normal SMS (notifications, alerts, updates)
const HTTP_SMS_CONFIG = {
  APPLICATION_ID: process.env.BULKGATE_SMS_APP_ID || "36014",
  APPLICATION_TOKEN:
    process.env.BULKGATE_SMS_APP_TOKEN ||
    "mS6UavzDJQ8KoJ2NZlSGmFaiPSNhsdBML1wq2ngi8rXvoTw0Qv",
  BASE_URL: "https://portal.bulkgate.com/api/1.0/simple",
};

// OTP API - For verification codes only
const OTP_API_CONFIG = {
  APPLICATION_ID: process.env.BULKGATE_OTP_APP_ID || "36013",
  APPLICATION_TOKEN:
    process.env.BULKGATE_OTP_APP_TOKEN ||
    "7ohN0WzblPga1tugpwCXiHiQweVB3GImpmCanFNZSLsyhL87yR",
  BASE_URL: "https://portal.bulkgate.com/api/1.0/otp",
};

// ========================================
// 📞 Phone Number Normalization & Validation
// ========================================

/**
 * Check if phone number is a test/dummy number
 * @param {string} phone - Phone number to check
 * @returns {boolean} True if test number
 */
const isTestPhoneNumber = (phone) => {
  if (!phone) return true;

  const cleaned = phone.replace(/[^\d]/g, "");

  // Common test patterns
  const testPatterns = [
    /^0+$/, // All zeros: 0000000000
    /^1+$/, // All ones: 1111111111
    /^2+$/, // All twos: 2222222222
    /^3+$/, // All threes: 3333333333
    /^4+$/, // All fours: 4444444444
    /^5+$/, // All fives: 5555555555
    /^6+$/, // All sixes: 6666666666
    /^7+$/, // All sevens: 7777777777
    /^8+$/, // All eights: 8888888888
    /^9+$/, // All nines: 9999999999
    /^(123)+$/, // Repeating 123
    /^1234567890$/, // Sequential
  ];

  return testPatterns.some((pattern) => pattern.test(cleaned));
};

/**
 * Normalize phone number to international format
 * Converts local numbers to international format with country code
 *
 * @param {string} phone - Phone number in any format
 * @returns {string} Normalized phone number with + prefix
 */
const normalizePhoneNumber = (phone) => {
  if (!phone) return null;

  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, "");

  // If already has country code with +, return as is
  if (cleaned.startsWith("+")) {
    // Validate it has digits after +
    if (cleaned.length > 1 && /^\+\d+$/.test(cleaned)) {
      return cleaned;
    }
  }

  // If starts with 00, replace with + (international format)
  if (cleaned.startsWith("00")) {
    return "+" + cleaned.substring(2);
  }

  // If number already looks like international format without +, add it
  // Common country codes: 1 (US/CA), 31 (NL), 44 (UK), 91 (IN), 254 (KE), 880 (BD), etc.
  // If it's 11+ digits, assume it already has country code
  if (cleaned.length >= 11 && /^\d+$/.test(cleaned)) {
    return "+" + cleaned;
  }

  // Get default country code from env or use Bangladesh as default
  const DEFAULT_COUNTRY_CODE = process.env.DEFAULT_COUNTRY_CODE || "880"; // Bangladesh

  // Handle local numbers (9-10 digits) - add default country code
  if (cleaned.length === 10 || cleaned.length === 9) {
    // Remove leading 0 if present (common in many countries)
    if (cleaned.startsWith("0")) {
      cleaned = cleaned.substring(1);
    }
    return `+${DEFAULT_COUNTRY_CODE}${cleaned}`;
  }

  // For any other digit-only string, try to add + prefix
  if (/^\d+$/.test(cleaned)) {
    return "+" + cleaned;
  }

  // Last resort: return as is with + if not present
  console.warn(`⚠️ Could not normalize phone number: ${phone}`);
  return cleaned.startsWith("+") ? cleaned : "+" + cleaned;
};

// ========================================
// 📱 1. HTTP SMS API Functions (Normal SMS)
// ========================================

/**
 * Send normal SMS using HTTP API
 * Use cases: Notifications, alerts, order updates, promotional messages
 *
 * @param {string} phone - Phone number (with country code, e.g., +8801712345678)
 * @param {string} text - Message text
 * @param {object} options - Additional options
 * @returns {Promise<object>} API response
 */
export const sendSMS = async (phone, text, options = {}) => {
  try {
    const {
      senderId = "FSM-System", // Sender ID (max 11 characters)
      unicode = 1, // 1 if message contains special characters/Bengali
      messageType = "transactional", // 'transactional' or 'promotional'
    } = options;

    // Normalize phone number to international format
    const formattedPhone = normalizePhoneNumber(phone);

    // Check for test/dummy numbers in development
    if (isTestPhoneNumber(phone)) {
      console.warn(`⚠️ Test/dummy phone number detected: ${phone}`);

      // In development mode, skip actual SMS sending
      if (
        process.env.NODE_ENV === "development" ||
        process.env.SKIP_SMS_FOR_TEST_NUMBERS === "true"
      ) {
        console.log(
          `🧪 Development mode: Skipping SMS to test number ${formattedPhone}`
        );
        console.log(`   Message: ${text.substring(0, 50)}...`);
        return {
          success: true,
          messageId: "TEST_" + Date.now(),
          status: "simulated",
          price: 0,
          credit: 0,
          message: "SMS skipped for test number (development mode)",
          isTestNumber: true,
        };
      }

      // In production, warn but continue (will likely fail at API)
      console.warn(
        `⚠️ Attempting to send to test number in production. This will likely fail.`
      );
    }

    // Validate phone number format (international standard: + followed by 8-15 digits)
    if (
      !formattedPhone ||
      !formattedPhone.startsWith("+") ||
      formattedPhone.length < 9 || // Minimum: +31612345 = 10 chars (8 digits)
      formattedPhone.length > 16 || // Maximum: +123456789012345 = 16 chars (15 digits)
      !/^\+\d{8,15}$/.test(formattedPhone) // Must be + followed by 8-15 digits
    ) {
      console.error(`❌ Invalid phone number format: ${phone}`);
      return {
        success: false,
        error:
          "Invalid phone number format. Must be international format with 8-15 digits (e.g., +8801712345678, +31612345678, +254712345678)",
        message: "Invalid phone number",
      };
    }

    // Determine endpoint based on message type
    const endpoint =
      messageType === "promotional"
        ? `${HTTP_SMS_CONFIG.BASE_URL}/promotional`
        : `${HTTP_SMS_CONFIG.BASE_URL}/transactional`;

    // Prepare request payload
    const payload = {
      application_id: HTTP_SMS_CONFIG.APPLICATION_ID,
      application_token: HTTP_SMS_CONFIG.APPLICATION_TOKEN,
      number: formattedPhone,
      text: text,
      unicode: unicode,
      sender_id: senderId,
      sender_id_value: senderId,
    };

    console.log(`📤 Sending SMS to ${formattedPhone} via BulkGate HTTP API...`);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    // BulkGate returns status "accepted" or "sent"
    if (
      response.ok &&
      result.data &&
      (result.data.status === "sent" || result.data.status === "accepted")
    ) {
      // Check if account has credits
      if (result.data.price === 0 && result.data.credit === 0) {
        console.warn(
          `⚠️ SMS accepted but NO CREDITS! Add credits at https://portal.bulkgate.com`
        );
        console.log(`   Message ID: ${result.data.sms_id}`);
        console.log(`   Status: ${result.data.status}`);
      } else {
        console.log(`✅ SMS sent successfully to ${formattedPhone}`);
        console.log(
          `   Price: ${result.data.price}, Credit remaining: ${result.data.credit}`
        );
      }

      return {
        success: true,
        messageId: result.data.sms_id,
        status: result.data.status,
        price: result.data.price,
        credit: result.data.credit,
        message:
          result.data.price === 0
            ? "SMS accepted but account has no credits. Please add credits."
            : "SMS sent successfully",
      };
    } else {
      console.error(`❌ Failed to send SMS to ${formattedPhone}:`, result);

      // Extract detailed error message from BulkGate response
      let errorMessage = "SMS sending failed";
      if (result.error) {
        if (typeof result.error === "string") {
          errorMessage = result.error;
        } else if (result.error.message) {
          errorMessage = result.error.message;
        } else if (result.error.type) {
          errorMessage = `Error: ${result.error.type}`;
        }
      } else if (result.message) {
        errorMessage = result.message;
      }

      // Check for specific error codes
      if (
        result.code === "invalid_phone_number" ||
        errorMessage.includes("Invalid")
      ) {
        errorMessage = `Invalid phone number: ${formattedPhone}. Please verify the number is correct and in international format (e.g., +8801712345678). If the error persists, this country may not be supported by BulkGate.`;
      } else if (
        result.code === "no_credit" ||
        errorMessage.includes("credit")
      ) {
        errorMessage = `SMS service has no credits. Please add credits at https://portal.bulkgate.com`;
      }

      return {
        success: false,
        error: result.error || errorMessage,
        message: errorMessage,
        bulkgateResponse: result, // Include full response for debugging
      };
    }
  } catch (error) {
    console.error("❌ Error sending SMS via BulkGate:", error);
    return {
      success: false,
      error: error.message,
      message: "SMS service error",
    };
  }
};

/**
 * Send SMS to multiple recipients
 * @param {Array<string>} phoneNumbers - Array of phone numbers
 * @param {string} text - Message text
 * @param {object} options - Additional options
 * @returns {Promise<object>} Results for all recipients
 */
export const sendBulkSMS = async (phoneNumbers, text, options = {}) => {
  try {
    const results = await Promise.all(
      phoneNumbers.map((phone) => sendSMS(phone, text, options))
    );

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return {
      success: true,
      total: phoneNumbers.length,
      successful,
      failed,
      results,
    };
  } catch (error) {
    console.error("❌ Error sending bulk SMS:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// ========================================
// 🔐 2. OTP API Functions (Verification Codes)
// ========================================

/**
 * Send OTP code using BulkGate OTP API
 * Use cases: Login, signup, password reset, 2FA
 *
 * @param {string} phone - Phone number (with country code)
 * @param {object} options - OTP configuration options
 * @returns {Promise<object>} API response
 */
export const sendOTPViaBulkGate = async (phone, options = {}) => {
  try {
    // Normalize phone number
    const formattedPhone = normalizePhoneNumber(phone);

    // Check for test/dummy numbers
    if (isTestPhoneNumber(phone)) {
      console.warn(`⚠️ Test/dummy phone number detected for OTP: ${phone}`);

      // In development mode, return mock OTP
      if (
        process.env.NODE_ENV === "development" ||
        process.env.SKIP_SMS_FOR_TEST_NUMBERS === "true"
      ) {
        console.log(
          `🧪 Development mode: Skipping OTP to test number ${formattedPhone}`
        );
        console.log(`   Mock OTP: 123456 (use this for testing)`);
        return {
          success: true,
          otpId: "TEST_OTP_" + Date.now(),
          status: "simulated",
          expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
          message:
            "OTP skipped for test number (development mode). Use code: 123456",
          isTestNumber: true,
          mockCode: "123456",
        };
      }
    }

    // Validate phone number
    if (!formattedPhone || !formattedPhone.startsWith("+")) {
      console.error(`❌ Invalid phone number for OTP: ${phone}`);
      return {
        success: false,
        error: "Invalid phone number format",
        message: "Phone number must be in international format",
      };
    }

    const {
      codeLength = 6, // OTP length (4-100 digits)
      expiration = 300, // Expiration time in seconds (default 5 minutes)
      country = "ke", // Country code (ISO 3166-1 alpha-2) - Changed to Kenya
      language = "en", // Language for OTP message
      codeType = "int", // 'int', 'string', or 'combined'
      clientIp = "127.0.0.1", // Client IP for rate limiting
      senderId = "FSM-OTP", // Sender ID
    } = options;

    // Prepare request payload according to BulkGate OTP API v1.0
    const payload = {
      application_id: OTP_API_CONFIG.APPLICATION_ID,
      application_token: OTP_API_CONFIG.APPLICATION_TOKEN,
      number: formattedPhone,
      country: country,
      language: language,
      code_type: codeType,
      code_length: codeLength,
      request_quota_number: 1,
      request_quota_identification: clientIp, // Required for rate limiting
      expiration: expiration,
      channel: {
        sms: {
          sender_id: "gText",
          sender_id_value: senderId,
        },
      },
    };

    console.log(`🔐 Sending OTP to ${formattedPhone} via BulkGate OTP API...`);

    const response = await fetch(`${OTP_API_CONFIG.BASE_URL}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.ok && result.data) {
      console.log(`✅ OTP sent successfully to ${formattedPhone}`);
      return {
        success: true,
        otpId: result.data.id, // Important: Save this to verify OTP later
        messageId: result.data.message?.message_id,
        status: result.data.message?.status,
        channel: result.data.message?.channel,
        expiration: expiration,
        message: "OTP sent successfully",
      };
    } else {
      console.error(`❌ Failed to send OTP to ${formattedPhone}:`, result);
      return {
        success: false,
        error: result.error || result.type || "Failed to send OTP",
        message: result.error || "OTP sending failed",
      };
    }
  } catch (error) {
    console.error("❌ Error sending OTP via BulkGate:", error);
    return {
      success: false,
      error: error.message,
      message: "OTP service error",
    };
  }
};

/**
 * Verify OTP code using BulkGate OTP API
 *
 * @param {string} otpId - OTP ID received from sendOTPViaBulkGate (e.g., "opt-xxxxx")
 * @param {string} code - OTP code entered by user
 * @returns {Promise<object>} Verification result
 */
export const verifyOTPViaBulkGate = async (otpId, code) => {
  try {
    const payload = {
      application_id: OTP_API_CONFIG.APPLICATION_ID,
      application_token: OTP_API_CONFIG.APPLICATION_TOKEN,
      id: otpId, // The ID received from send OTP response
      code: String(code), // OTP code as string
    };

    console.log(`🔍 Verifying OTP code for ID: ${otpId}...`);

    const response = await fetch(`${OTP_API_CONFIG.BASE_URL}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.ok && result.data) {
      const isVerified = result.data.verified === true;
      console.log(
        `${isVerified ? "✅" : "❌"} OTP verification: ${
          isVerified ? "SUCCESS" : "FAILED"
        }`
      );
      return {
        success: true,
        verified: isVerified,
        otpId: result.data.id,
        message: isVerified ? "OTP verified successfully" : "Invalid OTP code",
      };
    } else {
      console.error(`❌ OTP verification error:`, result);
      return {
        success: false,
        verified: false,
        error: result.error || result.type || "Verification failed",
        message: result.error || "OTP verification failed",
      };
    }
  } catch (error) {
    console.error("❌ Error verifying OTP via BulkGate:", error);
    return {
      success: false,
      verified: false,
      error: error.message,
      message: "OTP verification service error",
    };
  }
};

// ========================================
// 📧 3. Notification Templates (Pre-defined Messages)
// ========================================

/**
 * Send work order assignment notification
 */
export const sendWOAssignmentSMS = async (phone, woNumber, customerName) => {
  const text = `New work order assigned: ${woNumber}\nCustomer: ${customerName}\nPlease accept or decline within 100 minutes.\n- FSM System`;
  return await sendSMS(phone, text, { unicode: 1 });
};

/**
 * Send work order acceptance notification
 */
export const sendWOAcceptedSMS = async (phone, woNumber, technicianName) => {
  const text = `Work order ${woNumber} has been accepted by ${technicianName}.\nTrack progress in the app.\n- FSM System`;
  return await sendSMS(phone, text, { unicode: 1 });
};

/**
 * Send work order completion notification
 */
export const sendWOCompletedSMS = async (phone, woNumber) => {
  const text = `Work order ${woNumber} has been completed.\nPlease verify payment and provide review.\n- FSM System`;
  return await sendSMS(phone, text, { unicode: 1 });
};

/**
 * Send payment verification notification
 */
export const sendPaymentVerifiedSMS = async (phone, amount, woNumber) => {
  const text = `Payment verified! Amount: ${amount} BDT\nWork order: ${woNumber}\nCommission added to your wallet.\n- FSM System`;
  return await sendSMS(phone, text, { unicode: 1 });
};

/**
 * Send commission payout notification
 */
export const sendPayoutApprovedSMS = async (phone, amount) => {
  const text = `Payout approved! Amount: ${amount} BDT has been processed.\nCheck your payment method.\n- FSM System`;
  return await sendSMS(phone, text, { unicode: 1 });
};

/**
 * Send account blocked notification
 */
export const sendAccountBlockedSMS = async (phone, reason) => {
  const text = `Your account has been blocked.\nReason: ${reason}\nContact support for assistance.\n- FSM System`;
  return await sendSMS(phone, text, { unicode: 1 });
};

/**
 * Send welcome SMS for new users
 */
export const sendWelcomeSMS = async (phone, name) => {
  const text = `Welcome to FSM System, ${name}!\nYour account has been created successfully.\nLogin to get started.\n- FSM System`;
  return await sendSMS(phone, text, { unicode: 1 });
};

// ========================================
// 📊 4. SMS Status & Delivery Reports
// ========================================

/**
 * Check SMS delivery status
 * @param {string} messageId - Message ID received from sendSMS
 * @returns {Promise<object>} Delivery status
 */
export const checkSMSStatus = async (messageId) => {
  try {
    const payload = {
      application_id: HTTP_SMS_CONFIG.APPLICATION_ID,
      application_token: HTTP_SMS_CONFIG.APPLICATION_TOKEN,
      sms_id: messageId,
    };

    const response = await fetch(`${HTTP_SMS_CONFIG.BASE_URL}/info`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.ok && result.data) {
      return {
        success: true,
        status: result.data.status,
        deliveredAt: result.data.delivered_at,
        data: result.data,
      };
    } else {
      return {
        success: false,
        error: result.error || "Failed to get status",
      };
    }
  } catch (error) {
    console.error("❌ Error checking SMS status:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// ========================================
// 🧪 5. Test Functions
// ========================================

/**
 * Test BulkGate HTTP SMS API
 */
export const testHTTPSMS = async (phone) => {
  console.log("🧪 Testing BulkGate HTTP SMS API...");
  const result = await sendSMS(
    phone,
    "Test message from FSM System. HTTP SMS API is working!",
    { unicode: 1 }
  );
  console.log("📊 Test Result:", result);
  return result;
};

/**
 * Test BulkGate OTP API
 */
export const testOTPAPI = async (phone) => {
  console.log("🧪 Testing BulkGate OTP API...");
  const result = await sendOTPViaBulkGate(phone, {
    length: 6,
    expire: 5,
    channel: "sms",
  });
  console.log("📊 Test Result:", result);
  return result;
};

// Export configuration for external use
export const SMS_CONFIG = {
  HTTP_SMS: {
    APPLICATION_ID: HTTP_SMS_CONFIG.APPLICATION_ID,
    BASE_URL: HTTP_SMS_CONFIG.BASE_URL,
  },
  OTP_API: {
    APPLICATION_ID: OTP_API_CONFIG.APPLICATION_ID,
    BASE_URL: OTP_API_CONFIG.BASE_URL,
  },
};
