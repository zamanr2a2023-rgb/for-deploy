/** @format */

// Example: How to use translations in controllers

const { translate } = require("../translations");

// Example 1: Using req.t() helper
exports.loginExample = async (req, res) => {
  try {
    // ... login logic ...

    // Success with translation
    return res.status(200).json({
      success: true,
      message: req.t("auth.login_success"), // Automatically uses user's language
      token: "abc123",
      user: { id: 1, name: "John" },
    });
  } catch (error) {
    // Error with translation
    return res.status(400).json({
      success: false,
      message: req.t("auth.login_failed"),
      error: req.t("auth.invalid_credentials"),
    });
  }
};

// Example 2: Using res.success() and res.error() helpers
exports.updateProfileExample = async (req, res) => {
  try {
    // ... update logic ...

    // Simplified success response
    return res.success("profile.updated_success", {
      profile: { id: 1, name: "Updated Name" },
    });
  } catch (error) {
    // Simplified error response
    return res.error("profile.update_failed", 400);
  }
};

// Example 3: With parameters
exports.paymentExample = async (req, res) => {
  const amount = 5000;

  // Translation with parameters (if you add {amount} to translation)
  return res.success("payment.uploaded_success", {
    payment: { id: 1, amount },
  });
};

// Example 4: Translate status/priority labels
exports.getWorkOrderExample = async (req, res) => {
  const workOrder = {
    id: 1,
    status: "IN_PROGRESS",
    priority: "HIGH",
  };

  return res.status(200).json({
    success: true,
    data: {
      ...workOrder,
      statusLabel: req.t(`status.${workOrder.status}`), // "In Progress" / "En cours" / "قيد التنفيذ"
      priorityLabel: req.t(`priority.${workOrder.priority}`), // "High" / "Élevé" / "عالي"
    },
  });
};

// Example 5: Get all translations for a language
exports.getTranslationsExample = async (req, res) => {
  // Returns all translations for user's language
  return res.status(200).json({
    success: true,
    language: req.lang,
    translations: req.translations,
  });
};

// HOW CLIENTS USE IT:

/*
1. Set language in request header:
   Accept-Language: ar
   
2. Or add query parameter:
   GET /api/auth/login?lang=fr
   
3. Response will be in that language:
   
   English (default):
   { "message": "Login successful" }
   
   French:
   { "message": "Connexion réussie" }
   
   Arabic:
   { "message": "تم تسجيل الدخول بنجاح" }
*/
