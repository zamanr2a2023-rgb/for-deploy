# 🚀 সার্ভার এবং ডাটাবেস সেটআপ গাইড (Bengali)

## প্রয়োজনীয় ধাপগুলো (Step by Step)

### ১. প্রোজেক্ট ফোল্ডারে যান

```bash
cd outside-project-backend
```

### ২. Dependencies ইনস্টল করুন

```bash
npm install
```

### ৩. `.env` ফাইল তৈরি করুন

প্রোজেক্ট রুটে (root folder) `.env` নামে একটি ফাইল তৈরি করুন এবং নিচের কন্টেন্ট যোগ করুন:

```env
# Database Configuration (PostgreSQL)
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# Server Configuration
NODE_ENV="development"
PORT=4000

# JWT Secret (কমপক্ষে ৩২ ক্যারেক্টারের একটি র্যান্ডম স্ট্রিং)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# BulkGate SMS API (Optional - OTP পাঠানোর জন্য)
BULKGATE_SMS_APP_ID="36014"
BULKGATE_SMS_APP_TOKEN="mS6UavzDJQ8KoJ2NZlSGmFaiPSNhsdBML1wq2ngi8rXvoTw0Qv"

# BulkGate OTP API (Optional - OTP verification এর জন্য)
BULKGATE_OTP_APP_ID="36013"
BULKGATE_OTP_APP_TOKEN="7ohN0WzblPga1tugpwCXiHiQweVB3GImpmCanFNZSLsyhL87yR"

# Firebase Push Notifications (Optional)
FIREBASE_PROJECT_ID="solosphere-ace49"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Key-Here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-88yo6@solosphere-ace49.iam.gserviceaccount.com"

# Image Upload Service (Optional)
IMAGE_UPLOAD_SERVICE_URL="https://img.mtscorporate.com"
```

### ৪. DATABASE_URL কীভাবে সেট করবেন?

#### Option A: Local PostgreSQL Database

আপনার যদি লোকাল PostgreSQL ইনস্টল করা থাকে:

```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/fsm_db"
```

**ব্যাখ্যা:**
- `postgres` = username (আপনার PostgreSQL username)
- `your_password` = password (আপনার PostgreSQL password)
- `localhost:5432` = host এবং port
- `fsm_db` = database name (আপনি যেকোনো নাম দিতে পারেন)

#### Option B: Remote Database (Production/Cloud)

```env
DATABASE_URL="postgresql://username:password@your-db-host.com:5432/database_name"
```

**উদাহরণ:**
- AWS RDS: `postgresql://admin:mypass@mydb.abc123.us-east-1.rds.amazonaws.com:5432/fsm_db`
- Railway: `postgresql://postgres:password@containers-us-west-123.railway.app:5432/railway`
- Supabase: `postgresql://postgres:password@db.abcdefgh.supabase.co:5432/postgres`

### ৫. Prisma Client Generate করুন

```bash
npm run prisma:generate
```

অথবা

```bash
npx prisma generate
```

### ৬. Database Migrations চালান

```bash
npm run prisma:migrate
```

অথবা

```bash
npx prisma migrate dev
```

এই কমান্ডটি:
- Database schema তৈরি করবে
- সব tables এবং relationships সেট করবে

### ৭. (Optional) Database Seed করুন

আপনি যদি sample data চান, তাহলে:

```bash
npm run prisma:seed
```

অথবা

```bash
node prisma/seed.js
```

### ৮. সার্ভার চালু করুন

#### Development Mode (Auto-reload সহ):

```bash
npm run dev
```

#### Production Mode:

```bash
npm start
```

অথবা

```bash
node src/server.js
```

### ৯. সার্ভার চেক করুন

ব্রাউজার বা Postman এ যান:
```
http://localhost:4000
```

আপনি যদি "🚀 FSM Server running on port 4000" মেসেজ দেখেন, তাহলে সব ঠিক!

---

## ⚠️ সাধারণ সমস্যা এবং সমাধান

### সমস্যা 1: "DATABASE_URL is not set"

**সমাধান:** `.env` ফাইল নিশ্চিত করুন যে project root এ আছে এবং `DATABASE_URL` properly set করা আছে।

### সমস্যা 2: "Can't reach database server"

**সমাধান:** 
- Database server running আছে কিনা চেক করুন
- Username, password, host, port সব ঠিক আছে কিনা
- Firewall/network issue আছে কিনা

### সমস্যা 3: "Database does not exist"

**সমাধান:** 
- PostgreSQL এ database create করুন:
  ```sql
  CREATE DATABASE fsm_db;
  ```

### সমস্যা 4: Migration Error

**সমাধান:**
- যদি error আসে, try করুন:
  ```bash
  npx prisma migrate reset
  npx prisma migrate dev
  ```

---

## 📝 Quick Checklist

- [ ] `npm install` সম্পন্ন
- [ ] `.env` ফাইল তৈরি করা হয়েছে
- [ ] `DATABASE_URL` সঠিকভাবে set করা হয়েছে
- [ ] Database server running আছে
- [ ] `npx prisma generate` চালানো হয়েছে
- [ ] `npx prisma migrate dev` চালানো হয়েছে
- [ ] `npm run dev` দিয়ে সার্ভার চালু হয়েছে

---

## 🔧 Database Connection String Format

```
postgresql://[username]:[password]@[host]:[port]/[database_name]?schema=[schema_name]
```

**উদাহরণ:**
```
postgresql://postgres:mypassword@localhost:5432/fsm_db
```

---

## 📚 আরও তথ্যের জন্য

- API Documentation: `API_DOCUMENTATION.md`
- Deployment Guide: `DEPLOYMENT_CHECKLIST.md`

---

**Note:** `.env` ফাইল কখনো git এ commit করবেন না! এটা security risk।

