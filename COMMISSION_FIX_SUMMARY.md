<!-- @format -->

# Commission Rate Fix - Summary

## ✅ What Was Done

### 1. Schema Update

- Updated [prisma/schema.prisma](prisma/schema.prisma#L381-L383) to set default `freelancerCommissionRate` to **0.05 (5%)**
- Previously it was 0.20 (20%) - now fixed to 0.05 (5%)

### 2. Database Update

- Ran [fix_commission_rate.js](fix_commission_rate.js) to update existing records
- System config now has 5% commission rate for both freelancers and internal employees
- Updated 2 freelancer profiles to 5% commission
- Updated 1 internal employee profile to 5% bonus

### 3. Current State

All technicians now use 5% rate except those with custom rates:

- **John Technician**: 5% bonus (Custom)
- **Updated Name**: 18% commission (Custom) ⚠️
- **David Electrician**: 5% commission (System Default) ✅
- **Pitam Chandra**: 5% commission (System Default) ✅
- **palash**: 5% bonus (System Default) ✅

---

## 🎯 How Admin Can Change Rates

### View Current Rates

```bash
GET /api/admin/system-config
```

### Update Rates

```bash
PATCH /api/admin/system-config
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "freelancerCommissionRate": 0.05,
  "internalEmployeeBonusRate": 0.05
}
```

**Example: Change to 7%**

```bash
curl -X PATCH http://localhost:5000/api/admin/system-config \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"freelancerCommissionRate": 0.07, "internalEmployeeBonusRate": 0.07}'
```

**Example: Change to 10%**

```bash
curl -X PATCH http://localhost:5000/api/admin/system-config \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"freelancerCommissionRate": 0.10, "internalEmployeeBonusRate": 0.10}'
```

---

## 📋 Important Notes

1. **Rate Format**: Use decimal (0.05 = 5%, 0.10 = 10%, etc.)
2. **Valid Range**: 0 to 1 (0% to 100%)
3. **Auto-Update**: When system config changes, all technicians with `useCustomRate = false` are updated automatically
4. **Custom Rates Protected**: Technicians with `useCustomRate = true` keep their individual rates

---

## 📚 Full Documentation

See [COMMISSION_RATE_MANAGEMENT.md](COMMISSION_RATE_MANAGEMENT.md) for complete documentation including:

- How commission calculation works
- Setting custom rates for individual technicians
- Common use cases and examples
- Troubleshooting guide

---

## 🔧 Useful Scripts

- **Fix/Reset Rates**: `node fix_commission_rate.js`
- **Verify Rates**: `node verify_commission.js`
- **Test Commission Flow**: `node test_commission_flow.js`

---

## ⚠️ Note About "Updated Name" User

The user "Updated Name" has a custom rate of 18%. If this should be 5%, you can either:

1. **Update via API**:

```bash
curl -X PATCH http://localhost:5000/api/admin/users/5/profile \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"useCustomRate": false}'
```

2. **Or keep custom rate** if this technician has a special agreement for higher commission.
