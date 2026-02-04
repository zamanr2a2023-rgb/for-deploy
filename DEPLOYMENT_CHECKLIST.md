<!-- @format -->

# 🚀 Live Server Deployment Checklist

## ✅ Prerequisites

1. **Node.js Version**: Ensure Node.js 18+ is installed on live server
2. **Database**: PostgreSQL database accessible from live server
3. **BulkGate Account**: Active account with credits

---

## 📋 Step-by-Step Deployment Guide

### 1️⃣ **Environment Variables Setup**

On your **LIVE SERVER**, create/update the `.env` file with these variables:

```bash
# Database Configuration
DATABASE_URL="your-production-database-url"

# Server Configuration
NODE_ENV="production"
PORT=4000

# JWT Configuration
JWT_SECRET="your-production-jwt-secret"

# BulkGate SMS API - HTTP SMS API (for notifications)
BULKGATE_SMS_APP_ID="36014"
BULKGATE_SMS_APP_TOKEN="mS6UavzDJQ8KoJ2NZlSGmFaiPSNhsdBML1wq2ngi8rXvoTw0Qv"

# BulkGate OTP API - OTP Service (for verification codes)
BULKGATE_OTP_APP_ID="36013"
BULKGATE_OTP_APP_TOKEN="7ohN0WzblPga1tugpwCXiHiQweVB3GImpmCanFNZSLsyhL87yR"

# Firebase Push Notifications
FIREBASE_PROJECT_ID="solosphere-ace49"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Firebase-Private-Key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-88yo6@solosphere-ace49.iam.gserviceaccount.com"

# Image Upload Service
IMAGE_UPLOAD_SERVICE_URL="https://img.mtscorporate.com"
```

### 2️⃣ **Install Dependencies**

```bash
cd /path/to/your/project
npm install
```

### 3️⃣ **Database Migration**

```bash
npx prisma generate
npx prisma migrate deploy
```

### 4️⃣ **Start the Server**

**Option A: Using PM2 (Recommended for production)**

```bash
npm install -g pm2
pm2 start src/server.js --name "fsm-api"
pm2 save
pm2 startup
```

**Option B: Using npm**

```bash
npm start
```

**Option C: Using Node directly**

```bash
node src/server.js
```

---

## 🔍 Troubleshooting OTP Issues on Live Server

### Issue 1: "OTP not being sent on live server"

**Possible Causes:**

1. **Missing Environment Variables**

   ```bash
   # Check if environment variables are loaded
   echo $BULKGATE_SMS_APP_ID
   echo $BULKGATE_SMS_APP_TOKEN
   ```

2. **Firewall/Network Issues**

   - Ensure live server can reach `portal.bulkgate.com`
   - Test with: `curl https://portal.bulkgate.com`

3. **No BulkGate Credits**

   - Login to https://portal.bulkgate.com
   - Check "Balance" section
   - Purchase credits if balance is 0

4. **Wrong NODE_ENV**
   - Set `NODE_ENV=production` in live server
   - Check with: `echo $NODE_ENV`

### Issue 2: "SMS API returns 200 but no SMS received"

**Check BulkGate Response:**

```bash
# The API response should show:
{
  "price": 0.05,     # Should NOT be 0
  "credit": 9.95,    # Should show remaining balance
  "status": "accepted"
}
```

If `price: 0` and `credit: 0`, you have **no credits**.

### Issue 3: "Environment variables not loading"

**Solution 1: Verify .env file exists**

```bash
ls -la .env
cat .env | grep BULKGATE
```

**Solution 2: Manually load environment variables**

```bash
export BULKGATE_SMS_APP_ID="36014"
export BULKGATE_SMS_APP_TOKEN="mS6UavzDJQ8KoJ2NZlSGmFaiPSNhsdBML1wq2ngi8rXvoTw0Qv"
export BULKGATE_OTP_APP_ID="36013"
export BULKGATE_OTP_APP_TOKEN="7ohN0WzblPga1tugpwCXiHiQweVB3GImpmCanFNZSLsyhL87yR"
```

**Solution 3: Use PM2 with env file**

```bash
pm2 start src/server.js --name "fsm-api" --env production --update-env
```

---

## 🧪 Testing on Live Server

### Test 1: Check if server is running

```bash
curl http://localhost:4000/api/auth/health
# or if using different port
curl http://localhost:YOUR_PORT/api/auth/health
```

### Test 2: Send OTP Request

```bash
curl -X POST http://localhost:4000/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+8801718981009",
    "type": "REGISTRATION"
  }'
```

**Expected Response:**

```json
{
  "message": "OTP sent successfully",
  "code": "123456"
}
```

### Test 3: Check Server Logs

```bash
# If using PM2
pm2 logs fsm-api

# If using systemd
journalctl -u fsm-api -f

# If running directly
# Check terminal output
```

**Expected Logs:**

```
📱 Original phone: +8801718981009
📱 Formatted phone: 8801718981009
📤 Sending OTP SMS to 8801718981009...
✅ SMS sent successfully
💰 Price: 0.05
💳 Credit: 9.95
```

---

## 🔐 Security Best Practices

1. **Never commit `.env` file to Git**

   ```bash
   # Make sure .env is in .gitignore
   echo ".env" >> .gitignore
   ```

2. **Use different credentials for production**

   - Consider creating separate BulkGate app for production
   - Use different JWT_SECRET

3. **Set NODE_ENV to production**

   ```bash
   export NODE_ENV=production
   ```

4. **Restrict CORS origins**
   - Update `ALLOWED_ORIGINS` to only allow your frontend domains

---

## 📊 Monitoring

### Check BulkGate Balance Regularly

```bash
# Create a cron job to check balance daily
crontab -e

# Add this line (runs daily at 9 AM)
0 9 * * * /usr/bin/node /path/to/project/check-balance.js >> /var/log/bulkgate-balance.log
```

### Monitor Server Logs

```bash
# With PM2
pm2 monit

# View logs in real-time
pm2 logs fsm-api --lines 100
```

---

## 🆘 Quick Fix Commands

### Restart Server

```bash
pm2 restart fsm-api
# or
systemctl restart fsm-api
```

### Clear PM2 logs

```bash
pm2 flush
```

### Check environment variables

```bash
pm2 env 0
```

### Force reload environment variables

```bash
pm2 delete fsm-api
pm2 start src/server.js --name "fsm-api"
```

---

## 📞 Support

If OTP still doesn't work after following this guide:

1. **Check BulkGate Status**: https://status.bulkgate.com
2. **Contact BulkGate Support**: support@bulkgate.com
3. **Check Server Logs**: Look for error messages in PM2 logs
4. **Test API Directly**: Use the test scripts in the project

---

## ✅ Final Checklist

- [ ] `.env` file created on live server
- [ ] All BulkGate credentials added to `.env`
- [ ] `NODE_ENV=production` set
- [ ] Dependencies installed (`npm install`)
- [ ] Database migrated (`npx prisma migrate deploy`)
- [ ] Server started (PM2 or systemd)
- [ ] BulkGate account has credits
- [ ] Test OTP request sent successfully
- [ ] SMS received on test phone
- [ ] Server logs show no errors
- [ ] Monitoring set up (PM2 or similar)

---

**Last Updated**: November 29, 2025
**Version**: 1.0
