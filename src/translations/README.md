<!-- @format -->

# 🌐 Static Language Translation System

## Overview

Backend supports **3 languages** with **static translation files**:

- 🇬🇧 English (en) - Default
- 🇫🇷 French (fr)
- 🇸🇦 Arabic (ar)

---

## 📁 Files Structure

```
src/translations/
├── en.json          # English translations
├── fr.json          # French translations
├── ar.json          # Arabic translations
├── index.js         # Translation helper functions
└── USAGE_EXAMPLES.js # Code examples

src/middleware/
└── language.js      # Language detection middleware
```

---

## 🚀 How It Works

### 1. **Client Sends Request with Language**

Three ways to specify language:

**Option A: Header (Recommended)**

```http
GET /api/auth/profile
Accept-Language: ar
```

**Option B: Query Parameter**

```http
GET /api/auth/profile?lang=fr
```

**Option C: User Profile (Future)**

```json
// User object has preferredLanguage field
{
  "id": 5,
  "preferredLanguage": "ar"
}
```

### 2. **Backend Detects Language**

Middleware automatically:

1. Reads `Accept-Language` header
2. Falls back to query parameter `?lang=`
3. Falls back to user profile
4. Defaults to English if none specified

### 3. **API Returns Translated Messages**

**English Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "token": "abc123"
}
```

**French Response:**

```json
{
  "success": true,
  "message": "Connexion réussie",
  "token": "abc123"
}
```

**Arabic Response:**

```json
{
  "success": true,
  "message": "تم تسجيل الدخول بنجاح",
  "token": "abc123"
}
```

---

## 💻 Usage in Controllers

### Method 1: Using `req.t()` Helper

```javascript
// Login example
export const login = async (req, res) => {
  try {
    // ... authentication logic ...

    return res.status(200).json({
      success: true,
      message: req.t("auth.login_success"), // Translates automatically
      token,
      user,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: req.t("auth.login_failed"),
    });
  }
};
```

### Method 2: Using `res.success()` and `res.error()`

```javascript
// Profile update example
export const updateProfile = async (req, res) => {
  try {
    // ... update logic ...
    return res.success("profile.updated_success", { profile });
  } catch (error) {
    return res.error("profile.update_failed", 400);
  }
};
```

### Method 3: Translate Status Labels

```javascript
// Work order example
export const getWorkOrder = async (req, res) => {
  const wo = await prisma.workOrder.findUnique({ where: { id } });

  return res.status(200).json({
    success: true,
    data: {
      ...wo,
      // Translate status codes to labels
      statusLabel: req.t(`status.${wo.status}`),
      priorityLabel: req.t(`priority.${wo.priority}`),
    },
  });
};
```

---

## 📝 Available Translation Keys

### Authentication (`auth.*`)

```
auth.login_success
auth.login_failed
auth.logout_success
auth.phone_required
auth.password_required
auth.account_blocked
auth.invalid_credentials
auth.token_expired
auth.unauthorized
```

### OTP (`otp.*`)

```
otp.sent_success
otp.send_failed
otp.invalid_code
otp.expired
otp.verified_success
otp.max_attempts
```

### Profile (`profile.*`)

```
profile.updated_success
profile.update_failed
profile.not_found
profile.password_changed
profile.invalid_old_password
```

### Work Orders (`workorder.*`)

```
workorder.created_success
workorder.not_found
workorder.assigned_success
workorder.accepted_success
workorder.started_success
workorder.completed_success
workorder.cancelled_success
workorder.invalid_status
workorder.already_assigned
workorder.not_assigned
workorder.gps_required
```

### Payments (`payment.*`)

```
payment.uploaded_success
payment.verified_success
payment.rejected_success
payment.not_found
payment.proof_required
payment.invalid_amount
```

### Commissions (`commission.*`)

```
commission.payout_requested
commission.payout_approved
commission.payout_rejected
commission.insufficient_balance
commission.invalid_amount
```

### Status Labels (`status.*`)

```
status.PENDING_APPROVAL
status.ACTIVE
status.COMPLETED
status.CANCELLED
status.ASSIGNED
status.ACCEPTED
status.IN_PROGRESS
status.PAID_VERIFIED
status.ONLINE
status.OFFLINE
status.BUSY
```

### Priority Labels (`priority.*`)

```
priority.LOW
priority.MEDIUM
priority.HIGH
priority.URGENT
```

---

## 🧪 Testing

### Test with cURL

**English (Default):**

```bash
curl http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"1111111111","password":"admin123"}'
```

**French:**

```bash
curl http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept-Language: fr" \
  -d '{"phone":"1111111111","password":"admin123"}'
```

**Arabic:**

```bash
curl http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept-Language: ar" \
  -d '{"phone":"1111111111","password":"admin123"}'
```

### Test with Postman

1. Add header: `Accept-Language: ar`
2. Or add query parameter: `?lang=fr`
3. Send request
4. Response message will be in selected language

---

## 🔄 Adding New Translations

### 1. Add to all 3 language files:

**en.json:**

```json
{
  "category": {
    "created": "Category created successfully"
  }
}
```

**fr.json:**

```json
{
  "category": {
    "created": "Catégorie créée avec succès"
  }
}
```

**ar.json:**

```json
{
  "category": {
    "created": "تم إنشاء الفئة بنجاح"
  }
}
```

### 2. Use in controller:

```javascript
return res.success("category.created", { category });
```

---

## 📱 Mobile App Integration

Mobile app should:

1. **Detect device language:**

```javascript
import { getLocales } from "react-native-localize";
const deviceLang = getLocales()[0].languageCode; // 'en', 'fr', 'ar'
```

2. **Set header for all API requests:**

```javascript
axios.defaults.headers.common["Accept-Language"] = deviceLang;
```

3. **All API responses return messages in user's language automatically**

---

## ✅ Benefits

1. ✅ **Backend returns translated messages** - No need for client-side translation of error messages
2. ✅ **Consistent language** - All API responses in same language
3. ✅ **Static files** - Fast, no database queries
4. ✅ **Easy to maintain** - Just edit JSON files
5. ✅ **Fallback to English** - Always works even if translation missing

---

## 🎯 What's Still Client-Side

Mobile app still handles:

- ✅ UI labels (buttons, titles, placeholders)
- ✅ Navigation text
- ✅ Help text and instructions
- ✅ Static content

Backend only translates:

- ✅ API response messages
- ✅ Error messages
- ✅ Success messages
- ✅ Status/priority labels

---

## 📊 Language Detection Priority

1. **Query parameter** `?lang=ar` (highest priority)
2. **Accept-Language header**
3. **User profile** `preferredLanguage` field (if logged in)
4. **Default** to English

---

## 🔮 Future Enhancements

### Optional: Save User's Language Preference

Add to User model:

```prisma
model User {
  // ...existing fields...
  preferredLanguage String? @default("en") // en, fr, ar
}
```

Then middleware automatically uses it for logged-in users.

---

**Status:** ✅ Production Ready  
**Languages:** 3 (English, French, Arabic)  
**Translation Keys:** 50+  
**Auto-detection:** Yes
