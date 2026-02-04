<!-- @format -->

# FSM API - Complete Endpoint Documentation

**Last Updated:** December 3, 2025  
**Version:** 1.0

## 📋 Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Technician Profile APIs](#technician-profile-apis)
3. [Technician Dashboard APIs](#technician-dashboard-apis)
4. [Work Order APIs](#work-order-apis)
5. [Service Request APIs](#service-request-apis)
6. [Role-Based Access Control](#role-based-access-control)

---

## 🔐 Authentication & Authorization

### Base URL

```
Production: https://api.fsm-app.com
Development: http://localhost:4000
```

### Authentication Header

```
Authorization: Bearer <JWT_TOKEN>
```

### Available Roles

- `CUSTOMER` - End users booking services
- `TECH_FREELANCER` - Freelance technicians (40% commission)
- `TECH_INTERNAL` - Internal staff technicians (5% bonus)
- `DISPATCHER` - Job assignment and scheduling
- `CALL_CENTER` - Customer support
- `ADMIN` - Full system access

---

## 👤 Technician Profile APIs

### 1. Get Technician Profile

**Endpoint:** `GET /api/auth/profile`  
**Authorization:** Technician only (TECH_FREELANCER, TECH_INTERNAL)  
**Status:** ✅ ENHANCED (Dec 3, 2025)

**Response Structure:**

```json
{
  "id": 5,
  "name": "Mike Freelancer",
  "phone": "5555555555",
  "email": "tech.freelancer@fsm.com",
  "role": "TECH_FREELANCER",
  "homeAddress": "789 Freelancer Ave, Nairobi",
  "createdAt": "2025-12-03T09:24:09.997Z",
  "technicianProfile": {
    "id": 2,
    "type": "FREELANCER",
    "commissionRate": 0.4,
    "bonusRate": 0.05,
    "baseSalary": 0,
    "status": "ACTIVE",

    // 14.1 Employment Details (NEW)
    "department": "Field Services",
    "joinDate": "2023-01-15T00:00:00.000Z",
    "position": "Senior Technician",

    // 14.2 Skills & Specializations (ENHANCED)
    "specialization": "Electrical, Plumbing",
    "skills": ["Electrical", "Plumbing"],

    // 14.3 Certifications (ENHANCED)
    "degreesUrl": "[{\"name\":\"...\",\"url\":\"...\"}]",
    "certifications": [
      {
        "name": "Electrical Engineering Diploma",
        "url": "/uploads/cert-1.pdf",
        "verifiedAt": "2025-12-03T09:24:10.212Z"
      },
      {
        "name": "Plumbing License",
        "url": "/uploads/cert-2.pdf",
        "verifiedAt": "2025-12-03T09:24:10.212Z"
      }
    ],

    // 15.1 Response Time (NEW)
    "responseTime": {
      "minutes": 25,
      "formatted": "25 min",
      "status": "excellent" // excellent | good | average
    },

    // 15.2 Bonus Information (NEW)
    "bonus": {
      "thisWeek": 5400,
      "rate": 0.4,
      "ratePercentage": 40,
      "type": "Commission" // Commission | Bonus
    },

    // 15.3 Priority Status (NEW)
    "priorityStatus": {
      "counts": {
        "high": 6,
        "medium": 6,
        "low": 0
      },
      "percentages": {
        "high": 50,
        "medium": 50,
        "low": 0
      },
      "mostCommon": "HIGH"
    },

    // Banking Details
    "bankName": null,
    "bankAccountNumber": null,
    "bankAccountHolder": null,
    "mobileBankingType": null,
    "mobileBankingNumber": null
  }
}
```

**UI Component Mapping:**

**14.1 Employment Details:**

- Department: `technicianProfile.department`
- Join Date: `technicianProfile.joinDate`
- Position: `technicianProfile.position`
- Status: `technicianProfile.status`

**14.2 Skills & Specializations:**

- Skills Array: `technicianProfile.skills`
- Display as badges

**14.3 My Certifications:**

- Array: `technicianProfile.certifications`
- Show count: `certifications.length`
- Each has: name, url, verifiedAt

**15.1 Response Time:**

- Average: `responseTime.formatted`
- Rating: `responseTime.status`
  - excellent ⭐⭐⭐ (≤30 mins)
  - good ⭐⭐ (30-60 mins)
  - average ⭐ (>60 mins)

**15.2 Bonus:**

- This Week: `bonus.thisWeek`
- Rate: `bonus.ratePercentage%`
- Type: `bonus.type`

**15.3 Priority Status:**

- Job Distribution: `priorityStatus.counts`
- Percentages: `priorityStatus.percentages`
- Most Common: `priorityStatus.mostCommon`

---

## 📊 Technician Dashboard APIs

### 2. Get Dashboard Statistics

**Endpoint:** `GET /api/technician/dashboard`  
**Authorization:** Technician only  
**Status:** ✅ COMPLETE

**Response:**

```json
{
  "thisWeekBonus": 1800,
  "jobsToday": 2,
  "activeJobs": 1,
  "completedThisMonth": 28,
  "inProgress": 1,
  "readyToStart": 2
}
```

**Field Descriptions:**

- `thisWeekBonus`: Total earnings this week ($)
- `jobsToday`: Jobs scheduled for today
- `activeJobs`: ACCEPTED + IN_PROGRESS jobs
- `completedThisMonth`: All completed jobs this month
- `inProgress`: Jobs currently being worked on
- `readyToStart`: ASSIGNED jobs awaiting acceptance

### 3. Get Technician Jobs (by Status)

**Endpoint:** `GET /api/technician/jobs?status={status}`  
**Authorization:** Technician only  
**Status:** ✅ NEW (Dec 3, 2025)

**Query Parameters:**

- `status` (required):
  - `incoming` - ASSIGNED jobs (ready to accept)
  - `active` - ACCEPTED or IN_PROGRESS
  - `done` - COMPLETED or PAID_VERIFIED

**Response:**

```json
[
  {
    "id": 2,
    "woNumber": "WO-1234567891",
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "scheduledAt": "2025-12-03T00:00:00.000Z",
    "customer": {
      "name": "Jane Smith",
      "phone": "8888888888"
    },
    "service": {
      "name": "HVAC Repair"
    },
    "category": {
      "name": "HVAC"
    },
    "address": "789 Smith Road, Nairobi",
    "latitude": -1.295,
    "longitude": 36.82,
    "estimatedDuration": 60,
    "bonusCalculation": {
      "baseRate": 900,
      "rate": 0.4,
      "bonus": 360,
      "rateDisplay": "40% Commission"
    }
  }
]
```

**UI Tab Mapping:**

- Incoming Tab: `?status=incoming`
- Active Tab: `?status=active`
- Done Tab: `?status=done`

### 4. Get Technician Earnings

**Endpoint:** `GET /api/technician/earnings`  
**Authorization:** Technician only  
**Status:** ✅ ENHANCED (Dec 3, 2025)

**Response:**

```json
{
  "totalBonuses": {
    "amount": 12500,
    "increaseRate": 25.5,
    "increaseText": "+25.5% from last month"
  },
  "breakdown": {
    "today": 1800,
    "thisWeek": 5400,
    "thisWeekPercentage": 40,
    "thisMonth": 12500
  },
  "availableBonus": {
    "amount": 5400,
    "jobsCount": 6,
    "jobsText": "6 jobs",
    "bonusText": "40% bonus",
    "payoutInfo": "Regular payout: Every Monday"
  },
  "bonusRate": {
    "rate": 0.4,
    "ratePercentage": 40,
    "type": "Commission",
    "description": "Earn 40% commission on every verified job completion. Commissions are paid every Monday, with early payout available during the week for urgent needs."
  },
  "monthlySalary": {
    "baseSalary": 0,
    "thisMonthBonus": 12500,
    "total": 12500,
    "isFreelancer": true
  },
  "recentBonuses": [
    {
      "id": 1,
      "jobName": "HVAC Repair",
      "customerName": "Michael Johnson",
      "date": "2025-12-03T14:00:00Z",
      "jobPayment": 900,
      "bonus": 360,
      "status": "BOOKED",
      "woNumber": "WO-123"
    }
  ]
}
```

**UI Component Mapping:**

**Total Bonuses Card:**

- Amount: `totalBonuses.amount`
- Growth: `totalBonuses.increaseText`

**Breakdown Section:**

- Today: `breakdown.today`
- This Week: `breakdown.thisWeek`
- This Month: `breakdown.thisMonth`

**Available Bonus Card:**

- Amount: `availableBonus.amount`
- Job Count: `availableBonus.jobsCount`
- Info: `availableBonus.payoutInfo`

**Recent Transactions:**

- List: `recentBonuses` (last 10)

---

## 🛠️ Work Order APIs

### 5. Complete Work Order

**Endpoint:** `PATCH /api/wos/:woId/complete`  
**Authorization:** Technician (must be assigned)  
**Status:** ✅ FIXED (Dec 3, 2025)

**What Was Fixed:**

- ✅ Now accepts jobs in ACCEPTED status (not just IN_PROGRESS)
- ✅ Photos are now OPTIONAL (not required)
- ✅ Returns bonus calculation in response

**Request (multipart/form-data):**

```
completionNotes (optional): "Job completed successfully"
materialsUsed (optional): "[{\"item\":\"Wire\",\"qty\":10,\"cost\":50}]"
photos (optional): File uploads (0-5 files, max 10MB each)
```

**Response:**

```json
{
  "message": "Work order completed",
  "workOrder": {
    "id": 2,
    "woNumber": "WO-123",
    "status": "COMPLETED",
    "completedAt": "2025-12-03T14:30:00Z",
    "completionNotes": "Job completed successfully",
    "completionPhotos": "[\"photo1.jpg\", \"photo2.jpg\"]"
  },
  "bonusCalculation": {
    "baseRate": 900,
    "rate": 0.4,
    "bonus": 360,
    "rateDisplay": "40% Commission"
  }
}
```

**Status Flow:**

- ACCEPTED → COMPLETED ✅
- IN_PROGRESS → COMPLETED ✅

**Bonus Calculation:**

- Freelancers: `baseRate × 0.4` (40%)
- Internal: `baseRate × 0.05` (5%)

### 6. Accept Work Order

**Endpoint:** `PATCH /api/wos/:woId/respond`  
**Authorization:** Technician  
**Status:** ✅ WORKING

**Request:**

```json
{
  "action": "ACCEPT"
}
```

**Status:** ASSIGNED → ACCEPTED

### 7. Start Work Order

**Endpoint:** `PATCH /api/wos/:woId/start`  
**Authorization:** Technician  
**Status:** ✅ WORKING

**Request:**

```json
{
  "lat": 23.8103,
  "lng": 90.4125
}
```

**Status:** ACCEPTED → IN_PROGRESS

---

## 🎯 Role-Based Access Control

### Customer APIs

| Endpoint             | Method | Access         |
| -------------------- | ------ | -------------- |
| `/api/auth/profile`  | GET    | ✅ Own profile |
| `/api/sr`            | POST   | ✅ Create SR   |
| `/api/srs/my`        | GET    | ✅ Own SRs     |
| `/api/sr/:id/cancel` | PATCH  | ✅ Own SRs     |
| `/api/sr/:id/rebook` | POST   | ✅ Own SRs     |

### Technician APIs (TECH_FREELANCER, TECH_INTERNAL)

| Endpoint                    | Method | Description                           | Status      |
| --------------------------- | ------ | ------------------------------------- | ----------- |
| `/api/auth/profile`         | GET    | Get profile with all enhancements     | ✅ ENHANCED |
| `/api/technician/dashboard` | GET    | Dashboard statistics                  | ✅ COMPLETE |
| `/api/technician/jobs`      | GET    | Jobs by status (incoming/active/done) | ✅ NEW      |
| `/api/technician/earnings`  | GET    | Complete earnings summary             | ✅ ENHANCED |
| `/api/technician/wallet`    | GET    | Wallet balance                        | ✅ WORKING  |
| `/api/wos/:id/respond`      | PATCH  | Accept/Decline job                    | ✅ WORKING  |
| `/api/wos/:id/start`        | PATCH  | Start job with GPS                    | ✅ WORKING  |
| `/api/wos/:id/complete`     | PATCH  | Complete job                          | ✅ FIXED    |

### Dispatcher APIs

| Endpoint                  | Method | Access                 |
| ------------------------- | ------ | ---------------------- |
| `/api/sr`                 | GET    | ✅ All SRs             |
| `/api/wos`                | GET    | ✅ All WOs             |
| `/api/wos/from-sr/:id`    | POST   | ✅ Convert SR to WO    |
| `/api/wos/:id/reassign`   | PATCH  | ✅ Reassign technician |
| `/api/wos/:id/reschedule` | PATCH  | ✅ Reschedule WO       |

### Admin APIs

| Endpoint         | Method | Access             |
| ---------------- | ------ | ------------------ |
| All endpoints    | ALL    | ✅ Full access     |
| `/api/reports/*` | GET    | ✅ All reports     |
| `/api/users`     | ALL    | ✅ User management |

---

## 📝 Summary of Today's Changes (Dec 3, 2025)

### 1. Technician Profile Enhancements

✅ Added Employment Details (department, joinDate, position)  
✅ Enhanced Skills parsing to array format  
✅ Enhanced Certifications parsing to array with verification  
✅ Added Response Time metrics (average, formatted, status)  
✅ Added Bonus Information (thisWeek, rate, type)  
✅ Added Priority Status distribution (counts, percentages, mostCommon)

### 2. Database Schema Updates

✅ Added `department`, `joinDate`, `position` to TechnicianProfile  
✅ Created migration: `20251203092100_add_employment_details`  
✅ Updated seed data with employment details

### 3. API Fixes

✅ Fixed Complete WO to accept ACCEPTED status  
✅ Made photos optional in Complete WO  
✅ Added bonus calculation to Complete WO response  
✅ Fixed import paths in technician routes

### 4. New Endpoints

✅ `GET /api/technician/jobs?status={status}` - Job filtering by status  
✅ Enhanced `/api/technician/earnings` - Complete earnings breakdown  
✅ Enhanced `/api/auth/profile` - Full technician profile with all metrics

---

## 🧪 Testing Credentials

```
Admin: 1111111111 / admin123
Dispatcher: 2222222222 / dispatcher123
Internal Tech: 4444444444 / tech123
Freelancer: 5555555555 / freelancer123
Customer: 9999999999 / customer123
```

---

## 📞 Support

For API issues or questions, contact the development team.

**Last Verified:** December 3, 2025  
**API Version:** 1.0  
**Documentation Version:** 1.0
