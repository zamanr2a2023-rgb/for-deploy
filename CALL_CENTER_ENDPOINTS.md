<!-- @format -->

# CALL_CENTER Role - Available Endpoints

## 🎯 Overview

The CALL_CENTER role has access to specific endpoints for managing customer service requests, viewing work orders, and accessing dispatch information.

---

## 📋 Available Endpoints for CALL_CENTER Role

### 1️⃣ Authentication & Profile

**Base Path:** `/api/auth`

| Method | Endpoint                     | Description               | Access                |
| ------ | ---------------------------- | ------------------------- | --------------------- |
| POST   | `/api/auth/login`            | Login to get token        | ✅ Public             |
| POST   | `/api/auth/logout`           | Logout (invalidate token) | ✅ All authenticated  |
| GET    | `/api/auth/profile`          | Get own profile           | ✅ All authenticated  |
| PATCH  | `/api/auth/profile`          | Update own profile        | ✅ All authenticated  |
| PATCH  | `/api/auth/customer/:userId` | Update customer profile   | ✅ CALL_CENTER, ADMIN |

**Examples:**

```bash
# Login
POST {{baseUrl}}/api/auth/login
Body: { "phone": "3333333333", "password": "callcenter123" }

# Get Profile
GET {{baseUrl}}/api/auth/profile
Authorization: Bearer {{callCenterToken}}

# Update Customer Profile
PATCH {{baseUrl}}/api/auth/customer/10
Authorization: Bearer {{callCenterToken}}
Body: { "name": "Updated Name", "homeAddress": "New Address" }
```

---

### 2️⃣ Service Requests (SR)

**Base Path:** `/api/sr`

| Method | Endpoint                  | Description                | Access                                      |
| ------ | ------------------------- | -------------------------- | ------------------------------------------- |
| GET    | `/api/sr/search-customer` | Search customer by phone   | ✅ CALL_CENTER, DISPATCHER, ADMIN           |
| POST   | `/api/sr`                 | Create new service request | ✅ Anyone (guest/auth)                      |
| GET    | `/api/sr`                 | List all service requests  | ✅ CALL_CENTER, DISPATCHER, ADMIN, CUSTOMER |
| GET    | `/api/sr/:id`             | Get SR details by ID       | ✅ CALL_CENTER, DISPATCHER, ADMIN, CUSTOMER |
| PATCH  | `/api/sr/:id/cancel`      | Cancel a service request   | ✅ CALL_CENTER, DISPATCHER, ADMIN, CUSTOMER |
| PATCH  | `/api/sr/:id/reject`      | Reject a service request   | ✅ CALL_CENTER, DISPATCHER, ADMIN           |
| GET    | `/api/sr/recent`          | Get recent services        | ✅ All authenticated                        |

**Examples:**

```bash
# Search Customer
GET {{baseUrl}}/api/sr/search-customer?phone=9999999999
Authorization: Bearer {{callCenterToken}}

# Create SR for Customer
POST {{baseUrl}}/api/sr
Authorization: Bearer {{callCenterToken}}
Body: {
  "name": "Customer Name",
  "phone": "12345678",
  "address": "123 Main St",
  "categoryId": 1,
  "serviceId": 1,
  "subserviceId": 1,
  "description": "AC not cooling",
  "priority": "HIGH",
  "latitude": 23.8103,
  "longitude": 90.4125
}

# List All SRs
GET {{baseUrl}}/api/sr?status=OPEN&page=1&limit=20
Authorization: Bearer {{callCenterToken}}

# Get SR Details
GET {{baseUrl}}/api/sr/SR-1234567890
Authorization: Bearer {{callCenterToken}}

# Cancel SR
PATCH {{baseUrl}}/api/sr/SR-1234567890/cancel
Authorization: Bearer {{callCenterToken}}
Body: { "reason": "Customer cancelled" }

# Reject SR
PATCH {{baseUrl}}/api/sr/SR-1234567890/reject
Authorization: Bearer {{callCenterToken}}
Body: { "reason": "Out of service area" }
```

---

### 3️⃣ Work Orders (WO)

**Base Path:** `/api/wos`

| Method | Endpoint       | Description            | Access               |
| ------ | -------------- | ---------------------- | -------------------- |
| GET    | `/api/wos`     | List work orders (all) | ✅ All authenticated |
| GET    | `/api/wos/:id` | Get WO details         | ✅ All authenticated |

**Examples:**

```bash
# List Work Orders
GET {{baseUrl}}/api/wos?status=ASSIGNED&page=1&limit=20
Authorization: Bearer {{callCenterToken}}

# Get WO Details
GET {{baseUrl}}/api/wos/WO-1234567890
Authorization: Bearer {{callCenterToken}}
```

---

### 4️⃣ Call Center Dashboard

**Base Path:** `/api/call-center`

| Method | Endpoint                 | Description              | Access                            |
| ------ | ------------------------ | ------------------------ | --------------------------------- |
| GET    | `/api/call-center/stats` | Get dashboard statistics | ✅ CALL_CENTER, ADMIN, DISPATCHER |

**Example:**

```bash
GET {{baseUrl}}/api/call-center/stats
Authorization: Bearer {{callCenterToken}}

Response:
{
  "success": true,
  "stats": {
    "totalServiceRequests": { "count": 86, "label": "All time SRs" },
    "pending": { "count": 5, "label": "Awaiting action" },
    "inProgress": { "count": 0, "label": "Being worked on" },
    "resolved": { "count": 0, "label": "Completed SRs" },
    "openSRsToday": { "count": 1, "label": "Opened today" },
    "avgTimeToDispatch": { "hours": 2.2, "label": "2.2 hrs" }
  }
}
```

---

### 5️⃣ Call Center Operations

**Base Path:** `/api/callcenter`

| Method | Endpoint                               | Description                  | Access                            |
| ------ | -------------------------------------- | ---------------------------- | --------------------------------- |
| POST   | `/api/callcenter/customers`            | Create new customer with GPS | ✅ CALL_CENTER, ADMIN             |
| GET    | `/api/callcenter/wos/:woId/technician` | Get technician info for WO   | ✅ CALL_CENTER, ADMIN, DISPATCHER |

**Examples:**

```bash
# Create Customer with GPS
POST {{baseUrl}}/api/callcenter/customers
Authorization: Bearer {{callCenterToken}}
Body: {
  "name": "New Customer",
  "phone": "12345678",
  "email": "customer@example.com",
  "latitude": 23.8103,
  "longitude": 90.4125,
  "address": "123 Main Street, Dhaka"
}

# Get WO Technician Info
GET {{baseUrl}}/api/callcenter/wos/1/technician
Authorization: Bearer {{callCenterToken}}
```

---

### 6️⃣ Dispatch Information

**Base Path:** `/api/dispatch`

| Method | Endpoint                             | Description                      | Access                            |
| ------ | ------------------------------------ | -------------------------------- | --------------------------------- |
| GET    | `/api/dispatch/overview`             | Get dispatch overview stats      | ✅ CALL_CENTER, DISPATCHER, ADMIN |
| GET    | `/api/dispatch/technician-status`    | Get technician status summary    | ✅ CALL_CENTER, DISPATCHER, ADMIN |
| GET    | `/api/dispatch/recent-work-orders`   | Get recent work orders           | ✅ CALL_CENTER, DISPATCHER, ADMIN |
| GET    | `/api/dispatch/technician-locations` | Get technician locations for map | ✅ CALL_CENTER, DISPATCHER, ADMIN |

**Examples:**

```bash
# Dispatch Overview
GET {{baseUrl}}/api/dispatch/overview
Authorization: Bearer {{callCenterToken}}

# Technician Status
GET {{baseUrl}}/api/dispatch/technician-status
Authorization: Bearer {{callCenterToken}}

# Recent Work Orders
GET {{baseUrl}}/api/dispatch/recent-work-orders?limit=10
Authorization: Bearer {{callCenterToken}}

# Technician Locations (Map View)
GET {{baseUrl}}/api/dispatch/technician-locations
Authorization: Bearer {{callCenterToken}}
```

---

### 7️⃣ SMS Operations

**Base Path:** `/api/sms`

| Method | Endpoint        | Description   | Access                |
| ------ | --------------- | ------------- | --------------------- |
| GET    | `/api/sms/logs` | View SMS logs | ✅ CALL_CENTER, ADMIN |

**Example:**

```bash
GET {{baseUrl}}/api/sms/logs?page=1&limit=20
Authorization: Bearer {{callCenterToken}}
```

---

## 🚫 Restricted Endpoints (NOT Accessible)

CALL_CENTER role **CANNOT** access:

- ❌ Admin user management (`/api/admin/*`)
- ❌ Technician management (create/update technicians)
- ❌ Payment management
- ❌ Commission management
- ❌ Payout management
- ❌ Rate configuration
- ❌ System configuration
- ❌ Technician-only endpoints (accept/start/complete WO)

---

## 📊 Summary

### Total Accessible Endpoints: **20+**

**By Category:**

- ✅ **Authentication:** 5 endpoints
- ✅ **Service Requests:** 7 endpoints
- ✅ **Work Orders:** 2 endpoints (view only)
- ✅ **Dashboard:** 1 endpoint
- ✅ **Call Center Ops:** 2 endpoints
- ✅ **Dispatch Info:** 4 endpoints
- ✅ **SMS Logs:** 1 endpoint

---

## 🎯 Common Use Cases

### Use Case 1: Customer Calls for Service

```bash
1. Search existing customer:
   GET /api/sr/search-customer?phone=9999999999

2. If not found, create customer:
   POST /api/callcenter/customers

3. Create service request:
   POST /api/sr

4. Get dashboard stats:
   GET /api/call-center/stats
```

### Use Case 2: Check Work Order Status

```bash
1. List work orders:
   GET /api/wos?status=IN_PROGRESS

2. Get specific WO:
   GET /api/wos/WO-1234567890

3. Get technician info:
   GET /api/callcenter/wos/1/technician
```

### Use Case 3: Monitor Operations

```bash
1. Dashboard stats:
   GET /api/call-center/stats

2. Dispatch overview:
   GET /api/dispatch/overview

3. Technician locations:
   GET /api/dispatch/technician-locations

4. Recent work orders:
   GET /api/dispatch/recent-work-orders
```

---

## 🔐 Authentication

All endpoints require Bearer token authentication:

```bash
Authorization: Bearer {{callCenterToken}}
```

**Get Token:**

```bash
POST {{baseUrl}}/api/auth/login
Body: {
  "phone": "3333333333",
  "password": "callcenter123"
}
```

---

## ✅ Quick Reference

**Login Credentials:**

- Phone: `3333333333`
- Password: `callcenter123`

**Most Used Endpoints:**

1. `POST /api/sr` - Create service request
2. `GET /api/sr/search-customer` - Find customer
3. `GET /api/call-center/stats` - Dashboard
4. `GET /api/dispatch/overview` - Operations overview
5. `POST /api/callcenter/customers` - New customer

---

**Last Updated:** December 14, 2025  
**Status:** ✅ Complete and Tested
