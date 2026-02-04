<!-- @format -->

# FSM Backend - Endpoints and Responses (Fixes)

## 1. Call Center Dashboard Stats

**GET** `/api/call-center/stats`

**Response:**

```json
{
  "pendingSRs": 5,
  "inProgressWOs": 3,
  "resolvedWOs": 12,
  "todaysSRs": 2
}
```

---

## 2. Authentication Errors

**Enhanced Error Messages for 401 Responses:**

**Token Expired:**

```json
{
  "message": "Token has expired",
  "error": "TOKEN_EXPIRED"
}
```

**Invalid Token:**

```json
{
  "message": "Invalid token",
  "error": "INVALID_TOKEN"
}
```

**Token Not Yet Valid:**

```json
{
  "message": "Token not yet valid",
  "error": "TOKEN_NOT_VALID"
}
```

---

## 3. Technician Status Summary

**GET** `/api/admin/technicians/status-summary`

**Response:**

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

## 4. Commission Rate Endpoints (Dispatcher Access)

**GET** `/api/rates/default/FREELANCER`

**Response:**

```json
{
  "technicianType": "FREELANCER",
  "commissionRate": 50,
  "bonusRate": 5
}
```

**GET** `/api/rates/default/INTERNAL`

**Response:**

```json
{
  "technicianType": "INTERNAL",
  "commissionRate": 30,
  "bonusRate": 3
}
```

---

## 5. Payment Statistics

**GET** `/api/payments/stats`

**Response:**

```json
{
  "awaitingVerification": 6,
  "verified": 16,
  "rejected": 0,
  "total": 22
}
```

---

## 6. Technician Locations (Map Display)

**GET** `/api/admin/technician-locations`

**Response:**

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
    },
    {
      "id": 42,
      "name": "Jane Technician",
      "displayStatus": "BUSY",
      "lastLatitude": 23.7805,
      "lastLongitude": 90.42,
      "locationUpdatedAt": "2026-01-21T10:25:00Z"
    }
  ],
  "summary": {
    "online": 4,
    "busy": 3,
    "offline": 7
  }
}
```

---

## 7. Technician Status Update

**POST** `/api/location/status`

**Request:**

```json
{
  "status": "ONLINE"
}
```

**Response:**

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

## 8. Dispatch Statistics (Detailed)

**GET** `/api/admin/technicians/status-summary`

**Response:**

```json
{
  "total": 14,
  "blocked": 0,
  "online": 4,
  "busy": 3,
  "offline": 7,
  "profileActive": 14,
  "profileInactive": 0,
  "technicians": [
    {
      "id": 41,
      "name": "John Technician",
      "phone": "1234567890",
      "role": "TECHNICIAN",
      "technicianType": "FREELANCER",
      "isBlocked": false,
      "locationStatus": "ONLINE",
      "profileStatus": "ACTIVE"
    }
  ]
}
```

---

## 9. Password Reset (NEW)

**POST** `/api/admin/users/:id/reset-password`

**Request:**

```json
{
  "newPassword": "newPassword123"
}
```

**Response:**

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

## 10. Category Deletion with Dependencies

**DELETE** `/api/categories/:id`

**Response (with dependencies):**

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

**DELETE** `/api/categories/:id?force=true`

**Response (force delete):**

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

## 10b. Service Deletion with Dependencies (NEW FIX)

**DELETE** `/api/categories/services/:id`

**Response (with dependencies):**

```json
{
  "message": "Cannot delete service with existing dependencies",
  "dependencies": {
    "subservices": 2,
    "serviceRequests": 5,
    "workOrders": 3
  },
  "hint": "Use ?force=true to delete service and all dependencies"
}
```

**DELETE** `/api/categories/services/:id?force=true`

**Response (force delete):**

```json
{
  "message": "Service and all dependencies deleted successfully",
  "deleted": {
    "service": "AC Installation",
    "subservices": 2,
    "serviceRequests": 5,
    "workOrders": 3
  }
}
```

---

## 10c. Subservice Deletion with Dependencies (NEW FIX)

**DELETE** `/api/categories/subservices/:id`

**Response (with dependencies):**

```json
{
  "message": "Cannot delete subservice with existing dependencies",
  "dependencies": {
    "serviceRequests": 3,
    "workOrders": 2
  },
  "hint": "Use ?force=true to delete subservice and all dependencies"
}
```

**DELETE** `/api/categories/subservices/:id?force=true`

**Response (force delete):**

```json
{
  "message": "Subservice and all dependencies deleted successfully",
  "deleted": {
    "subservice": "Split AC Installation",
    "serviceRequests": 3,
    "workOrders": 2
  }
}
```

---

## 11. Payout Batch Mark-Paid (NEW)

**POST** `/api/payouts/batches/:id/mark-paid`

**Request:**

```json
{
  "paymentReference": "TXN123456",
  "paymentMethod": "Bank Transfer",
  "notes": "Paid via company account"
}
```

**Response:**

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

## 12. Payout Batch Details

**GET** `/api/payouts/batches/:id`

**Response:**

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

## 13. Early Payout Approval

**PATCH** `/api/payouts/early-requests/:id/approve`

**Response:**

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

## Customer Fix Response (Database Update)

**Direct Database Update Response for Customer 41164406:**

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

## Status Codes

- **200** - Success
- **201** - Created
- **400** - Bad Request
- **401** - Unauthorized (with enhanced error messages)
- **403** - Forbidden
- **404** - Not Found
- **409** - Conflict (for category deletion with dependencies)
- **500** - Internal Server Error
