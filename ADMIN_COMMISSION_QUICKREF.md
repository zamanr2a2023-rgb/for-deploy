<!-- @format -->

# Quick Reference - Admin Commission Rate Management

## 🎯 Default Setting

- **Commission Rate**: Fixed at **5% (0.05)** for all technicians
- Can be changed by admin anytime via API

---

## 📡 Admin API Endpoints

### Get Current Rate

```
GET /api/admin/system-config
Authorization: Bearer <admin_token>
```

### Update Rate

```
PATCH /api/admin/system-config
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "freelancerCommissionRate": 0.05
}
```

---

## 💡 Examples

### Set 5% (default)

```json
{ "freelancerCommissionRate": 0.05 }
```

### Set 7%

```json
{ "freelancerCommissionRate": 0.07 }
```

### Set 10%

```json
{ "freelancerCommissionRate": 0.1 }
```

### Set 12.5%

```json
{ "freelancerCommissionRate": 0.125 }
```

---

## ⚠️ Important

- Rate must be between **0 and 1** (0% to 100%)
- Use decimal format: `0.05` = 5%, `0.10` = 10%
- Changes apply automatically to all technicians (except those with custom rates)

---

## 📚 More Info

- Full guide: [COMMISSION_RATE_MANAGEMENT.md](COMMISSION_RATE_MANAGEMENT.md)
- Summary: [COMMISSION_FIX_SUMMARY.md](COMMISSION_FIX_SUMMARY.md)
