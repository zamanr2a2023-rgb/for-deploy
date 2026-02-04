/** @format */

// src/middleware/language.js
import {
  translate,
  getTranslations,
  getSupportedLanguages,
} from "../translations/index.js";

/**
 * Language detection middleware
 * Detects language from:
 * 1. Accept-Language header
 * 2. User profile (if authenticated)
 * 3. Query parameter ?lang=en
 * 4. Defaults to English
 */
export const detectLanguage = (req, res, next) => {
  let lang = "en"; // Default language

  // 1. Check query parameter
  if (req.query.lang && getSupportedLanguages().includes(req.query.lang)) {
    lang = req.query.lang;
  }
  // 2. Check Accept-Language header
  else if (req.headers["accept-language"]) {
    const headerLang = req.headers["accept-language"]
      .split(",")[0]
      .split("-")[0];
    if (getSupportedLanguages().includes(headerLang)) {
      lang = headerLang;
    }
  }
  // 3. Check user profile (if authenticated and has preferredLanguage)
  else if (req.user && req.user.preferredLanguage) {
    lang = req.user.preferredLanguage;
  }

  // Attach language to request object
  req.lang = lang;

  // Attach translation helper to request
  req.t = (key, params) => translate(lang, key, params);

  // Attach all translations for current language
  req.translations = getTranslations(lang);

  next();
};

/**
 * Add translation methods to response object
 */
export const addTranslationHelpers = (req, res, next) => {
  // Success response with translation
  res.success = (messageKey, data = null, params = {}) => {
    return res.status(200).json({
      success: true,
      message: req.t(messageKey, params),
      data,
    });
  };

  // Error response with translation
  res.error = (messageKey, statusCode = 400, params = {}) => {
    return res.status(statusCode).json({
      success: false,
      message: req.t(messageKey, params),
      error: req.t(messageKey, params),
    });
  };

  next();
};
