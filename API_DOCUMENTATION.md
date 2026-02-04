<!-- @format -->

# FSM System - Complete API Documentation

**Version:** 3.0  
**Last Updated:** November 26, 2025  
**Total Endpoints:** 97

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Quick Start](#quick-start)
3. [Database Schema](#database-schema)
4. [Authentication](#authentication)
5. [API Endpoints](#api-endpoints)
6. [User Roles & Permissions](#user-roles--permissions)
7. [Request/Response Examples](#requestresponse-examples)
8. [Error Handling](#error-handling)
9. [File Uploads](#file-uploads)
10. [Environment Variables](#environment-variables)
11. [Deployment Guide](#deployment-guide)

---

## System Overview

### What is FSM System?

Field Service Management (FSM) System is a comprehensive solution for managing facility maintenance services including HVAC, electrical, plumbing, and cleaning. The system handles the complete workflow:

**Customer Request → Service Request → Work Order → Job Execution → Payment → Commission → Reporting**

### Key Features

- ✅ Multi-role user management (Customer, Technician, Dispatcher, Admin, Call Center)
- ✅ Service request to work order workflow
- ✅ Real-time GPS tracking for technicians
- ✅ Mobile money & cash payment verification
- ✅ Automated commission calculation
- ✅ Time-based work order deadlines
- ✅ Push notifications
- ✅ Comprehensive reporting & analytics
- ✅ Audit trail logging
- ✅ Review & rating system

### Tech Stack

- **Backend:** Node.js + Express.js
- **Database:** PostgreSQL 14+
- **ORM:** Prisma 5.x
- **Authentication:** JWT + OTP
- **File Upload:** Multer
- **Security:** Helmet, bcryptjs

---

## Quick Start

### Prerequisites

```bash
Node.js >= 18.x
PostgreSQL >= 14.x
npm or yarn
```

### Installation Steps

```powershell
# 1. Clone repository
git clone <repository-url>
cd outside-Project-backend

# 2. Install dependencies
npm install

# 3. Create .env file
Copy-Item .env.example .env

# 4. Configure database
# Edit .env and update DATABASE_URL
DATABASE_URL="postgresql://user:password@localhost:5432/fsm_db"
JWT_SECRET="your-super-secret-key"
PORT=4000

# 5. Run migrations
npx prisma generate
npx prisma migrate dev --name init

# 6. Seed database (optional)
node prisma/seed.js

# 7. Create upload directories
New-Item -ItemType Directory -Force -Path uploads/payments
New-Item -ItemType Directory -Force -Path uploads/wo-completion

# 8. Start server
npm start
# Development mode with auto-reload:
npm run dev
```

### Default Users After Seeding

| Role        | Phone         | Password      | Email              |
| ----------- | ------------- | ------------- | ------------------ |
| Admin       | +254700000001 | admin123      | admin@fsm.com      |
| Dispatcher  | +254700000002 | dispatcher123 | dispatcher@fsm.com |
| Call Center | +254700000003 | callcenter123 | callcenter@fsm.com |
| Technician  | +254700000004 | tech123       | tech1@fsm.com      |
| Customer    | +254700000010 | customer123   | customer@fsm.com   |

---

## Database Schema

### Core Models

#### User

```prisma
model User {
  id           Int       @id @default(autoincrement())
  name         String?
  phone        String    @unique
  email        String?   @unique
  passwordHash String
  role         Role      // ADMIN, DISPATCHER, CALL_CENTER, TECH_INTERNAL, TECH_FREELANCER, CUSTOMER
  isBlocked    Boolean   @default(false)
  latitude     Float?    // GPS coordinates
  longitude    Float?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}
```

#### ServiceRequest (SR)

```prisma
model ServiceRequest {
  id          Int      @id @default(autoincrement())
  srNumber    String   @unique
  customerId  Int
  categoryId  Int
  priority    Priority // LOW, MEDIUM, HIGH, URGENT
  status      SRStatus // OPEN, ASSIGNED, CANCELLED, CONVERTED_TO_WO
  description String
  latitude    Float?
  longitude   Float?
  createdAt   DateTime @default(now())
}
```

#### WorkOrder (WO)

```prisma
model WorkOrder {
  id             Int      @id @default(autoincrement())
  woNumber       String   @unique
  technicianId   Int?
  customerId     Int
  status         WOStatus
  scheduledAt    DateTime?
  startedAt      DateTime?
  completedAt    DateTime?
  cancelledAt    DateTime?
  cancelReason   String?
  completionNotes String?
  materialsUsed   String?  // JSON
  photoUrls       String?  // JSON array
}
```

#### Payment

```prisma
model Payment {
  id              Int           @id @default(autoincrement())
  woId            Int           @unique
  amount          Float
  method          PaymentMethod // CASH, MOBILE_MONEY
  transactionRef  String?
  proofUrl        String?
  status          PaymentStatus // PENDING_VERIFICATION, VERIFIED, REJECTED
  createdAt       DateTime      @default(now())
}
```

#### Commission

```prisma
model Commission {
  id           Int      @id @default(autoincrement())
  technicianId Int
  woId         Int
  type         String   // BASE_COMMISSION, BONUS
  amount       Float
  status       String   // PENDING, PAID
  createdAt    DateTime @default(now())
}
```

### Enums

```prisma
enum Role {
  ADMIN
  DISPATCHER
  CALL_CENTER
  TECH_INTERNAL
  TECH_FREELANCER
  CUSTOMER
}

enum WOStatus {
  PENDING_ACCEPTANCE
  ACCEPTED
  IN_PROGRESS
  COMPLETED_PENDING_PAYMENT
  PAID_VERIFIED
  CANCELLED
  REJECTED
  EXPIRED
}

enum PaymentMethod {
  CASH
  MOBILE_MONEY
}

enum PaymentStatus {
  PENDING_VERIFICATION
  VERIFIED
  REJECTED
}
```

---

## Authentication

### Flow

1. **Send OTP** → User enters phone number
2. **Verify OTP** → System validates code
3. **Register/Login** → Create account or authenticate
4. **Access Token** → JWT token returned
5. **Protected Routes** → Include token in Authorization header

### OTP System

```javascript
// Send OTP
POST /api/otp/send
{
  "phone": "+254712345678",
  "type": "REGISTRATION" // or LOGIN, PASSWORD_RESET
}

// Verify OTP
POST /api/otp/verify
{
  "phone": "+254712345678",
  "otp": "123456"
}
```

### Register & Login

```javascript
// Register
POST /api/auth/register
{
  "phone": "+254712345678",
  "password": "SecurePass123",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "CUSTOMER"
}

// Login
POST /api/auth/login
{
  "phone": "+254712345678",
  "password": "SecurePass123"
}

// Response
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "phone": "+254712345678",
    "role": "CUSTOMER"
  }
}
```

### Using JWT Token

```javascript
// Include in all protected requests
headers: {
  "Authorization": "Bearer <your-jwt-token>"
}
```

---

## API Endpoints

### 1. Authentication & OTP (12 endpoints)

| Method | Endpoint                       | Description             | Auth Required | Roles |
| ------ | ------------------------------ | ----------------------- | ------------- | ----- |
| POST   | `/api/otp/send`                | Send OTP to phone       | No            | All   |
| POST   | `/api/otp/verify`              | Verify OTP code         | No            | All   |
| POST   | `/api/auth/register`           | Register new user       | No            | All   |
| POST   | `/api/auth/login`              | Login user              | No            | All   |
| POST   | `/api/auth/logout`             | Logout user             | Yes           | All   |
| GET    | `/api/auth/profile`            | Get user profile        | Yes           | All   |
| PATCH  | `/api/auth/profile`            | Update profile          | Yes           | All   |
| POST   | `/api/auth/change-password`    | Change password         | Yes           | All   |
| POST   | `/api/auth/refresh-token`      | Refresh JWT token       | Yes           | All   |
| POST   | `/api/auth/forgot-password`    | Request password reset  | No            | All   |
| POST   | `/api/auth/reset-password`     | Reset password with OTP | No            | All   |
| DELETE | `/api/auth/deactivate-account` | Deactivate account      | Yes           | All   |

### 2. Service Requests (6 endpoints)

| Method | Endpoint                        | Description                    | Roles                       |
| ------ | ------------------------------- | ------------------------------ | --------------------------- |
| POST   | `/api/srs`                      | Create service request         | CUSTOMER, CALL_CENTER       |
| GET    | `/api/srs`                      | Get all SRs (filtered by role) | All (authenticated)         |
| GET    | `/api/srs/:id`                  | Get SR by ID                   | All (with access check)     |
| PATCH  | `/api/srs/:id/cancel`           | Cancel service request         | CUSTOMER, ADMIN, DISPATCHER |
| GET    | `/api/srs/search-customer`      | Search customer by phone       | CALL_CENTER                 |
| GET    | `/api/srs/customer/:customerId` | Get customer's SRs             | CALL_CENTER, ADMIN          |

**Create SR Example:**

```javascript
POST /api/srs
{
  "categoryId": 1,
  "subserviceId": 2,
  "serviceId": 3,
  "description": "AC not cooling properly",
  "priority": "HIGH",
  "customerName": "Jane Smith",
  "customerPhone": "+254723456789",
  "customerEmail": "jane@example.com",
  "latitude": 23.8103,
  "longitude": 90.4125,
  "address": "123 Main St, Nairobi"
}
```

### 3. Work Orders (13 endpoints)

| Method | Endpoint                          | Description                | Roles                       |
| ------ | --------------------------------- | -------------------------- | --------------------------- |
| GET    | `/api/wos`                        | Get all work orders        | All (filtered by role)      |
| GET    | `/api/wos/:woId`                  | Get WO by ID               | All (with access check)     |
| POST   | `/api/wos`                        | Create WO from SR          | DISPATCHER, ADMIN           |
| PATCH  | `/api/wos/:woId/accept`           | Accept work order          | TECH                        |
| PATCH  | `/api/wos/:woId/reject`           | Reject work order          | TECH                        |
| PATCH  | `/api/wos/:woId/start`            | Start job                  | TECH                        |
| PATCH  | `/api/wos/:woId/complete`         | Complete job (with photos) | TECH                        |
| PATCH  | `/api/wos/:woId/cancel`           | Cancel work order          | ADMIN, DISPATCHER, CUSTOMER |
| PATCH  | `/api/wos/:woId/reassign`         | Reassign to another tech   | ADMIN, DISPATCHER           |
| GET    | `/api/wos/:woId/time-remaining`   | Get time until deadline    | TECH                        |
| GET    | `/api/wos/admin/active-deadlines` | Get all active deadlines   | ADMIN                       |
| GET    | `/api/wos/admin/overdue`          | Get overdue work orders    | ADMIN, DISPATCHER           |
| GET    | `/api/wos/tech/my-wos`            | Get my work orders         | TECH                        |

**Create WO Example:**

```javascript
POST /api/wos
{
  "srId": 5,
  "technicianId": 10,
  "scheduledAt": "2025-11-27T10:00:00Z",
  "estimatedDuration": 120,  // minutes
  "notes": "Customer prefers morning visit"
}
```

**Complete WO with Photos:**

```javascript
PATCH /api/wos/123/complete
Content-Type: multipart/form-data

{
  "completionNotes": "Fixed AC, replaced filter",
  "materialsUsed": '[{"item":"Air Filter","qty":1,"cost":50}]',
  "photos": [<file1>, <file2>]  // Multiple image files
}
```

**Cancel WO Example:**

```javascript
PATCH /api/wos/123/cancel
{
  "reason": "Customer cancelled request"
}
```

### 4. Payments (6 endpoints)

| Method | Endpoint                       | Description            | Roles                   |
| ------ | ------------------------------ | ---------------------- | ----------------------- |
| POST   | `/api/payments`                | Upload payment proof   | TECH                    |
| GET    | `/api/payments`                | Get all payments       | ADMIN, DISPATCHER       |
| GET    | `/api/payments/stats/overview` | Get payment statistics | ADMIN, DISPATCHER       |
| GET    | `/api/payments/:id`            | Get payment by ID      | ADMIN, DISPATCHER, TECH |
| PATCH  | `/api/payments/:id/verify`     | Approve payment        | ADMIN, DISPATCHER       |
| PATCH  | `/api/payments/:id/verify`     | Reject payment         | ADMIN, DISPATCHER       |

**Upload Payment Proof:**

```javascript
POST /api/payments
Content-Type: multipart/form-data

{
  "woId": 123,
  "amount": 5000,
  "method": "MOBILE_MONEY",  // or CASH
  "transactionRef": "MPESA-ABC123",
  "proof": <image-file>  // M-Pesa screenshot
}
```

**Verify Payment (Approve):**

```javascript
PATCH /api/payments/10/verify
{
  "action": "APPROVE"
}
```

**Reject Payment:**

```javascript
PATCH /api/payments/10/verify
{
  "action": "REJECT",
  "reason": "Unclear screenshot"
}
```

### 5. Commissions & Payouts (8 endpoints)

| Method | Endpoint                              | Description             | Roles             |
| ------ | ------------------------------------- | ----------------------- | ----------------- |
| GET    | `/api/commissions`                    | Get my commissions      | TECH              |
| GET    | `/api/commissions/wallet`             | Get wallet balance      | TECH              |
| GET    | `/api/commissions/payout-summary`     | Get payout summary      | TECH              |
| GET    | `/api/commissions/technician/:techId` | Get tech commissions    | ADMIN, DISPATCHER |
| POST   | `/api/commissions/request-payout`     | Request payout          | TECH              |
| GET    | `/api/commissions/payout-requests`    | Get all payout requests | ADMIN, DISPATCHER |
| PATCH  | `/api/commissions/payout/:id/approve` | Approve payout          | ADMIN             |
| PATCH  | `/api/commissions/payout/:id/reject`  | Reject payout           | ADMIN             |

**Request Payout:**

```javascript
POST /api/commissions/request-payout
{
  "amount": 10000,
  "method": "MOBILE_MONEY",
  "accountDetails": {
    "phone": "+254712345678",
    "name": "John Technician"
  }
}
```

### 6. Categories & Services (12 endpoints)

| Method | Endpoint                          | Description           | Roles |
| ------ | --------------------------------- | --------------------- | ----- |
| GET    | `/api/categories`                 | Get all categories    | All   |
| POST   | `/api/categories`                 | Create category       | ADMIN |
| PATCH  | `/api/categories/:id`             | Update category       | ADMIN |
| DELETE | `/api/categories/:id`             | Delete category       | ADMIN |
| PATCH  | `/api/categories/:id/deactivate`  | Deactivate category   | ADMIN |
| POST   | `/api/categories/:id/subservices` | Add subservice        | ADMIN |
| PATCH  | `/api/subservices/:id`            | Update subservice     | ADMIN |
| DELETE | `/api/subservices/:id`            | Delete subservice     | ADMIN |
| PATCH  | `/api/subservices/:id/deactivate` | Deactivate subservice | ADMIN |
| POST   | `/api/subservices/:id/services`   | Add service           | ADMIN |
| PATCH  | `/api/services/:id`               | Update service        | ADMIN |
| DELETE | `/api/services/:id`               | Delete service        | ADMIN |

**Create Category:**

```javascript
POST /api/categories
{
  "name": "HVAC Services",
  "description": "Heating, ventilation, and air conditioning"
}
```

### 7. Admin Dashboard (15 endpoints)

| Method | Endpoint                         | Description            | Roles |
| ------ | -------------------------------- | ---------------------- | ----- |
| GET    | `/api/admin/dashboard`           | Dashboard statistics   | ADMIN |
| GET    | `/api/admin/users`               | Get all users          | ADMIN |
| GET    | `/api/admin/users/:id`           | Get user by ID         | ADMIN |
| PATCH  | `/api/admin/users/:id`           | Update user            | ADMIN |
| DELETE | `/api/admin/users/:id`           | Delete user            | ADMIN |
| POST   | `/api/admin/users/:id/approve`   | Approve technician     | ADMIN |
| POST   | `/api/admin/users/:id/reject`    | Reject technician      | ADMIN |
| POST   | `/api/admin/users/:id/suspend`   | Suspend user           | ADMIN |
| POST   | `/api/admin/users/:id/unsuspend` | Unsuspend user         | ADMIN |
| GET    | `/api/admin/technicians/top5`    | Top 5 technicians      | ADMIN |
| GET    | `/api/admin/stats`               | System statistics      | ADMIN |
| GET    | `/api/admin/audit-trail`         | Audit logs             | ADMIN |
| GET    | `/api/admin/technicians/pending` | Pending tech approvals | ADMIN |
| POST   | `/api/admin/users/create`        | Create user            | ADMIN |
| PATCH  | `/api/admin/users/:id/role`      | Update user role       | ADMIN |

### 8. Reports (5 endpoints)

| Method | Endpoint                              | Description       | Roles             |
| ------ | ------------------------------------- | ----------------- | ----------------- |
| GET    | `/api/reports/work-orders`            | Work order report | ADMIN, DISPATCHER |
| GET    | `/api/reports/commissions`            | Commission report | ADMIN, DISPATCHER |
| GET    | `/api/reports/payments`               | Payment report    | ADMIN, DISPATCHER |
| GET    | `/api/reports/technician-performance` | Tech performance  | ADMIN, DISPATCHER |
| GET    | `/api/reports/financial`              | Financial report  | ADMIN             |

**Work Order Report:**

```javascript
GET /api/reports/work-orders?startDate=2025-11-01&endDate=2025-11-30&status=PAID_VERIFIED
```

### 9. Notifications (3 endpoints)

| Method | Endpoint                      | Description          | Roles |
| ------ | ----------------------------- | -------------------- | ----- |
| GET    | `/api/notifications`          | Get my notifications | All   |
| PATCH  | `/api/notifications/:id/read` | Mark as read         | All   |
| PATCH  | `/api/notifications/read-all` | Mark all as read     | All   |

### 10. Location (GPS) (5 endpoints)

| Method | Endpoint                        | Description                | Roles                       |
| ------ | ------------------------------- | -------------------------- | --------------------------- |
| POST   | `/api/location/update`          | Update technician location | TECH                        |
| GET    | `/api/location/nearby`          | Get nearby technicians     | ADMIN, DISPATCHER           |
| GET    | `/api/location/technician/:id`  | Get tech location          | ADMIN, DISPATCHER, CUSTOMER |
| GET    | `/api/location/eta`             | Calculate ETA              | ADMIN, DISPATCHER, CUSTOMER |
| GET    | `/api/location/history/:techId` | Get location history       | ADMIN, DISPATCHER           |

**Update Location:**

```javascript
POST /api/location/update
{
  "latitude": 23.8103,
  "longitude": 90.4125,
  "status": "ONLINE"  // ONLINE, BUSY, OFFLINE
}
```

### 11. Call Center (3 endpoints)

| Method | Endpoint                             | Description         | Roles       |
| ------ | ------------------------------------ | ------------------- | ----------- |
| POST   | `/api/callcenter/customers`          | Create customer     | CALL_CENTER |
| GET    | `/api/callcenter/wo-tech-info/:woId` | Get WO tech info    | CALL_CENTER |
| GET    | `/api/callcenter/search`             | Search all entities | CALL_CENTER |

### 12. Dispatcher (2 endpoints)

| Method | Endpoint                                      | Description       | Roles      |
| ------ | --------------------------------------------- | ----------------- | ---------- |
| GET    | `/api/dispatcher/nearby-technicians`          | Get nearby techs  | DISPATCHER |
| GET    | `/api/dispatcher/technician-workload/:techId` | Get tech workload | DISPATCHER |

### 13. Reviews & Ratings (3 endpoints)

| Method | Endpoint                          | Description      | Roles    |
| ------ | --------------------------------- | ---------------- | -------- |
| POST   | `/api/reviews`                    | Create review    | CUSTOMER |
| GET    | `/api/reviews/work-order/:woId`   | Get WO review    | All      |
| GET    | `/api/reviews/technician/:techId` | Get tech reviews | All      |

**Create Review:**

```javascript
POST /api/reviews
{
  "woId": 123,
  "rating": 5,
  "comment": "Excellent service, very professional"
}
```

### 14. Dispatch Center (4 endpoints)

| Method | Endpoint                              | Description                    | Roles      |
| ------ | ------------------------------------- | ------------------------------ | ---------- |
| GET    | `/api/dispatch/active-work-orders`    | Get active WOs                 | DISPATCHER |
| GET    | `/api/dispatch/available-technicians` | Get available techs            | DISPATCHER |
| GET    | `/api/dispatch/recommendations/:srId` | Get assignment recommendations | DISPATCHER |
| POST   | `/api/dispatch/assign`                | Assign technician              | DISPATCHER |

---

## User Roles & Permissions

### Role Hierarchy

```
ADMIN (Full Access)
  ├── DISPATCHER (Assignment & Monitoring)
  ├── CALL_CENTER (Customer Support)
  ├── TECH_INTERNAL (Salaried Technicians)
  ├── TECH_FREELANCER (Contract Technicians)
  └── CUSTOMER (Service Requests)
```

### Permission Matrix

| Feature         | ADMIN | DISPATCHER | CALL_CENTER | TECH | CUSTOMER |
| --------------- | ----- | ---------- | ----------- | ---- | -------- |
| Create SR       | ✅    | ✅         | ✅          | ❌   | ✅       |
| View All SRs    | ✅    | ✅         | ✅          | ❌   | Own only |
| Create WO       | ✅    | ✅         | ❌          | ❌   | ❌       |
| Assign WO       | ✅    | ✅         | ❌          | ❌   | ❌       |
| Accept/Start WO | ❌    | ❌         | ❌          | ✅   | ❌       |
| Complete WO     | ❌    | ❌         | ❌          | ✅   | ❌       |
| Upload Payment  | ❌    | ❌         | ❌          | ✅   | ❌       |
| Verify Payment  | ✅    | ✅         | ❌          | ❌   | ❌       |
| Approve Payout  | ✅    | ❌         | ❌          | ❌   | ❌       |
| View Reports    | ✅    | ✅         | ❌          | ❌   | ❌       |
| Manage Users    | ✅    | ❌         | ❌          | ❌   | ❌       |
| Cancel WO       | ✅    | ✅         | ❌          | ❌   | Own only |

---

## Request/Response Examples

### Complete Workflow Example

#### 1. Customer Creates Service Request

```javascript
POST /api/srs
Authorization: Bearer <customer-token>

Request:
{
  "categoryId": 1,
  "description": "AC not cooling",
  "priority": "HIGH",
  "latitude": -1.2921,
  "longitude": 36.8219
}

Response: 201 Created
{
  "id": 15,
  "srNumber": "SR-1732617600000",
  "status": "OPEN",
  "customer": {
    "id": 5,
    "name": "Jane Doe",
    "phone": "+254712345678"
  }
}
```

#### 2. Dispatcher Creates Work Order

```javascript
POST /api/wos
Authorization: Bearer <dispatcher-token>

Request:
{
  "srId": 15,
  "technicianId": 8,
  "scheduledAt": "2025-11-27T10:00:00Z",
  "estimatedDuration": 90
}

Response: 201 Created
{
  "id": 42,
  "woNumber": "WO-1732617700000",
  "status": "PENDING_ACCEPTANCE",
  "technician": {
    "id": 8,
    "name": "John Tech",
    "phone": "+254722334455"
  }
}
```

#### 3. Technician Accepts Work Order

```javascript
PATCH /api/wos/42/accept
Authorization: Bearer <tech-token>

Response: 200 OK
{
  "id": 42,
  "status": "ACCEPTED",
  "acceptedAt": "2025-11-26T14:30:00Z"
}
```

#### 4. Technician Starts Job

```javascript
PATCH /api/wos/42/start
Authorization: Bearer <tech-token>

Request:
{
  "latitude": -1.2921,
  "longitude": 36.8219
}

Response: 200 OK
{
  "id": 42,
  "status": "IN_PROGRESS",
  "startedAt": "2025-11-27T10:05:00Z"
}
```

#### 5. Technician Completes Job

```javascript
PATCH /api/wos/42/complete
Authorization: Bearer <tech-token>
Content-Type: multipart/form-data

Request:
{
  "completionNotes": "Replaced air filter, refilled refrigerant",
  "materialsUsed": '[{"item":"Air Filter","qty":1,"cost":50},{"item":"Refrigerant","qty":1,"cost":200}]',
  "photos": [<before.jpg>, <after.jpg>]
}

Response: 200 OK
{
  "id": 42,
  "status": "COMPLETED_PENDING_PAYMENT",
  "completedAt": "2025-11-27T11:30:00Z",
  "photoUrls": ["/uploads/wo-completion/wo-1732617800000-1.jpg"]
}
```

#### 6. Technician Uploads Payment Proof

```javascript
POST /api/payments
Authorization: Bearer <tech-token>
Content-Type: multipart/form-data

Request:
{
  "woId": 42,
  "amount": 5000,
  "method": "MOBILE_MONEY",
  "transactionRef": "MPESA-QR12345",
  "proof": <mpesa-screenshot.jpg>
}

Response: 201 Created
{
  "id": 20,
  "status": "PENDING_VERIFICATION",
  "amount": 5000,
  "proofUrl": "/uploads/payments/payment-1732617900000.jpg"
}
```

#### 7. Admin Verifies Payment

```javascript
PATCH /api/payments/20/verify
Authorization: Bearer <admin-token>

Request:
{
  "action": "APPROVE"
}

Response: 200 OK
{
  "id": 20,
  "status": "VERIFIED",
  "verifiedAt": "2025-11-27T12:00:00Z",
  "commissions": [
    {
      "id": 35,
      "type": "BASE_COMMISSION",
      "amount": 1000,
      "technicianId": 8
    }
  ]
}
```

---

## Error Handling

### Standard Error Response Format

```javascript
{
  "message": "Error description",
  "error": "Detailed error information (dev mode only)"
}
```

### HTTP Status Codes

| Code | Meaning               | Usage                                           |
| ---- | --------------------- | ----------------------------------------------- |
| 200  | OK                    | Successful GET, PATCH, DELETE                   |
| 201  | Created               | Successful POST                                 |
| 400  | Bad Request           | Validation error, missing required fields       |
| 401  | Unauthorized          | Missing or invalid token                        |
| 403  | Forbidden             | Valid token but insufficient permissions        |
| 404  | Not Found             | Resource doesn't exist                          |
| 409  | Conflict              | Duplicate resource (e.g., phone already exists) |
| 500  | Internal Server Error | Server error                                    |

### Common Error Examples

**Missing Token:**

```javascript
401 Unauthorized
{
  "message": "No token provided"
}
```

**Insufficient Permissions:**

```javascript
403 Forbidden
{
  "message": "You can only cancel your own work orders"
}
```

**Validation Error:**

```javascript
400 Bad Request
{
  "message": "Work Order ID is required"
}
```

**Not Found:**

```javascript
404 Not Found
{
  "message": "Work Order not found"
}
```

---

## File Uploads

### Upload Endpoints

#### 1. Payment Proof Upload

```javascript
POST /api/payments
Content-Type: multipart/form-data

Fields:
- woId: integer
- amount: number
- method: "CASH" | "MOBILE_MONEY"
- transactionRef: string
- proof: file (image)

Accepted formats: .jpg, .jpeg, .png, .pdf
Max size: 10MB
```

#### 2. Work Order Completion Photos

```javascript
PATCH /api/wos/:woId/complete
Content-Type: multipart/form-data

Fields:
- completionNotes: string
- materialsUsed: JSON string
- photos: file[] (multiple images)

Accepted formats: .jpg, .jpeg, .png, .pdf
Max size per file: 10MB
Max files: 5
```

### File Storage Structure

```
uploads/
├── payments/
│   ├── payment-1732617900000.jpg
│   └── payment-1732617901000.png
└── wo-completion/
    ├── wo-1732617800000-1.jpg
    ├── wo-1732617800000-2.jpg
    └── wo-1732617800000-3.jpg
```

### Frontend Upload Example (React/React Native)

```javascript
// Using FormData
const formData = new FormData();
formData.append("woId", "42");
formData.append("amount", "5000");
formData.append("method", "MOBILE_MONEY");
formData.append("transactionRef", "MPESA-123");
formData.append("proof", {
  uri: imageUri,
  type: "image/jpeg",
  name: "payment-proof.jpg",
});

fetch("http://localhost:4000/api/payments", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});
```

---

## Environment Variables

### Required Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/fsm_db"

# JWT
JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters"

# Server
PORT=4000
NODE_ENV="development"  # or "production"

# Optional: OTP Service (for production)
OTP_API_KEY="your-sms-provider-api-key"
OTP_SENDER_ID="FSM-System"
```

### Development vs Production

```env
# Development
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/fsm_dev

# Production
NODE_ENV=production
DATABASE_URL=postgresql://user:password@production-db:5432/fsm_prod
JWT_SECRET=<strong-random-secret>
```

---

## Deployment Guide

### Production Checklist

- [ ] Set strong `JWT_SECRET` (32+ characters, random)
- [ ] Configure production database URL
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS/SSL
- [ ] Set up file upload storage (S3, Azure Blob, etc.)
- [ ] Configure CORS for frontend domains
- [ ] Set up logging (Winston, Sentry)
- [ ] Enable rate limiting
- [ ] Set up database backups
- [ ] Configure environment variables on hosting platform

### Deploy to Heroku

```bash
# 1. Create Heroku app
heroku create fsm-api

# 2. Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev

# 3. Set environment variables
heroku config:set JWT_SECRET="your-secret-key"
heroku config:set NODE_ENV="production"

# 4. Deploy
git push heroku main

# 5. Run migrations
heroku run npx prisma migrate deploy
```

### Deploy to Railway

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Initialize project
railway init

# 4. Add PostgreSQL
railway add

# 5. Set environment variables
railway variables set JWT_SECRET="your-secret-key"

# 6. Deploy
railway up
```

### Deploy to VPS (Ubuntu)

```bash
# 1. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# 3. Clone repository
git clone <your-repo>
cd outside-Project-backend

# 4. Install dependencies
npm install

# 5. Set up environment
cp .env.example .env
nano .env  # Edit variables

# 6. Run migrations
npx prisma migrate deploy

# 7. Install PM2
npm install -g pm2

# 8. Start application
pm2 start src/server.js --name fsm-api

# 9. Set up nginx reverse proxy
sudo apt install nginx
sudo nano /etc/nginx/sites-available/fsm-api
# Configure proxy to localhost:4000
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npx prisma generate

EXPOSE 4000

CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: "3.8"

services:
  api:
    build: .
    ports:
      - "4000:4000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/fsm_db
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db

  db:
    image: postgres:14-alpine
    environment:
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=fsm_db
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

---

## Frontend Integration Guide

### Setting Up API Client

```javascript
// api/client.js
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

const apiClient = axios.create({
  baseURL: API_URL,
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors (redirect to login)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### Authentication Service

```javascript
// services/auth.service.js
import apiClient from "./client";

export const authService = {
  async sendOTP(phone) {
    const { data } = await apiClient.post("/api/otp/send", {
      phone,
      type: "LOGIN",
    });
    return data;
  },

  async verifyOTP(phone, otp) {
    const { data } = await apiClient.post("/api/otp/verify", {
      phone,
      otp,
    });
    return data;
  },

  async login(phone, password) {
    const { data } = await apiClient.post("/api/auth/login", {
      phone,
      password,
    });
    localStorage.setItem("token", data.token);
    return data;
  },

  async register(userData) {
    const { data } = await apiClient.post("/api/auth/register", userData);
    localStorage.setItem("token", data.token);
    return data;
  },

  logout() {
    localStorage.removeItem("token");
  },
};
```

### Service Request Service

```javascript
// services/sr.service.js
import apiClient from "./client";

export const srService = {
  async create(srData) {
    const { data } = await apiClient.post("/api/srs", srData);
    return data;
  },

  async getAll(filters = {}) {
    const { data } = await apiClient.get("/api/srs", { params: filters });
    return data;
  },

  async getById(id) {
    const { data } = await apiClient.get(`/api/srs/${id}`);
    return data;
  },

  async cancel(id, reason) {
    const { data } = await apiClient.patch(`/api/srs/${id}/cancel`, { reason });
    return data;
  },
};
```

### Work Order Service

```javascript
// services/wo.service.js
import apiClient from "./client";

export const woService = {
  async getMyWorkOrders() {
    const { data } = await apiClient.get("/api/wos/tech/my-wos");
    return data;
  },

  async accept(woId) {
    const { data } = await apiClient.patch(`/api/wos/${woId}/accept`);
    return data;
  },

  async start(woId, location) {
    const { data } = await apiClient.patch(`/api/wos/${woId}/start`, location);
    return data;
  },

  async complete(woId, formData) {
    const { data } = await apiClient.patch(
      `/api/wos/${woId}/complete`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return data;
  },
};
```

### React Component Example

```javascript
// components/WorkOrderList.jsx
import React, { useEffect, useState } from "react";
import { woService } from "../services/wo.service";

function WorkOrderList() {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkOrders();
  }, []);

  const loadWorkOrders = async () => {
    try {
      const data = await woService.getMyWorkOrders();
      setWorkOrders(data);
    } catch (error) {
      console.error("Failed to load work orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (woId) => {
    try {
      await woService.accept(woId);
      loadWorkOrders(); // Reload list
    } catch (error) {
      alert("Failed to accept work order");
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>My Work Orders</h2>
      {workOrders.map((wo) => (
        <div key={wo.id} className='work-order-card'>
          <h3>{wo.woNumber}</h3>
          <p>Status: {wo.status}</p>
          <p>Customer: {wo.customer.name}</p>
          <p>Scheduled: {new Date(wo.scheduledAt).toLocaleString()}</p>

          {wo.status === "PENDING_ACCEPTANCE" && (
            <button onClick={() => handleAccept(wo.id)}>
              Accept Work Order
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default WorkOrderList;
```

### React Native Example

```javascript
// screens/CompleteWorkOrder.jsx
import React, { useState } from "react";
import { View, Text, Button, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { woService } from "../services/wo.service";

function CompleteWorkOrder({ route, navigation }) {
  const { woId } = route.params;
  const [photos, setPhotos] = useState([]);
  const [notes, setNotes] = useState("");

  const pickImage = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const handleComplete = async () => {
    const formData = new FormData();
    formData.append("completionNotes", notes);
    formData.append("materialsUsed", JSON.stringify([]));

    photos.forEach((uri, index) => {
      formData.append("photos", {
        uri,
        type: "image/jpeg",
        name: `photo-${index}.jpg`,
      });
    });

    try {
      await woService.complete(woId, formData);
      navigation.goBack();
    } catch (error) {
      alert("Failed to complete work order");
    }
  };

  return (
    <View>
      <Text>Complete Work Order</Text>
      <Button title='Take Photo' onPress={pickImage} />
      {photos.map((uri, index) => (
        <Image
          key={index}
          source={{ uri }}
          style={{ width: 100, height: 100 }}
        />
      ))}
      <Button title='Submit' onPress={handleComplete} />
    </View>
  );
}

export default CompleteWorkOrder;
```

---

## Testing with Postman

### Import Collection

1. Download `FSM-API.postman_collection.json`
2. Open Postman → Import → Select file
3. Collection will be organized into 14 folders

### Set Environment Variables

```json
{
  "baseUrl": "http://localhost:4000",
  "adminToken": "",
  "techToken": "",
  "customerToken": "",
  "dispatcherToken": "",
  "woId": "",
  "srId": "",
  "paymentId": ""
}
```

### Testing Flow

1. **Send OTP** → Get verification code
2. **Login** → Token auto-saved to environment
3. **Create SR** → SR ID auto-saved
4. **Create WO** → WO ID auto-saved
5. **Accept/Start/Complete WO** → Use saved WO ID
6. **Upload Payment** → Payment ID auto-saved
7. **Verify Payment** → Commission auto-calculated

---

## Support & Contact

### Documentation Updates

This documentation is maintained in: `API_DOCUMENTATION.md`

### Issue Reporting

For bugs or feature requests, please create an issue in the repository.

### API Versioning

Current Version: **v3.0**  
Base Path: `/api`

### Change Log

- **v3.0** (Nov 26, 2025) - Complete refactor, 97 endpoints
- **v2.0** (Nov 20, 2025) - Added reviews, dispatch center
- **v1.0** (Nov 15, 2025) - Initial release

---

**Last Updated:** November 26, 2025  
**Total Endpoints:** 97  
**Documentation Status:** ✅ Complete
