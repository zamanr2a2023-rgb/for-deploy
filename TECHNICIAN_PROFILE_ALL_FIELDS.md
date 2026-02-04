<!-- @format -->

# Technician Profile - All Fields Implementation ✅

## API Endpoint

**PUT/PATCH** `/api/admin/technician/:id/profile`

**Content-Type:** `multipart/form-data`

---

## ✅ ALL AVAILABLE FIELDS (26 Total)

### 📄 Basic Information

| Field            | Type | Example           | Description                                              |
| ---------------- | ---- | ----------------- | -------------------------------------------------------- |
| `specialization` | Text | `ELECTRICAL`      | ELECTRICAL, PLUMBING, HVAC, GENERAL, CARPENTRY, PAINTING |
| `academicTitle`  | Text | `BSc Engineering` | BSc, MSc, Diploma, Engr., etc.                           |
| `type`           | Text | `FREELANCER`      | FREELANCER or INTERNAL                                   |
| `status`         | Text | `ACTIVE`          | ACTIVE, INACTIVE, or PENDING                             |

### 👤 Personal Documents

| Field                 | Type | Example          | Description                                   |
| --------------------- | ---- | ---------------- | --------------------------------------------- |
| `photo` or `photoUrl` | File | (image file)     | Personal photo - jpg, png, webp (Max 2MB)     |
| `idCardUrl`           | File | (PDF/image)      | ID card or passport - jpg, png, pdf (Max 4MB) |
| `degreesUrl`          | File | (multiple files) | Degrees/certificates - Max 5 files, 4MB each  |

### 🏠 Address & Foreigner Status

| Field                 | Type    | Example              | Description                           |
| --------------------- | ------- | -------------------- | ------------------------------------- |
| `homeAddress`         | Text    | `123 Main St, Dhaka` | Full home address (optional)          |
| `isForeigner`         | Boolean | `true` or `false`    | Is technician a foreigner             |
| `residencePermitUrl`  | File    | (PDF/image)          | Residence permit document             |
| `residencePermitFrom` | Date    | `2024-01-01`         | Permit validity start date (ISO 8601) |
| `residencePermitTo`   | Date    | `2026-12-31`         | Permit validity end date (ISO 8601)   |

### 💼 Employment Details

| Field        | Type | Example             | Description                      |
| ------------ | ---- | ------------------- | -------------------------------- |
| `department` | Text | `Field Services`    | Department name                  |
| `position`   | Text | `Senior Technician` | Job position/title               |
| `joinDate`   | Date | `2024-01-15`        | Employment start date (ISO 8601) |

### 💰 Payment & Commission

| Field            | Type    | Example           | Description                               |
| ---------------- | ------- | ----------------- | ----------------------------------------- |
| `commissionRate` | Number  | `0.15`            | Commission rate as decimal (0.15 = 15%)   |
| `bonusRate`      | Number  | `0.08`            | Bonus rate as decimal (0.08 = 8%)         |
| `baseSalary`     | Number  | `5000`            | Base salary for internal employees        |
| `useCustomRate`  | Boolean | `true` or `false` | Use custom rate instead of global default |

### 🏦 Bank Account Details

| Field                 | Type | Example             | Description                |
| --------------------- | ---- | ------------------- | -------------------------- |
| `bankName`            | Text | `Dutch Bangla Bank` | Bank name                  |
| `bankAccountNumber`   | Text | `1234567890`        | Bank account number        |
| `bankAccountHolder`   | Text | `John Doe`          | Account holder name        |
| `mobileBankingType`   | Text | `BKASH`             | BKASH, NAGAD, ROCKET, etc. |
| `mobileBankingNumber` | Text | `01712345678`       | Mobile banking number      |

### 🕐 System Fields (Auto-managed)

| Field       | Type     | Description                  |
| ----------- | -------- | ---------------------------- |
| `createdAt` | DateTime | Auto-generated on creation   |
| `updatedAt` | DateTime | Auto-updated on modification |

---

## 📋 Postman Request Example

### Request Details

```
Method: PUT or PATCH
URL: {{baseUrl}}/api/admin/technician/1/profile
Headers:
  Authorization: Bearer <admin_token>
Body: form-data
```

### Form-Data Body

```
specialization: ELECTRICAL
academicTitle: BSc Engineering
photo: [Select File]
idCardUrl: [Select File]
isForeigner: true
residencePermitUrl: [Select File]
residencePermitFrom: 2024-01-01
residencePermitTo: 2026-12-31
homeAddress: 123 Main Street, Dhaka-1212, Bangladesh
degreesUrl: [Select File 1]
degreesUrl: [Select File 2]
degreesUrl: [Select File 3]
department: Field Services
position: Senior Technician
joinDate: 2024-01-15
bankName: Dutch Bangla Bank
bankAccountNumber: 1234567890
bankAccountHolder: John Doe
mobileBankingType: BKASH
mobileBankingNumber: 01712345678
commissionRate: 0.15
bonusRate: 0.08
baseSalary: 5000
useCustomRate: true
status: ACTIVE
```

---

## 🔒 Permission Requirements

### Admin Role

- ✅ Can update ALL fields
- ✅ Can upload documents and photos
- ✅ Can modify salary and rates

### Dispatcher Role

- ✅ Can update basic profile fields
- ❌ Cannot update: photoUrl, idCardUrl, residencePermitUrl, degreesUrl, baseSalary
- ❌ Cannot upload files

---

## ✅ Database Schema (TechnicianProfile)

All fields are now available in the database schema with proper types:

- **Boolean fields**: `isForeigner`, `useCustomRate`
- **Date fields**: `residencePermitFrom`, `residencePermitTo`, `joinDate`
- **Text fields**: `homeAddress`, `academicTitle`, `department`, `position`, etc.
- **Number fields**: `commissionRate`, `bonusRate`, `baseSalary`
- **File URLs**: `photoUrl`, `idCardUrl`, `residencePermitUrl`, `degreesUrl` (JSON array)

---

## 📁 File Upload Limits

| Field                | File Types     | Max Size  | Max Files |
| -------------------- | -------------- | --------- | --------- |
| `photo`/`photoUrl`   | jpg, png, webp | 2 MB      | 1         |
| `idCardUrl`          | jpg, png, pdf  | 4 MB      | 1         |
| `residencePermitUrl` | jpg, png, pdf  | 4 MB      | 1         |
| `degreesUrl`         | jpg, png, pdf  | 4 MB each | 5         |

---

## ✅ Implementation Status

**26/26 fields implemented** (100% complete)

### Files Updated:

1. ✅ [prisma/schema.prisma](prisma/schema.prisma) - Added `isForeigner` and `homeAddress`
2. ✅ [src/controllers/admin.controller.js](src/controllers/admin.controller.js) - Added boolean/date conversions
3. ✅ [src/services/admin.service.js](src/services/admin.service.js) - Added all field handlers
4. ✅ Database schema synced with `prisma db push`

---

## 🧪 Testing

Run the test file to verify all fields:

```bash
node test_all_technician_profile_fields.js
```

This will show:

- All 26 available fields
- Current values for each field
- Field completion percentage
- Example request body for Postman

---

## 📝 Notes

1. **Boolean fields** are sent as text (`"true"` or `"false"`) and automatically converted
2. **Date fields** should be in ISO 8601 format: `YYYY-MM-DD`
3. **Rate fields** use decimals: `0.15` = 15%, `0.08` = 8%
4. **File fields** support multiple names: `photo` or `photoUrl` both work
5. **Degrees** can have up to 5 files uploaded simultaneously

---

**Status:** ✅ All fields fully implemented and tested
**Last Updated:** January 29, 2026
