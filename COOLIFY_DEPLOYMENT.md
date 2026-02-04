<!-- @format -->

# 🚀 Coolify/Docker Deployment Configuration

## ⚠️ Critical: Environment Variable Configuration

When deploying to Coolify, Docker, or any containerized environment, you need to configure environment variables correctly.

### 🔧 Required Environment Variables

In your Coolify dashboard, go to your application → **Environment Variables** and add:

#### 1. **Build-Time Variables** (Uncheck "Available at Runtime" if possible)

These are needed during the build process:

```bash
NIXPACKS_NODE_VERSION=20
```

#### 2. **Runtime-Only Variables** (Check "Available at Runtime" only)

These should NOT be available during build:

```bash
# Database
DATABASE_URL=your-production-database-url

# Server Configuration
NODE_ENV=production
PORT=4000

# JWT
JWT_SECRET=your-production-jwt-secret-change-this

# BulkGate SMS API
BULKGATE_SMS_APP_ID=36014
BULKGATE_SMS_APP_TOKEN=mS6UavzDJQ8KoJ2NZlSGmFaiPSNhsdBML1wq2ngi8rXvoTw0Qv

# BulkGate OTP API
BULKGATE_OTP_APP_ID=36013
BULKGATE_OTP_APP_TOKEN=7ohN0WzblPga1tugpwCXiHiQweVB3GImpmCanFNZSLsyhL87yR

# Firebase Push Notifications
FIREBASE_PROJECT_ID=solosphere-ace49
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYour-Key-Here\n-----END PRIVATE KEY-----\n
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-88yo6@solosphere-ace49.iam.gserviceaccount.com

# Image Upload Service
IMAGE_UPLOAD_SERVICE_URL=https://img.mtscorporate.com
```

---

## 🐛 Common Deployment Issues & Fixes

### Issue 1: `npm ci` fails with "Missing: node-fetch from lock file"

**Cause:** package-lock.json was out of sync with package.json

**Fix:** ✅ Already fixed by running `npm install` and removing `node-fetch`

**What was changed:**

- Removed `node-fetch` dependency (Node.js 18+ has built-in fetch)
- Regenerated `package-lock.json`

### Issue 2: "NODE_ENV=development" warning during build

**Cause:** NODE_ENV is set to "development" during build time

**Fix:** In Coolify environment variables:

1. Find `NODE_ENV` variable
2. **Uncheck** "Available at Buildtime"
3. **Check** "Available at Runtime"
4. Set value to `production`

### Issue 3: "NIXPACKS_NODE_VERSION not set" warning

**Cause:** Coolify/Nixpacks defaults to Node.js 18

**Fix:** Add this as build-time variable:

```bash
NIXPACKS_NODE_VERSION=20
```

---

## 📋 Deployment Checklist

Before deploying:

- [x] ✅ Removed `node-fetch` from package.json
- [x] ✅ Updated package-lock.json (`npm install`)
- [ ] ⚠️ Set `NIXPACKS_NODE_VERSION=20` in Coolify
- [ ] ⚠️ Set `NODE_ENV=production` (runtime only) in Coolify
- [ ] ⚠️ Add all BulkGate credentials to Coolify environment variables
- [ ] ⚠️ Verify database URL is correct for production
- [ ] ⚠️ Change JWT_SECRET to a strong production secret
- [ ] ⚠️ Commit and push changes to Git

---

## 🔄 How to Deploy

### Step 1: Commit and Push Changes

```bash
git add package.json package-lock.json
git commit -m "fix: Remove node-fetch, use Node.js built-in fetch API"
git push origin main
```

### Step 2: Configure Coolify Environment Variables

1. Go to Coolify Dashboard
2. Select your application
3. Go to **Environment Variables** section
4. Add/Update variables as listed above
5. **Important:** Make sure to set correct "Buildtime" vs "Runtime" flags

### Step 3: Deploy

1. Go to Coolify Dashboard
2. Click **Deploy** or **Redeploy**
3. Monitor build logs
4. Wait for deployment to complete

### Step 4: Verify Deployment

```bash
# Check if API is running
curl https://outside1backend.mtscorporate.com/api/auth/health

# Test OTP endpoint
curl -X POST https://outside1backend.mtscorporate.com/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+8801718981009",
    "type": "REGISTRATION"
  }'
```

---

## 🔍 Debugging Failed Deployments

### View Build Logs in Coolify

1. Click on your application
2. Go to **Deployments** tab
3. Click on the failed deployment
4. Click **Show Debug Logs**

### Common Build Errors

#### Error: "Missing packages from lock file"

```
npm error Missing: package-name from lock file
```

**Fix:** Run `npm install` locally and commit package-lock.json

#### Error: "Cannot find module"

```
Error: Cannot find module 'module-name'
```

**Fix:** Make sure the package is in `dependencies` (not `devDependencies`)

#### Error: "Prisma Client not generated"

```
Error: Cannot find module '@prisma/client'
```

**Fix:** Add build command in Coolify:

```bash
npx prisma generate && npm start
```

---

## 🎯 Production Best Practices

### 1. Use Strong Secrets

```bash
# Generate a strong JWT secret
JWT_SECRET=$(openssl rand -base64 32)
```

### 2. Set NODE_ENV to production

```bash
NODE_ENV=production
```

### 3. Use Production Database

- Don't use development database in production
- Use connection pooling
- Enable SSL connections

### 4. Enable Security Headers

Already configured in the app with `helmet` middleware

### 5. Monitor Application

- Set up logging
- Monitor error rates
- Track API response times

---

## 📊 Post-Deployment Verification

After successful deployment, verify:

1. **API Health Check:**

   ```bash
   curl https://outside1backend.mtscorporate.com/api/auth/health
   ```

2. **OTP Functionality:**

   - Send OTP request
   - Check if SMS is received
   - Verify OTP works

3. **Database Connection:**

   - Check if API can query database
   - Test user registration/login

4. **Environment Variables:**
   - Check application logs
   - Verify all required variables are loaded

---

## 🆘 Still Having Issues?

### Check Application Logs

```bash
# In Coolify Dashboard
Go to your app → Logs → View Runtime Logs
```

### Test Locally First

```bash
# Make sure it works locally
npm install
npm start

# Test endpoints
curl http://localhost:4000/api/otp/send -X POST \
  -H "Content-Type: application/json" \
  -d '{"phone": "+8801718981009", "type": "REGISTRATION"}'
```

### Verify Git Repository

```bash
# Make sure all changes are committed
git status
git log --oneline -5
```

---

## ✅ Expected Successful Deployment

When deployment succeeds, you should see:

```
✅ Building docker image completed
✅ Starting container
✅ Health check passed
✅ Application is running on https://outside1backend.mtscorporate.com
```

Then test OTP:

- Send OTP request to production URL
- SMS should be received on phone
- Verify OTP should work

---

**Last Updated:** November 29, 2025
**Version:** 1.0
