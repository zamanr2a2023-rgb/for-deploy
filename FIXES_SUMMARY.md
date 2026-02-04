<!-- @format -->

# FSM Backend Fixes Summary

**Date:** January 21, 2026  
**Total Fixes:** 13

---

## 1. Customer Work Order Creation Fix

**Problem:** Customer 41164406 couldn't create work orders  
**Cause:** `homeAddress` was NULL  
**File:** Database update  
**Solution:** Updated homeAddress to "Nouakchott, Mauritania"

**API Response:**

```json
{
  "message": "Address updated successfully",
  "customer": {
    "id": 41164406,
    "homeAddress": "Nouakchott, Mauritania"
  }
}
```

---

## 2. Call Center Stats Fix

**Problem:** Dashboard stats showing wrong numbers  
**Cause:** Using wrong status values (OPEN instead of NEW, SR statuses instead of WO statuses)  
**File:** `src/controllers/call-center.controller.js`

**Changes:**

- `pendingSRs` now counts `NEW` + `OPEN` status
- `inProgressWOs` counts Work Orders with `IN_PROGRESS` status
- `resolvedWOs` counts Work Orders with `PAID_VERIFIED` status

**API Response:**

```json
{
  "pendingSRs": 5,
  "inProgressWOs": 3,
  "resolvedWOs": 12,
  "todaysSRs": 2
}
```

---

## 3. Authentication Error Enhancement

**Problem:** Generic 401 errors without details  
**File:** `src/middleware/auth.js`

**Changes:** Added specific error messages for:

- `TokenExpiredError` → "Token has expired"
- `JsonWebTokenError` → "Invalid token"
- `NotBeforeError` → "Token not yet valid"

**API Response:**

```json
{
  "message": "Token has expired",
  "error": "TOKEN_EXPIRED"
}
```

---

## 4. Technician Offline Count Fix

**Problem:** Offline count showing 0 when technicians had NULL locationStatus  
**File:** `src/services/dispatch.service.js`

**Changes:** `getTechnicianStatus` now counts NULL locationStatus as OFFLINE

**API Response:**

```json
{
  "activeTechnicians": 4,
  "busyTechnicians": 3,
  "offlineTechnicians": 7,
  "blockedTechnicians": 0,
  "allTechnicians": 14
}
```

---

## 5. Commission Endpoints for Dispatcher

**Problem:** Dispatcher couldn't access commission rate endpoints  
**File:** `src/routes/rate.routes.js`

**Changes:** Added `DISPATCHER` role to GET endpoints:

- `GET /api/rates/default/FREELANCER`
- `GET /api/rates/default/INTERNAL`

**API Response:**

```json
{
  "technicianType": "FREELANCER",
  "commissionRate": 50,
  "bonusRate": 5
}
```

---

## 6. Payment Filter Count Fix

**Problem:** Payment stats count didn't match filtered list  
**Cause:** `getPaymentStats` had extra `proofUrl` condition  
**File:** `src/controllers/payment.controller.js`

**Changes:** Removed `proofUrl: { not: null }` condition from awaitingVerification count

**API Response:**

```json
{
  "awaitingVerification": 6,
  "verified": 16,
  "rejected": 0,
  "total": 22
}
```

---

## 7. Map Technician Display Fix

**Problem:** All technicians showing online even when offline  
**Files:**

- `src/controllers/admin.controller.js`
- `src/services/dispatch.service.js`
- `src/controllers/location.controller.js`
- `src/routes/location.routes.js`

**Changes:**

- Use `lastLatitude/lastLongitude` (mobile GPS) instead of `latitude/longitude`
- Use `locationStatus` field for online/offline/busy
- Added 30-minute stale threshold
- Added `POST /api/location/status` endpoint for technicians

**API Response (GET /api/admin/technician-locations):**

```json
{
  "technicians": [
    {
      "id": 41,
      "name": "John Technician",
      "displayStatus": "ONLINE",
      "lastLatitude": 23.8103,
      "lastLongitude": 90.4125,
      "locationUpdatedAt": "2026-01-21T10:30:00Z"
    }
  ],
  "summary": {
    "online": 4,
    "busy": 3,
    "offline": 7
  }
}
```

**API Request (POST /api/location/status):**

```json
{
  "status": "ONLINE"
}
```

**API Response:**

```json
{
  "message": "Status updated to ONLINE",
  "technician": {
    "id": 41,
    "name": "John Technician",
    "locationStatus": "ONLINE"
  }
}
```

---

## 8. Dispatch Statistics Fix

**Problem:** Active/Busy/Blocked counts overlapping  
**Cause:** Mixing employment status with availability status  
**File:** `src/controllers/admin.controller.js`

**Changes:** Made categories mutually exclusive:

- `blocked` = isBlocked=true
- `online` = unblocked + locationStatus=ONLINE
- `busy` = unblocked + locationStatus=BUSY
- `offline` = unblocked + locationStatus=OFFLINE/NULL

**API Response (GET /api/admin/technicians/status-summary):**

```json
{
  "total": 14,
  "blocked": 0,
  "online": 4,
  "busy": 3,
  "offline": 7,
  "profileActive": 14,
  "profileInactive": 0,
  "technicians": [...]
}
```

---

## 9. Password Reset Endpoint (NEW)

**Problem:** No way to reset user passwords  
**Files:**

- `src/controllers/admin.controller.js`
- `src/routes/admin.routes.js`

**New Endpoint:** `POST /api/admin/users/:id/reset-password`

**API Request:**

```json
{
  "newPassword": "newPassword123"
}
```

**API Response:**

```json
{
  "message": "Password reset successfully",
  "user": {
    "id": 40,
    "name": "Call Center Agent",
    "phone": "1234567890",
    "role": "CALL_CENTER"
  }
}
```

---

## 10. Category Deletion Fix

**Problem:** Foreign key constraint error when deleting category  
**File:** `src/controllers/category.controller.js`

**Changes:** Added dependency checking and optional cascading delete

**API Response (with dependencies):**

```json
{
  "message": "Cannot delete category with existing dependencies",
  "dependencies": {
    "services": 3,
    "serviceRequests": 5,
    "workOrders": 2
  },
  "hint": "Use ?force=true to delete category and reassign/remove all dependencies"
}
```

**API Response (force delete):**

```json
{
  "message": "Category and all dependencies deleted successfully",
  "deleted": {
    "category": "Plumbing",
    "services": 3,
    "serviceRequests": 5,
    "workOrders": 2
  }
}
```

---

## 11. Payout Batch Mark-Paid Endpoint (NEW)

**Problem:** Batch status stays "Pending" after confirmation  
**Files:**

- `src/controllers/payout.controller.js`
- `src/routes/payout.routes.js`

**New Endpoint:** `POST /api/payouts/batches/:id/mark-paid`

**API Request:**

```json
{
  "paymentReference": "TXN123456",
  "paymentMethod": "Bank Transfer",
  "notes": "Paid via company account"
}
```

**API Response:**

```json
{
  "message": "Payout batch marked as paid successfully",
  "payout": {
    "id": 5,
    "technicianId": 41,
    "technicianName": "John Technician",
    "totalAmount": 250.0,
    "commissionsCount": 3,
    "type": "WEEKLY",
    "status": "COMPLETED",
    "processedAt": "2026-01-21T12:00:00Z"
  },
  "walletDeducted": 250.0,
  "paymentReference": "TXN123456",
  "paymentMethod": "Bank Transfer"
}
```

---

## 12. Payout Batch Details Endpoint

**Problem:** Need commission breakdown for batch  
**Endpoint:** `GET /api/payouts/batches/:id` (Already existed)

**API Response:**

```json
{
  "id": 5,
  "technician": {
    "id": 41,
    "name": "John Technician",
    "phone": "1234567890"
  },
  "totalAmount": 250.0,
  "type": "WEEKLY",
  "status": "SCHEDULED",
  "details": [
    {
      "id": 1,
      "woNumber": "WO-2026-001",
      "serviceName": "AC Repair",
      "customerName": "Alice Customer",
      "paymentAmount": 500,
      "commissionType": "COMMISSION",
      "commissionRate": 50,
      "commissionAmount": 250,
      "status": "PENDING_PAYOUT"
    }
  ],
  "summary": {
    "totalCommissions": 1,
    "totalAmount": 250,
    "averagePerJob": 250
  }
}
```

---

## 13. Early Payout Approval Fix

**Problem:** "Insufficient wallet balance" error for valid requests  
**Cause:** Checking both wallet balance AND earned commissions (redundant)  
**File:** `src/controllers/payout.controller.js`

**Changes:** Removed redundant earned commissions check. Early payout now only checks wallet balance.

**API Response (PATCH /api/payouts/early-requests/:id/approve):**

```json
{
  "message": "Early payout approved successfully",
  "payout": {
    "id": 10,
    "technicianId": 47,
    "totalAmount": 10,
    "type": "EARLY",
    "status": "COMPLETED",
    "processedAt": "2026-01-21T12:00:00Z"
  },
  "walletDeducted": 10
}
```

---

## Files Modified

| File                                        | Changes                                              |
| ------------------------------------------- | ---------------------------------------------------- |
| `src/controllers/admin.controller.js`       | Password reset, technician locations, dispatch stats |
| `src/controllers/call-center.controller.js` | Stats queries fix                                    |
| `src/controllers/category.controller.js`    | Cascading delete                                     |
| `src/controllers/location.controller.js`    | Set status endpoint, location update                 |
| `src/controllers/payment.controller.js`     | Payment stats fix                                    |
| `src/controllers/payout.controller.js`      | Mark-paid endpoint, early payout fix                 |
| `src/middleware/auth.js`                    | JWT error messages                                   |
| `src/routes/admin.routes.js`                | Password reset route                                 |
| `src/routes/location.routes.js`             | Set status route                                     |
| `src/routes/payout.routes.js`               | Mark-paid route                                      |
| `src/routes/rate.routes.js`                 | Dispatcher access                                    |
| `src/services/dispatch.service.js`          | Offline count, technician locations                  |

---

## Server Restart Required

After all fixes, restart the server:

```bash
npm run dev
```
