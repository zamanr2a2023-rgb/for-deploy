# 🗄️ Local Database Setup Guide (Bengali)

## Windows এ PostgreSQL Setup করার ধাপগুলো

### ধাপ ১: PostgreSQL ইনস্টল করুন

#### Option A: PostgreSQL ডাউনলোড করুন (আনুষ্ঠানিক)

1. **PostgreSQL official website** থেকে ডাউনলোড করুন:
   - https://www.postgresql.org/download/windows/
   - বা সরাসরি: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads

2. **Installer** চালান এবং follow করুন:
   - Port: `5432` (default)
   - Username: `postgres` (default, বা আপনার পছন্দের username)
   - Password: একটি শক্তিশালী password set করুন (এটা মনে রাখবেন!)
   - Database: default `postgres` database create হবে

#### Option B: Chocolatey ব্যবহার করুন (যদি installed থাকে)

```powershell
choco install postgresql
```

### ধাপ ২: PostgreSQL Service চালু আছে কিনা চেক করুন

PowerShell বা Command Prompt এ:

```powershell
# Service status check
Get-Service -Name postgresql*

# বা Services panel থেকে check করুন:
# Win + R → services.msc → "postgresql" search করুন
```

### ধাপ ৩: Database তৈরি করুন

**Option A: pgAdmin ব্যবহার করুন (GUI - সহজ)**

1. **pgAdmin 4** খুলুন (PostgreSQL এর সাথে installed)
2. Server এ connect করুন (আপনার password দিয়ে)
3. **Databases** → Right click → **Create** → **Database**
4. Database name দিন: `fsm_db` (বা আপনার পছন্দের নাম)
5. **Save** করুন

**Option B: Command Line ব্যবহার করুন**

```powershell
# PostgreSQL bin folder এ যান (default location)
cd "C:\Program Files\PostgreSQL\16\bin"

# psql এ login করুন
.\psql.exe -U postgres

# Password দিন (typing দেখা যাবে না, এটা normal)
# তারপর database create করুন:
CREATE DATABASE fsm_db;

# Exit করতে
\q
```

**Option C: এক লাইনে database create করুন**

```powershell
# Replace 'your_password' আপনার actual password দিয়ে
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE fsm_db;"
```

### ধাপ ৪: Project Folder এ `.env` ফাইল তৈরি করুন

Project root folder এ (যেখানে `package.json` আছে) `.env` নামে একটি file তৈরি করুন:

```env
# Database Configuration - আপনার database details দিয়ে replace করুন
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/fsm_db"

# Server Configuration
NODE_ENV="development"
PORT=4000

# JWT Secret (কমপক্ষে ৩২ ক্যারেক্টারের random string)
JWT_SECRET="my-super-secret-jwt-key-for-development-only-change-in-production"

# Optional: BulkGate SMS API (OTP পাঠানোর জন্য)
BULKGATE_SMS_APP_ID="36014"
BULKGATE_SMS_APP_TOKEN="mS6UavzDJQ8KoJ2NZlSGmFaiPSNhsdBML1wq2ngi8rXvoTw0Qv"

# Optional: BulkGate OTP API
BULKGATE_OTP_APP_ID="36013"
BULKGATE_OTP_APP_TOKEN="7ohN0WzblPga1tugpwCXiHiQweVB3GImpmCanFNZSLsyhL87yR"

# Optional: Firebase (যদি push notification চান)
FIREBASE_PROJECT_ID="solosphere-ace49"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Key-Here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-88yo6@solosphere-ace49.iam.gserviceaccount.com"

# Optional: Image Upload Service
IMAGE_UPLOAD_SERVICE_URL="https://img.mtscorporate.com"
```

**⚠️ Important:**
- `YOUR_PASSWORD` replace করুন আপনার PostgreSQL password দিয়ে
- Database name `fsm_db` না হলে, আপনার database name use করুন
- Username `postgres` না হলে, আপনার username use করুন

### ধাপ ৫: Dependencies Install করুন

```powershell
npm install
```

### ধাপ ৬: Prisma Client Generate করুন

```powershell
npm run prisma:generate
```

অথবা

```powershell
npx prisma generate
```

### ধাপ ৭: Database Migrations Run করুন

এটা সব tables এবং relationships create করবে:

```powershell
npm run prisma:migrate
```

অথবা

```powershell
npx prisma migrate dev
```

যদি error আসে যে "migration already applied", তাহলে:

```powershell
npx prisma migrate deploy
```

### ধাপ ৮: (Optional) Sample Data Seed করুন

আপনি যদি test data চান (users, categories, services, etc.):

```powershell
npm run prisma:seed
```

অথবা

```powershell
node prisma/seed.js
```

### ধাপ ৯: Server Run করুন

**Development mode** (auto-reload সহ):

```powershell
npm run dev
```

**Production mode**:

```powershell
npm start
```

### ধাপ ১০: Server Check করুন

Browser বা Postman এ যান:
```
http://localhost:4000
```

আপনি যদি console এ দেখেন: `🚀 FSM Server running on port 4000`, তাহলে সব ঠিক! ✅

---

## 🔧 Common Issues এবং Solutions

### Issue 1: "psql: command not found"

**সমাধান:** PostgreSQL bin folder path system PATH এ add করুন, অথবা full path use করুন:

```powershell
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres
```

### Issue 2: "password authentication failed"

**সমাধান:** 
- Password ভুল দেওয়া হয়েছে
- `.env` file এ `DATABASE_URL` এ password সঠিকভাবে escape করুন
- Special characters থাকলে, password quotes এর মধ্যে রাখুন

### Issue 3: "database does not exist"

**সমাধান:** 
- Database create করেছেন কিনা check করুন
- `.env` file এ database name সঠিক আছে কিনা check করুন

### Issue 4: "Connection refused" বা "ECONNREFUSED"

**সমাধান:**
- PostgreSQL service running আছে কিনা check করুন:
  ```powershell
  Get-Service -Name postgresql*
  ```
- যদি stopped থাকে, start করুন:
  ```powershell
  Start-Service postgresql-x64-16  # Version number আপনার মতো হতে পারে
  ```

### Issue 5: "Port 5432 already in use"

**সমাধান:**
- অন্য application port 5432 use করছে
- PostgreSQL different port এ run করতে পারেন (তখন DATABASE_URL এ port change করুন)

---

## 📝 Quick Command Reference

```powershell
# Database create (one line)
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE fsm_db;"

# Dependencies install
npm install

# Prisma generate
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database (optional)
npm run prisma:seed

# Start server (development)
npm run dev

# Start server (production)
npm start
```

---

## ✅ Setup Checklist

- [ ] PostgreSQL installed
- [ ] PostgreSQL service running
- [ ] Database `fsm_db` created
- [ ] `.env` file created with correct `DATABASE_URL`
- [ ] `npm install` completed
- [ ] `npm run prisma:generate` completed
- [ ] `npm run prisma:migrate` completed successfully
- [ ] `npm run dev` started without errors
- [ ] Server responding at `http://localhost:4000`

---

## 🎯 Test Credentials (Seed Data থেকে)

যদি আপনি `npm run prisma:seed` চালান, তাহলে এই credentials use করতে পারেন:

| Role | Phone | Password |
|------|-------|----------|
| Admin | 1111111111 | admin123 |
| Dispatcher | 2222222222 | dispatcher123 |
| Call Center | 3333333333 | callcenter123 |
| Internal Tech | 4444444444 | tech123 |
| Freelancer | 5555555555 | freelancer123 |
| Customer | 9999999999 | customer123 |

---

## 📚 Additional Resources

- Prisma Studio (Database GUI): `npm run prisma:studio`
- API Documentation: `API_DOCUMENTATION.md`
- Setup Instructions: `SETUP_GUIDE_BN.md`

---

**Note:** `.env` file কখনো git এ commit করবেন না! Security risk।

