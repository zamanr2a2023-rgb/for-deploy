<!-- @format -->

# 💳 PAYMENT ENDPOINT FLOW - Technician & Freelancer Guide

**Date:** December 26, 2025  
**System:** FSM (Field Service Management)  
**Base URL:** `/api/payments`

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Payment Flow Diagram](#payment-flow-diagram)
3. [API Endpoints](#api-endpoints)
4. [Step-by-Step Flow](#step-by-step-flow)
5. [Commission Calculation](#commission-calculation)
6. [Request/Response Examples](#requestresponse-examples)
7. [Error Handling](#error-handling)

---

## 🎯 Overview

### Technician Types & Earnings

| Type              | Role             | Rate | Earning Type | Wallet |
| ----------------- | ---------------- | ---- | ------------ | ------ |
| **Freelancer**    | TECH_FREELANCER  | 5%   | Commission   | ✅ Yes |
| **Internal**      | TECH_INTERNAL    | 5%   | Bonus        | ✅ Yes |

### Payment States

```
PENDING_VERIFICATION  →  VERIFIED  (Payment Approved)
                      →  REJECTED  (Payment Declined)
```

---

## 🔄 Payment Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     PAYMENT ENDPOINT FLOW                       │
└─────────────────────────────────────────────────────────────────┘

STEP 1: WORK ORDER COMPLETION
┌──────────────────────────────────────┐
│ Technician completes work            │
│ WO Status: COMPLETED_PENDING_PAYMENT │
└──────────────────┬───────────────────┘
                   │
                   ▼
STEP 2: UPLOAD PAYMENT PROOF
┌──────────────────────────────────────┐
│ POST /api/payments                   │
│ Body: { woId, method, amount? }      │
│ File: proof (optional)               │
│                                      │
│ ✅ Payment Created                   │
│ Status: PENDING_VERIFICATION         │
└──────────────────┬───────────────────┘
                   │
                   ▼
STEP 3: ADMIN VERIFICATION
┌──────────────────────────────────────┐
│ PATCH /api/payments/:id/verify       │
│ Body: { action: "APPROVE" }          │
│                                      │
│ ✅ Payment Status: VERIFIED          │
│ ✅ WO Status: PAID_VERIFIED          │
└──────────────────┬───────────────────┘
                   │
                   ▼
STEP 4: AUTO COMMISSION CALCULATION
┌──────────────────────────────────────┐
│ System automatically creates:        │
│                                      │
│ FREELANCER:                          │
│   • Commission = Amount × 5%         │
│   • Wallet Balance += Commission     │
│   • Transaction: CREDIT              │
│                                      │
│ INTERNAL:                            │
│   • Bonus = Amount × 5%              │
│   • Wallet Balance += Bonus          │
│   • Transaction: CREDIT              │
│                                      │
│ ✅ Notification Sent                 │
└──────────────────────────────────────┘
```

---

## 📡 API Endpoints

### 1. Upload Payment Proof (Technician)

```
POST /api/payments
```

**Authorization:** `Bearer {token}` (TECH_INTERNAL, TECH_FREELANCER)

**Content-Type:** `multipart/form-data`

**Request Body:**

| Field          | Type   | Required | Description                        |
| -------------- | ------ | -------- | ---------------------------------- |
| woId           | number | ✅       | Work Order ID                      |
| method         | string | ✅       | Payment method (CASH, MOBILE)      |
| amount         | number | ❌       | Manual amount (auto-fetch if null) |
| transactionRef | string | ❌       | Transaction reference              |
| proof          | file   | ❌       | Payment proof image (max 5MB)      |

**Allowed File Types:** JPEG, JPG, PNG, GIF

---

### 2. Verify Payment (Admin/Dispatcher)

```
PATCH /api/payments/:id/verify
```

**Authorization:** `Bearer {token}` (ADMIN, DISPATCHER)

**Request Body:**

| Field  | Type   | Required | Description                |
| ------ | ------ | -------- | -------------------------- |
| action | string | ✅       | "APPROVE" or "REJECT"      |
| reason | string | ❌       | Reason (required if REJECT)|

---

### 3. Get All Payments (Admin/Dispatcher)

```
GET /api/payments
```

**Authorization:** `Bearer {token}` (ADMIN, DISPATCHER)

**Query Parameters:**

| Param        | Type   | Description            |
| ------------ | ------ | ---------------------- |
| status       | string | Filter by status       |
| woId         | number | Filter by Work Order   |
| technicianId | number | Filter by Technician   |
| method       | string | Filter by method       |
| page         | number | Page number (default 1)|
| limit        | number | Items per page (10)    |

---

### 4. Get Payment by ID

```
GET /api/payments/:id
```

**Authorization:** `Bearer {token}` (ADMIN, DISPATCHER, TECH_INTERNAL, TECH_FREELANCER)

---

### 5. Get Payment Statistics (Admin/Dispatcher)

```
GET /api/payments/stats/overview
```

**Authorization:** `Bearer {token}` (ADMIN, DISPATCHER)

---

## 📝 Step-by-Step Flow

### For Freelancer Technician

```
1. Complete Work Order
   └─ WO Status: COMPLETED_PENDING_PAYMENT

2. Collect Payment from Customer
   └─ Cash or Mobile Payment

3. Upload Payment Proof
   POST /api/payments
   {
     "woId": 123,
     "method": "CASH",
     "amount": 1000  // Optional - auto-fetches from service rate
   }

4. Wait for Admin Verification
   └─ Status: PENDING_VERIFICATION

5. Admin Approves
   └─ Payment Status: VERIFIED
   └─ WO Status: PAID_VERIFIED

6. Commission Auto-Calculated
   └─ Commission = ₹1000 × 5% = ₹50
   └─ Wallet Balance += ₹50
   └─ Notification Sent 🔔

7. Payout Options
   └─ Weekly Auto-Payout (Sunday 11:59 PM)
   └─ On-Demand Payout Request
```

### For Internal Technician

```
1-5. Same as Freelancer

6. Bonus Auto-Calculated
   └─ Bonus = ₹1000 × 5% = ₹50
   └─ Wallet Balance += ₹50
   └─ Notification Sent 🔔

7. Payout
   └─ Included in monthly salary
   └─ Or via weekly/on-demand payout
```

---

## 💰 Commission Calculation

### Calculation Formula

```
Commission/Bonus = Payment Amount × Rate

Rate is configured in SystemConfig:
- freelancerCommissionRate: 0.05 (5%)
- internalEmployeeBonusRate: 0.05 (5%)
```

### Examples

| Payment Amount | Technician Type | Rate | Earnings |
| -------------- | --------------- | ---- | -------- |
| ₹500           | Freelancer      | 5%   | ₹25      |
| ₹1,000         | Freelancer      | 5%   | ₹50      |
| ₹2,500         | Freelancer      | 5%   | ₹125     |
| ₹5,000         | Internal        | 5%   | ₹250     |
| ₹10,000        | Internal        | 5%   | ₹500     |

---

## 📋 Request/Response Examples

### 1. Upload Payment Proof

**Request:**

```bash
curl -X POST /api/payments \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: multipart/form-data" \
  -F "woId=123" \
  -F "method=CASH" \
  -F "amount=1000" \
  -F "proof=@payment_receipt.jpg"
```

**Response (201 Created):**

```json
{
  "id": 45,
  "woId": 123,
  "technicianId": 5,
  "amount": 1000,
  "method": "CASH",
  "proofUrl": "https://storage.example.com/payments/payment-123.jpg",
  "status": "PENDING_VERIFICATION",
  "createdAt": "2025-12-26T10:00:00.000Z"
}
```

---

### 2. Verify Payment (Approve)

**Request:**

```bash
curl -X PATCH /api/payments/45/verify \
  -H "Authorization: Bearer {adminToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "APPROVE"
  }'
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Payment verified successfully",
  "payment": {
    "id": 45,
    "woId": 123,
    "technicianId": 5,
    "amount": 1000,
    "method": "CASH",
    "status": "VERIFIED",
    "verifiedById": 1,
    "verifiedAt": "2025-12-26T10:05:00.000Z"
  },
  "earnings": {
    "type": "COMMISSION",
    "rate": 0.05,
    "ratePercentage": 5,
    "amount": 50
  }
}
```

---

### 3. Verify Payment (Reject)

**Request:**

```bash
curl -X PATCH /api/payments/45/verify \
  -H "Authorization: Bearer {adminToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "REJECT",
    "reason": "Payment proof is blurry and unreadable"
  }'
```

**Response (200 OK):**

```json
{
  "id": 45,
  "woId": 123,
  "status": "REJECTED",
  "rejectedReason": "Payment proof is blurry and unreadable"
}
```

---

### 4. Get All Payments

**Request:**

```bash
curl -X GET "/api/payments?status=PENDING_VERIFICATION&page=1&limit=10" \
  -H "Authorization: Bearer {adminToken}"
```

**Response (200 OK):**

```json
{
  "payments": [
    {
      "id": 45,
      "woId": 123,
      "amount": 1000,
      "method": "CASH",
      "status": "PENDING_VERIFICATION",
      "workOrder": {
        "id": 123,
        "woNumber": "WO-2025-0123",
        "status": "COMPLETED_PENDING_PAYMENT",
        "customer": {
          "id": 10,
          "name": "Customer Name",
          "phone": "+8801712345678"
        }
      },
      "technician": {
        "id": 5,
        "name": "Technician Name",
        "phone": "+8801787654321"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

---

### 5. Get Payment Statistics

**Request:**

```bash
curl -X GET /api/payments/stats/overview \
  -H "Authorization: Bearer {adminToken}"
```

**Response (200 OK):**

```json
{
  "pendingUpload": 5,
  "awaitingVerification": 12,
  "verified": 156,
  "rejected": 3,
  "totalCommissions": 25000
}
```

---

## ❌ Error Handling

### Common Error Responses

| Status | Error                                     | Cause                                    |
| ------ | ----------------------------------------- | ---------------------------------------- |
| 400    | "woId and method are required"            | Missing required fields                  |
| 400    | "Work Order is not completed yet"         | WO status not COMPLETED_PENDING_PAYMENT  |
| 400    | "No service pricing found"                | Service has no base rate configured      |
| 400    | "Action must be APPROVE or REJECT"        | Invalid action in verify endpoint        |
| 400    | "Payment already verified"                | Trying to verify already processed payment|
| 400    | "Payment amount is invalid or missing"    | Payment amount is null or <= 0           |
| 404    | "Work Order not found"                    | Invalid woId                             |
| 404    | "Payment not found"                       | Invalid payment ID                       |

### Error Response Format

```json
{
  "message": "Error description here",
  "serviceInfo": {
    "category": "AC Service",
    "subservice": "Installation",
    "service": "Split AC"
  }
}
```

---

## 🔔 Notifications

### Payment Verified Notification

When payment is verified, technician receives push notification:

```json
{
  "title": "Payment Verified",
  "body": "Your payment for WO-2025-0123 has been verified. Commission: ₹50",
  "data": {
    "type": "PAYMENT_VERIFIED",
    "woId": 123,
    "paymentId": 45,
    "commission": 50
  }
}
```

---

## 📊 Database Records Created

### On Payment Upload

1. **Payment** record created (status: PENDING_VERIFICATION)
2. **AuditLog** entry (action: PAYMENT_UPLOADED)

### On Payment Verification (Approve)

1. **Payment** updated (status: VERIFIED)
2. **WorkOrder** updated (status: PAID_VERIFIED)
3. **Commission** record created (type: COMMISSION/BONUS)
4. **Wallet** balance updated (+commission amount)
5. **WalletTransaction** created (type: CREDIT)
6. **AuditLog** entry (action: PAYMENT_VERIFIED)
7. **Push Notification** sent

### On Payment Verification (Reject)

1. **Payment** updated (status: REJECTED, rejectedReason)
2. **AuditLog** entry (action: PAYMENT_REJECTED)

---

## 🛠️ Related Endpoints

| Endpoint                           | Description                    |
| ---------------------------------- | ------------------------------ |
| `GET /api/commissions`             | Get technician commissions     |
| `POST /api/commissions/payout-request` | Request on-demand payout   |
| `GET /api/wallet`                  | Get wallet balance             |
| `GET /api/wallet/transactions`     | Get wallet transaction history |

---

## ✅ Quick Reference

### Payment Methods

- `CASH` - Cash payment from customer
- `MOBILE` - Mobile banking (bKash, Nagad, etc.)

### Payment Statuses

- `PENDING_VERIFICATION` - Awaiting admin verification
- `VERIFIED` - Payment approved
- `REJECTED` - Payment declined

### Commission Types

- `COMMISSION` - For freelancer technicians
- `BONUS` - For internal employees

### Commission Statuses

- `EARNED` - Commission calculated, in wallet
- `PAID` - Commission paid out to technician
