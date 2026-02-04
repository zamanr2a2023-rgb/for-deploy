<!-- @format -->

# Commission Rate Not Changing - Issue Fixed

## 🐛 Problem Description

When admin changed a technician's commission rate via API, the rate appeared to update in the response, but when checking the technician's profile or calculating commissions, the system still used the default 5% rate.

### Why This Happened

The system has a **priority system** for commission rates:

1. **System Config Rate** (if `useCustomRate = false`) ← **This was being used!**
2. Individual Technician Rate (if `useCustomRate = true`)
3. Default Rate (0.05)

**The Root Cause:** When admin updated a technician's commission rate, the `useCustomRate` flag was **not being set to `true`**. This meant the system continued using the System Config rate (5%) instead of the custom rate.

---

## ✅ Solution Implemented

### Changed File: [src/services/admin.service.js](src/services/admin.service.js#L351-L390)

**What Was Fixed:**

- When admin sets a `commissionRate` or `bonusRate`, the system now automatically sets `useCustomRate: true`
- This ensures the custom rate is actually used in commission calculations
- Admin can still explicitly set `useCustomRate: false` to revert to system default

### Code Changes

**Before:**

```javascript
if (commissionRate !== undefined)
  updateData.commissionRate = Number(commissionRate);
if (bonusRate !== undefined) updateData.bonusRate = Number(bonusRate);
```

**After:**

```javascript
// If admin sets a custom commission rate, enable useCustomRate flag
if (commissionRate !== undefined) {
  updateData.commissionRate = Number(commissionRate);
  // Only set useCustomRate to true if not explicitly set to false
  if (useCustomRate !== false) {
    updateData.useCustomRate = true;
  }
}

// If admin sets a custom bonus rate, enable useCustomRate flag
if (bonusRate !== undefined) {
  updateData.bonusRate = Number(bonusRate);
  // Only set useCustomRate to true if not explicitly set to false
  if (useCustomRate !== false) {
    updateData.useCustomRate = true;
  }
}

// Allow explicit control of useCustomRate flag
if (useCustomRate !== undefined) {
  updateData.useCustomRate = useCustomRate;
}
```

---

## 📋 How to Use (Admin)

### Set Custom Commission Rate for Technician

**Endpoint:** `PATCH /api/admin/users/:id/profile`

**Example 1: Set 18% commission**

```bash
curl -X PATCH http://localhost:5000/api/admin/users/5/profile \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "commissionRate": 0.18
  }'
```

**Result:**

- ✅ Commission rate set to 18%
- ✅ `useCustomRate` automatically set to `true`
- ✅ This technician will now earn 18% commission
- ✅ Future system config changes won't affect this technician

**Example 2: Set 10% commission**

```bash
curl -X PATCH http://localhost:5000/api/admin/users/9/profile \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "commissionRate": 0.10
  }'
```

### Revert Technician to System Default Rate

If you want a technician to use the system default rate again:

```bash
curl -X PATCH http://localhost:5000/api/admin/users/5/profile \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "useCustomRate": false
  }'
```

**Result:**

- ✅ Technician will now use system default rate (currently 5%)
- ✅ If admin changes system rate in future, this technician will get the new rate

---

## 🧪 Testing the Fix

### Step 1: Check Current State

```bash
node test_commission_rate_fix.js
```

This shows all technicians with their rates and `useCustomRate` flags.

### Step 2: Update a Technician's Rate via Postman

**Request:**

```
PATCH /api/admin/users/5/profile
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "commissionRate": 0.18
}
```

**Expected Response:**

```json
{
  "id": 2,
  "userId": 5,
  "type": "FREELANCER",
  "commissionRate": 0.18,
  "bonusRate": 0.05,
  "useCustomRate": true,  ← Should be true now!
  "status": "ACTIVE",
  ...
}
```

### Step 3: Verify the Profile

```
GET /api/auth/profile
Authorization: Bearer <technician_token>
```

**Expected Response:**

```json
{
  "id": 5,
  "name": "Updated Name",
  "role": "TECH_FREELANCER",
  "technicianProfile": {
    "commissionRate": 0.18,  ← Should show 0.18
    "bonusRate": 0.05,
    "useCustomRate": true,
    ...
  }
}
```

### Step 4: Test Commission Calculation

When this technician completes a work order and payment is verified, the commission calculation will use 0.18 (18%) instead of the default 0.05 (5%).

**Example:**

- Work Order Payment: ৳5000
- Commission Rate: 18% (0.18)
- Commission Amount: ৳5000 × 0.18 = ৳900

---

## 🔍 How Commission Calculation Works Now

### Priority Order (src/services/commission.service.js)

The commission calculation checks in this order:

```javascript
// 1. Check if technician has custom rate enabled
if (techProfile.useCustomRate === true) {
  // Use individual technician's rate
  rate = techProfile.commissionRate; // or bonusRate for INTERNAL
}
// 2. Otherwise, use system config rate
else if (systemConfig?.freelancerCommissionRate) {
  rate = systemConfig.freelancerCommissionRate;
}
// 3. Fallback to default
else {
  rate = 0.05;
}
```

### Example Scenarios

**Scenario 1: Technician with Custom Rate**

- Technician: "Updated Name" (ID: 5)
- `useCustomRate`: `true`
- `commissionRate`: `0.18`
- **Result:** Earns **18% commission** on all work orders

**Scenario 2: Technician with System Default**

- Technician: "David Electrician" (ID: 9)
- `useCustomRate`: `false`
- `commissionRate`: `0.05` (from system config)
- **Result:** Earns **5% commission** (system default)

**Scenario 3: System Rate Changed**
If admin changes system rate to 7%:

```bash
PATCH /api/admin/system-config
{ "freelancerCommissionRate": 0.07 }
```

- "Updated Name" (useCustomRate=true): Still gets **18%** ✅
- "David Electrician" (useCustomRate=false): Now gets **7%** ✅

---

## 📚 Related Documentation

- [COMMISSION_RATE_MANAGEMENT.md](COMMISSION_RATE_MANAGEMENT.md) - Complete commission system guide
- [ADMIN_COMMISSION_QUICKREF.md](ADMIN_COMMISSION_QUICKREF.md) - Quick reference for admins
- [COMMISSION_FIX_SUMMARY.md](COMMISSION_FIX_SUMMARY.md) - Summary of 5% default setup

---

## ⚠️ Important Notes

1. **Rate Format**: Always use decimal (0.18 = 18%, not 18)
2. **Valid Range**: 0 to 1 (0% to 100%)
3. **Automatic Flag**: When setting custom rate, `useCustomRate` is automatically set to `true`
4. **System Protection**: Technicians with custom rates are protected from system-wide rate changes
5. **Revert Anytime**: Can revert to system default by setting `useCustomRate: false`

---

## 🎯 Quick Reference

### Set Custom Rate

```json
{
  "commissionRate": 0.18
}
```

✅ Automatically sets `useCustomRate: true`

### Revert to System Default

```json
{
  "useCustomRate": false
}
```

✅ Technician will use system default rate

### Change System Default for All

```json
PATCH /api/admin/system-config
{
  "freelancerCommissionRate": 0.07
}
```

✅ Only affects technicians with `useCustomRate: false`
