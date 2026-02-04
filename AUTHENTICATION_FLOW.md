<!-- @format -->

# Authentication Flow Documentation

## 🔐 NEW Authentication Flow (December 2025)

### Overview

The authentication system has been redesigned to enforce OTP verification **before** any password setup or account creation.

---

## 📱 NEW USER REGISTRATION (3-Step Flow)

### Step 1: Send OTP

```http
POST /api/otp/send
Content-Type: application/json

{
  "phone": "0123456789",
  "type": "REGISTRATION"
}
```

**Response:**

```json
{
  "message": "OTP sent successfully",
  "code": "123456",
  "expiresAt": "2025-12-01T10:05:00Z",
  "smsStatus": "sent"
}
```

### Step 2: Verify OTP

```http
POST /api/otp/verify
Content-Type: application/json

{
  "phone": "0123456789",
  "code": "123456",
  "type": "REGISTRATION"
}
```

**Response:**

```json
{
  "message": "OTP verified successfully. You can now set your password.",
  "verified": true,
  "phone": "0123456789",
  "tempToken": "temp_1733057400000_abc123",
  "tempTokenExpiry": "2025-12-01T10:15:00Z"
}
```

⚠️ **Important:** The `tempToken` is valid for **10 minutes** only.

### Step 3: Set Password

```http
POST /api/auth/set-password
Content-Type: application/json

{
  "phone": "0123456789",
  "password": "SecurePass123",
  "name": "John Doe",
  "email": "john@example.com",
  "tempToken": "temp_1733057400000_abc123"
}
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 10,
    "name": "John Doe",
    "phone": "0123456789",
    "email": "john@example.com",
    "role": "CUSTOMER"
  },
  "message": "Password set successfully. You are now logged in."
}
```

---

## 🔑 EXISTING USER LOGIN (Simple)

Once registered, users login with **phone + password only** (no OTP needed).

```http
POST /api/auth/login
Content-Type: application/json

{
  "phone": "9999999999",
  "password": "password123"
}
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "name": "Test Customer",
    "phone": "9999999999",
    "email": "customer@test.com",
    "role": "CUSTOMER",
    "isBlocked": false,
    "createdAt": "2025-11-01T00:00:00Z"
  }
}
```

---

## 🏢 CALL CENTER FLOW

Call centers follow the same flow when creating accounts for customers:

1. **Search customer** by phone: `GET /api/srs/search-customer?phone=XXXXXXXXXX`
2. If customer doesn't exist:
   - Send OTP to customer's phone
   - Verify OTP
   - Set password using tempToken
3. If customer exists:
   - Create service request directly

---

## 🔄 GUEST TO REGISTERED USER UPGRADE

If a guest user (created via SR without authentication) tries to register:

1. System detects existing user with no password
2. OTP verification required
3. Password is set → Guest upgraded to registered user
4. All previous SRs maintained under same account

---

## 🛡️ SECURITY FEATURES

### OTP Security

- **Expiry:** 5 minutes
- **One-time use:** OTP marked as used after verification
- **Type validation:** LOGIN, REGISTRATION, PASSWORD_RESET, VERIFICATION

### Temporary Token Security

- **Expiry:** 10 minutes after OTP verification
- **Single use:** Token cleared after password setup
- **Tied to phone:** Cannot be used for different phone number

### Password Security

- Bcrypt hashing (10 salt rounds)
- Minimum length enforced by client
- Stored as `passwordHash` in database

---

## 📊 Database Schema Updates

### OTP Table (Updated)

```prisma
model OTP {
  id               Int       @id @default(autoincrement())
  phone            String
  code             String
  type             String
  isUsed           Boolean   @default(false)
  expiresAt        DateTime
  tempToken        String?   // NEW: For password setup
  tempTokenExpiry  DateTime? // NEW: Token expiration
  userId           Int?
  createdAt        DateTime  @default(now())
  user             User?     @relation(fields: [userId], references: [id])
}
```

---

## 🧪 Testing Credentials

All seeded users have password: `password123`

| Role          | Phone      | Password    |
| ------------- | ---------- | ----------- |
| Admin         | 1111111111 | password123 |
| Dispatcher    | 2222222222 | password123 |
| Call Center   | 3333333333 | password123 |
| Internal Tech | 4444444444 | password123 |
| Freelancer 1  | 5555555555 | password123 |
| Freelancer 2  | 6666666666 | password123 |
| Customer 1    | 9999999999 | password123 |
| Customer 2    | 8888888888 | password123 |
| Customer 3    | 7777777777 | password123 |

---

## ❌ Common Errors

### Invalid or expired OTP

```json
{
  "message": "Invalid or expired OTP"
}
```

**Solution:** Request a new OTP

### Invalid or expired temporary token

```json
{
  "message": "Invalid or expired temporary token"
}
```

**Solution:** Start over from Step 1 (OTP is valid for 5 min, tempToken for 10 min)

### Phone already registered

```json
{
  "message": "Phone already registered"
}
```

**Solution:** Use login endpoint instead

### Password not set for this account

```json
{
  "message": "Password not set for this account. Please complete registration."
}
```

**Solution:** User exists but never completed password setup - follow registration flow

---

## 🔄 Migration from Old Flow

### Old Flow (DEPRECATED)

```http
POST /api/auth/login
{
  "phone": "9999999999",
  "otp": "123456",
  "password": "password123"
}
```

### New Flow (CURRENT)

```http
POST /api/auth/login
{
  "phone": "9999999999",
  "password": "password123"
}
```

**Why the change?**

- OTP verification now happens **once** during registration
- Subsequent logins use **phone + password** only
- Simpler user experience after initial setup
- Still secure: OTP required for account creation

---

## 📱 API Endpoints Summary

| Endpoint                    | Method | Purpose                          | Auth Required |
| --------------------------- | ------ | -------------------------------- | ------------- |
| `/api/otp/send`             | POST   | Send OTP code                    | No            |
| `/api/otp/verify`           | POST   | Verify OTP → Get tempToken       | No            |
| `/api/auth/set-password`    | POST   | Set password with tempToken      | No            |
| `/api/auth/login`           | POST   | Login with phone + password      | No            |
| `/api/auth/register`        | POST   | Legacy registration (deprecated) | No            |
| `/api/auth/logout`          | POST   | Logout user                      | Yes           |
| `/api/auth/change-password` | POST   | Change password                  | Yes           |
| `/api/auth/profile`         | GET    | Get user profile                 | Yes           |

---

## 🎯 Best Practices

1. **Always verify OTP before password setup**
2. **Store tempToken temporarily** (expires in 10 min)
3. **Use HTTPS in production** to protect tokens
4. **Implement rate limiting** on OTP endpoints
5. **Log failed login attempts** for security
6. **Clear sensitive data** from client storage after use

---

## 🆘 Support

For issues or questions, contact the development team or refer to:

- `API_DOCUMENTATION.md` for all endpoints
- `ISSUES_AND_SOLUTIONS.md` for common problems
- Postman collection: `POSTMAN_LOCATION_TESTING.json`
