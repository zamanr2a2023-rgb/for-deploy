/** @format */

// src/translations/index.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load translation files
const en = JSON.parse(fs.readFileSync(path.join(__dirname, "en.json"), "utf8"));
const fr = JSON.parse(fs.readFileSync(path.join(__dirname, "fr.json"), "utf8"));
const ar = JSON.parse(fs.readFileSync(path.join(__dirname, "ar.json"), "utf8"));

const translations = {
  en,
  fr,
  ar,
};

/**
 * Get translation for a key
 * @param {string} lang - Language code (en, fr, ar)
 * @param {string} key - Translation key (e.g., 'auth.login_success')
 * @param {object} params - Parameters to replace in translation
 * @returns {string} Translated text
 */
export function translate(lang = "en", key, params = {}) {
  // Default to English if language not found
  const language = translations[lang] || translations.en;

  // Navigate through nested keys (e.g., 'auth.login_success')
  const keys = key.split(".");
  let text = language;

  for (const k of keys) {
    text = text[k];
    if (!text) {
      // Fallback to English if translation not found
      text = translations.en;
      for (const fallbackKey of keys) {
        text = text[fallbackKey];
        if (!text) return key; // Return key itself if not found
      }
      break;
    }
  }

  // Replace parameters like {name}, {amount}, etc.
  if (typeof text === "string" && Object.keys(params).length > 0) {
    Object.keys(params).forEach((param) => {
      text = text.replace(new RegExp(`{${param}}`, "g"), params[param]);
    });
  }

  return text || key;
}

/**
 * Get all translations for a language
 * @param {string} lang - Language code
 * @returns {object} All translations
 */
export function getTranslations(lang = "en") {
  return translations[lang] || translations.en;
}

/**
 * Get supported languages
 * @returns {array} Array of supported language codes
 */
export function getSupportedLanguages() {
  return Object.keys(translations);
}

export { translations };
