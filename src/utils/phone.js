/** @format */

// src/utils/phone.js

/**
 * Normalize phone number to database format (without country code prefix)
 * Supports all countries - removes any country code for storage consistency
 * Examples:
 *   +8801719912009 -> 1719912009 (Bangladesh)
 *   +31612345678 -> 612345678 (Netherlands)
 *   +14155551234 -> 4155551234 (USA)
 *   +254712345678 -> 712345678 (Kenya)
 *   8801719912009 -> 1719912009
 *   01719912009 -> 1719912009
 *   1719912009 -> 1719912009
 *
 * Note: This removes ALL country codes. For multi-country support,
 * you may want to store the full international number instead.
 */
export const normalizePhoneForDB = (phone) => {
  if (!phone) return phone;

  // Remove spaces, dashes, parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");

  // Remove + prefix
  cleaned = cleaned.replace(/^\+/, "");

  // If starts with 00, remove it (European format)
  if (cleaned.startsWith("00")) {
    cleaned = cleaned.substring(2);
  }

  // Remove common country codes
  // Bangladesh: 880, Kenya: 254, India: 91, Netherlands: 31, USA/Canada: 1, UK: 44, UAE: 971, etc.
  const countryCodes = [
    "880",
    "254",
    "971",
    "966",
    "91",
    "44",
    "86",
    "81",
    "82",
  ];

  for (const code of countryCodes) {
    if (cleaned.startsWith(code)) {
      // Make sure it's not part of the actual number (check length after removal)
      const withoutCode = cleaned.substring(code.length);
      if (withoutCode.length >= 9 && withoutCode.length <= 12) {
        cleaned = withoutCode;
        break;
      }
    }
  }

  // For USA/Canada (country code 1), be careful as it's a single digit
  if (cleaned.startsWith("1") && cleaned.length >= 11) {
    cleaned = cleaned.substring(1);
  }

  // For Netherlands (country code 31)
  if (cleaned.startsWith("31") && cleaned.length >= 11) {
    cleaned = cleaned.substring(2);
  }

  // Remove leading 0 (common in many countries for local format)
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }

  return cleaned;
};

/**
 * Format phone number for SMS (international format with country code)
 * Supports all countries - keeps existing country codes, adds default for local numbers
 * Examples:
 *   +31612345678 -> +31612345678 (Netherlands - unchanged)
 *   +14155551234 -> +14155551234 (USA - unchanged)
 *   +8801719912009 -> +8801719912009 (Bangladesh - unchanged)
 *   1719912009 -> +8801719912009 (Bangladesh local - adds +880)
 *   01719912009 -> +8801719912009 (Bangladesh local - adds +880)
 *   31612345678 -> +31612345678 (Netherlands without + - adds +)
 */
export const formatPhoneForSMS = (phone) => {
  if (!phone) return phone;

  // Remove spaces, dashes, parentheses, but keep +
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");

  // If already has + prefix and looks valid, return as is
  if (cleaned.startsWith("+") && /^\+\d{8,15}$/.test(cleaned)) {
    return cleaned;
  }

  // Remove + prefix temporarily for processing
  cleaned = cleaned.replace(/^\+/, "");

  // If starts with 00, replace with + (European format)
  if (cleaned.startsWith("00")) {
    return "+" + cleaned.substring(2);
  }

  // Get default country code from environment or use Bangladesh
  const DEFAULT_COUNTRY_CODE = process.env.DEFAULT_COUNTRY_CODE || "880";

  // Handle local numbers with leading 0 (9-11 digits total) - remove 0 and add country code
  if (cleaned.startsWith("0") && cleaned.length >= 10 && cleaned.length <= 11) {
    cleaned = cleaned.substring(1); // Remove leading 0
    return `+${DEFAULT_COUNTRY_CODE}${cleaned}`;
  }

  // If number looks like it already has a country code (11+ digits), add + and return
  // Examples: 31612345678 (NL), 14155551234 (US), 8801712345678 (BD)
  if (cleaned.length >= 11 && /^\d+$/.test(cleaned)) {
    return "+" + cleaned;
  }

  // Handle local numbers (9-10 digits) - add default country code
  if (cleaned.length === 10 || cleaned.length === 9) {
    return `+${DEFAULT_COUNTRY_CODE}${cleaned}`;
  }

  // For shorter numbers (could be country code + number), try to add +
  if (/^\d+$/.test(cleaned) && cleaned.length >= 8) {
    return "+" + cleaned;
  }

  // Last resort: add default country code
  return `+${DEFAULT_COUNTRY_CODE}${cleaned}`;
};

/**
 * Validate phone number format for local numbers
 * Must be exactly 8 digits starting with 2, 3, or 4
 * Examples of valid local numbers:
 *   22345678 ✓
 *   31234567 ✓
 *   45678901 ✓
 *   12345678 ✗ (doesn't start with 2, 3, or 4)
 *   2234567 ✗ (only 7 digits)
 *   223456789 ✗ (9 digits)
 */
export const isValidLocalPhone = (phone) => {
  if (!phone) return false;

  // Remove spaces, dashes, parentheses, and + prefix
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, "");

  // Remove country codes if present
  const countryCodes = [
    "222",
    "880",
    "254",
    "91",
    "971",
    "966",
    "44",
    "86",
    "81",
    "82",
    "31",
    "1",
  ];
  for (const code of countryCodes) {
    if (cleaned.startsWith(code)) {
      const withoutCode = cleaned.substring(code.length);
      if (withoutCode.length === 8 && /^[234]/.test(withoutCode)) {
        cleaned = withoutCode;
        break;
      }
    }
  }

  // Remove leading 0 if present
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }

  // Must be exactly 8 digits starting with 2, 3, or 4
  return /^[234]\d{7}$/.test(cleaned);
};

/**
 * Validate phone number format
 * Accepts both local format (8 digits starting with 2,3,4) and international format
 * Examples of valid numbers:
 *   22345678 (Local - 8 digits starting with 2)
 *   31234567 (Local - 8 digits starting with 3)
 *   45678901 (Local - 8 digits starting with 4)
 *   +22222345678 (International with country code)
 *   022345678 (Local with leading 0)
 */
export const isValidPhone = (phone) => {
  if (!phone) return false;

  // Check local format first
  if (isValidLocalPhone(phone)) {
    return true;
  }

  // Remove spaces, dashes, parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");

  // Check international format with country code
  if (cleaned.startsWith("+")) {
    // Remove + for processing
    const digitsOnly = cleaned.substring(1);

    // Check if it's our format with country code
    const countryCodes = [
      "222",
      "880",
      "254",
      "91",
      "971",
      "966",
      "44",
      "86",
      "81",
      "82",
      "31",
      "1",
    ];
    for (const code of countryCodes) {
      if (digitsOnly.startsWith(code)) {
        const localPart = digitsOnly.substring(code.length);
        if (localPart.length === 8 && /^[234]/.test(localPart)) {
          return true;
        }
      }
    }
  }

  return false;
};
