# 🔧 `.env` File Firebase Credentials Update Guide

## 📋 যা Update করতে হবে

আপনার `google-services.json` file এ এখন:
- **Project ID**: `ibacos-services`
- **Project Number**: `548271692184`

তাই `.env` file এ Firebase credentials update করতে হবে।

---

## ✅ Step 1: Firebase Console থেকে Service Account Key Download করুন

1. **Firebase Console এ যান:**
   - https://console.firebase.google.com/project/ibacos-services/settings/serviceaccounts/adminsdk

2. **Service Account Key Generate করুন:**
   - "Generate new private key" button click করুন
   - JSON file download হবে

3. **JSON file open করুন** এবং নিচের information note করুন:
   - `project_id`: `ibacos-services`
   - `client_email`: `firebase-adminsdk-xxxxx@ibacos-services.iam.gserviceaccount.com`
   - `private_key`: `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n`

---

## ✅ Step 2: `.env` File Update করুন

`outside-project-backend/.env` file এ Firebase section update করুন:

### ❌ **পুরানো (ভুল):**
```env
FIREBASE_PROJECT_ID=com.ibacos.services
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@acceleratecyber-d30ee.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n[পুরানো key]\n-----END PRIVATE KEY-----\n
```

### ✅ **নতুন (সঠিক):**
```env
FIREBASE_PROJECT_ID="ibacos-services"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@ibacos-services.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n[নতুন key JSON file থেকে copy করুন]\n-----END PRIVATE KEY-----\n"
```

---

## 📝 **Complete Firebase Section Example:**

```env
# Firebase Push Notifications
FIREBASE_PROJECT_ID="ibacos-services"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@ibacos-services.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDgDImcVn7mhgRy\n...\n[পুরো key এখানে paste করুন]\n...\n-----END PRIVATE KEY-----\n"
```

---

## ⚠️ **Important Notes:**

1. **Project ID:** `com.ibacos.services` নয়, `ibacos-services` হবে (package name নয়!)

2. **Private Key Format:**
   - JSON file থেকে `private_key` field copy করুন
   - `\n` characters intact রাখুন
   - Quotes (`"`) দিয়ে wrap করুন

3. **Client Email Format:**
   - Email address quotes দিয়ে wrap করুন
   - Format: `firebase-adminsdk-xxxxx@ibacos-services.iam.gserviceaccount.com`

---

## ✅ Step 3: Backend Restart করুন

`.env` file update করার পর:

```bash
cd outside-project-backend
# Server restart করুন
npm start
```

---

## 🧪 Step 4: Test করুন

Backend restart করার পর logs check করুন:

```
✅ Firebase Admin SDK initialized successfully
```

যদি error দেখেন:
```
❌ Firebase initialization error: ...
```

তাহলে `.env` file এর credentials check করুন।

---

## 📋 **Quick Checklist:**

- [ ] Firebase Console থেকে service account key download করা হয়েছে
- [ ] `FIREBASE_PROJECT_ID="ibacos-services"` set করা হয়েছে
- [ ] `FIREBASE_CLIENT_EMAIL` নতুন project এর email set করা হয়েছে
- [ ] `FIREBASE_PRIVATE_KEY` নতুন key set করা হয়েছে
- [ ] Backend restart করা হয়েছে
- [ ] Firebase initialization success message দেখা যাচ্ছে

---

## 🔗 **Useful Links:**

- Firebase Console: https://console.firebase.google.com/project/ibacos-services
- Service Accounts: https://console.firebase.google.com/project/ibacos-services/settings/serviceaccounts/adminsdk
- Project Settings: https://console.firebase.google.com/project/ibacos-services/settings/general

