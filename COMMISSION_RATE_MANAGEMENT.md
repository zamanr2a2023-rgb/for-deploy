<!-- @format -->

# Commission Rate Management Guide

## Overview

The system now supports a **fixed default commission rate of 5% (0.05)** for all technicians. Admins can change this rate at any time through the API.

## Commission System Structure

### System-Wide Configuration

- **Default Commission Rate**: 5% (0.05) for freelancer technicians
- **Default Bonus Rate**: 5% (0.05) for internal employees
- Stored in `SystemConfig` table
- Can be updated by admin users

### Individual Technician Rates

- Each technician profile has `useCustomRate` flag
- If `useCustomRate = false`: Uses system default rate
- If `useCustomRate = true`: Uses individual rate from their profile
- Allows flexibility for special cases

---

## API Endpoints for Admin

### 1. Get Current System Configuration

**Endpoint:** `GET /api/admin/system-config`

**Authentication:** Required (Admin only)

**Response:**

```json
{
  "freelancerCommissionRate": 0.05,
  "freelancerCommissionPercentage": 5,
  "internalEmployeeBonusRate": 0.05,
  "internalEmployeeBonusPercentage": 5,
  "internalEmployeeBaseSalary": 0,
  "nextPayoutDate": null,
  "payoutFrequency": "WEEKLY",
  "updatedAt": "2025-12-31T10:30:00.000Z"
}
```

**Example Request:**

```bash
curl -X GET http://localhost:5000/api/admin/system-config \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

### 2. Update Commission Rates

**Endpoint:** `PATCH /api/admin/system-config`

**Authentication:** Required (Admin only)

**Request Body:**

```json
{
  "freelancerCommissionRate": 0.05,
  "internalEmployeeBonusRate": 0.05,
  "internalEmployeeBaseSalary": 0,
  "payoutFrequency": "WEEKLY",
  "nextPayoutDate": "2025-12-31T00:00:00.000Z"
}
```

**Notes:**

- `freelancerCommissionRate`: Float between 0 and 1 (0% to 100%)
  - Example: `0.05` = 5%, `0.10` = 10%, `0.15` = 15%
- `internalEmployeeBonusRate`: Float between 0 and 1 (0% to 100%)
- Only technicians with `useCustomRate = false` will be updated automatically
- Creates audit log entry for tracking changes

**Example Requests:**

**Change to 5% commission:**

```bash
curl -X PATCH http://localhost:5000/api/admin/system-config \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "freelancerCommissionRate": 0.05,
    "internalEmployeeBonusRate": 0.05
  }'
```

**Change to 7% commission:**

```bash
curl -X PATCH http://localhost:5000/api/admin/system-config \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "freelancerCommissionRate": 0.07,
    "internalEmployeeBonusRate": 0.07
  }'
```

**Change to 10% commission:**

```bash
curl -X PATCH http://localhost:5000/api/admin/system-config \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "freelancerCommissionRate": 0.10,
    "internalEmployeeBonusRate": 0.10
  }'
```

**Response:**

```json
{
  "id": 1,
  "freelancerCommissionRate": 0.1,
  "freelancerCommissionPercentage": 10,
  "internalEmployeeBonusRate": 0.1,
  "internalEmployeeBonusPercentage": 10,
  "internalEmployeeBaseSalary": 0,
  "nextPayoutDate": null,
  "payoutFrequency": "WEEKLY",
  "updatedAt": "2025-12-31T10:35:00.000Z",
  "updatedById": 1
}
```

---

## One-Time Setup Script

To set up the system with 5% commission rate and update all existing technician profiles:

```bash
node fix_commission_rate.js
```

**This script will:**

1. Create or update `SystemConfig` with 5% rates
2. Update all technician profiles that don't have custom rates
3. Display a summary of all technicians and their rates
4. Show which technicians use custom rates vs system defaults

**Sample Output:**

```
🔧 Starting commission rate fix to 0.05 (5%)...

📋 Step 1: Updating SystemConfig...
✅ SystemConfig updated:
   - Freelancer Commission Rate: 0.05 (5.0%)
   - Internal Bonus Rate: 0.05 (5.0%)

📋 Step 2: Updating technician profiles...
✅ Updated 10 FREELANCER profiles to 5% commission
✅ Updated 5 INTERNAL profiles to 5% bonus

📋 Step 3: Summary of all technicians...

👤 John Doe (TECH_FREELANCER)
   Type: FREELANCER
   Commission Rate: 0.05 (5.0%) (System Default)

👤 Jane Smith (TECH_INTERNAL)
   Type: INTERNAL
   Bonus Rate: 0.05 (5.0%) (System Default)

✅ Commission rate fix completed successfully!

📌 Summary:
   - System Default Rate: 5% (0.05)
   - Freelancers updated: 10
   - Internal employees updated: 5

💡 To change rates in the future:
   Admin can use: PATCH /api/admin/system-config
   Body: { "freelancerCommissionRate": 0.05 }
   Note: Rate should be between 0 and 1 (0% to 100%)
```

---

## How Commission Calculation Works

### Priority Order (from highest to lowest):

1. **System Config Rate** (if admin has set it in `SystemConfig`)
2. **Individual Technician Rate** (if `useCustomRate = true` in profile)
3. **Default Rate** (0.05 = 5%)

### Example Calculation:

**Work Order Payment:** ৳5000  
**Commission Rate:** 5% (0.05)  
**Commission Amount:** ৳5000 × 0.05 = ৳250

### For Freelancers (TECH_FREELANCER):

- Uses `freelancerCommissionRate` from SystemConfig
- Recorded as "COMMISSION" type
- Added to wallet balance

### For Internal Employees (TECH_INTERNAL):

- Uses `internalEmployeeBonusRate` from SystemConfig
- Recorded as "BONUS" type
- Added to wallet balance

---

## Setting Custom Rates for Individual Technicians

If you need to give a specific technician a different rate:

**Endpoint:** `PATCH /api/admin/users/:id/profile`

**Request Body:**

```json
{
  "commissionRate": 0.08,
  "useCustomRate": true
}
```

This technician will now get 8% commission instead of the system default 5%.

**To revert to system default:**

```json
{
  "useCustomRate": false
}
```

---

## Checking Commission Rates

### View All Technicians with Rates:

```bash
node verify_commission.js
```

### Check System Config via API:

```bash
curl -X GET http://localhost:5000/api/admin/system-config \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## Important Notes

1. **Rate Format**: Always use decimal format (0.05 for 5%, not 5)
2. **Valid Range**: 0 to 1 (0% to 100%)
3. **Automatic Updates**: When system config changes, all technicians with `useCustomRate = false` are updated automatically
4. **Custom Rates Protected**: Technicians with `useCustomRate = true` keep their individual rates even when system config changes
5. **Audit Trail**: All config changes are logged in the audit log table

---

## Common Use Cases

### Increase all rates to 7%:

```bash
curl -X PATCH http://localhost:5000/api/admin/system-config \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"freelancerCommissionRate": 0.07, "internalEmployeeBonusRate": 0.07}'
```

### Set promotional rate of 10% for new technicians:

1. Update system config to 10%
2. After promotion ends, update back to 5%
3. Only affects technicians without custom rates

### Give specific technician higher rate:

```bash
curl -X PATCH http://localhost:5000/api/admin/users/5/profile \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"commissionRate": 0.12, "useCustomRate": true}'
```

---

## Troubleshooting

### Rates not updating?

- Check if technician has `useCustomRate = true`
- Run `node verify_commission.js` to see current state

### Want to reset everything to 5%?

```bash
node fix_commission_rate.js
```

### Check audit logs:

```bash
curl -X GET http://localhost:5000/api/admin/audit-logs \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Filter for `SYSTEM_CONFIG_UPDATED` actions to see commission rate change history.
