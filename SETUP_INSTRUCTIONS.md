<!-- @format -->

# Freelancer Registration - Setup Instructions

## Quick Start

### Step 1: Stop the Current Server

If the server is running, stop it with `Ctrl+C` in the terminal.

### Step 2: Regenerate Prisma Client

```bash
npx prisma generate
```

### Step 3: Start the Server

```bash
npm run dev
```

### Step 4: Test the Registration Flow

```bash
node test-freelancer-registration.js
```

---

## What Changed?

1. **Database**: Added `metadataJson` field to OTP table
2. **API**:
   - Step 1 now accepts `name` parameter
   - Step 3 retrieves name from OTP metadata
   - Automatic technician profile creation
3. **Flow**: Complete 3-step registration matching UI mockup

---

## Test with Postman

1. Import collection: `Freelancer-Registration-3Step.postman_collection.json`
2. Run requests in order:
   - Step 1: Enter Name & Phone (Send OTP)
   - Step 2: Verify Phone (Verify OTP)
   - Step 3: Set Password (Create Account)
   - Get Profile (Verify Registration)

---

## Expected Result

After successful registration:

- User created with role: TECH_FREELANCER
- Technician profile created with 40% commission
- Wallet initialized with 0 balance
- JWT token returned for immediate login

---

## Need Help?

Check the comprehensive guides:

- API Documentation: `FREELANCER_REGISTRATION_FLOW.md`
- Implementation Details: `FREELANCER_REGISTRATION_IMPLEMENTATION.md`
- UI Guide: `UI_IMPLEMENTATION_GUIDE.md`

---

## Quick Test Commands

```bash
# Test Registration Flow
node test-freelancer-registration.js

# Check Database
npx prisma studio

# View Logs
npm run dev
```

---

**Note:** The server MUST be restarted after running `npx prisma generate` for the changes to take effect.
