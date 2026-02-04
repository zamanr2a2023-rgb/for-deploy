<!-- @format -->

# Firebase Push Notifications - Complete Implementation Guide

## ✅ What's Been Implemented

### Backend Changes:

1. **Firebase Admin SDK** - Installed and configured
2. **Database Schema** - Added `fcmToken` field to User model
3. **Push Notification Service** - Created Firebase utilities
4. **Work Order Assignment** - Integrated push notifications with sound
5. **FCM Token Management** - API endpoints to register/remove tokens

---

## 🔥 Features

### ✅ Sound & Vibration

- Plays default notification sound on Android & iOS
- High priority notifications (bypass Do Not Disturb on some devices)
- Vibration enabled

### ✅ Works in Background/Locked

- Notifications appear even when app is closed
- Wakes up locked screen
- Shows in notification tray

### ✅ Notification Content

- Title: "🔔 New Job Assigned!"
- Body: Work order number and customer name
- Custom data payload with WO details

---

## 📱 Mobile App Integration (React Native)

### Step 1: Install Firebase Messaging

```bash
npm install @react-native-firebase/app @react-native-firebase/messaging
```

### Step 2: Configure Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **solosphere-ace49**
3. Add Android app (package name from app.json)
4. Download `google-services.json` → Place in `android/app/`
5. Add iOS app (bundle ID from app.json)
6. Download `GoogleService-Info.plist` → Place in `ios/`

### Step 3: Android Configuration

**android/build.gradle:**

```gradle
buildscript {
  dependencies {
    classpath 'com.google.gms:google-services:4.4.0'
  }
}
```

**android/app/build.gradle:**

```gradle
apply plugin: 'com.google.gms.google-services'

dependencies {
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
}
```

### Step 4: iOS Configuration

**ios/Podfile:**

```ruby
use_frameworks!
pod 'Firebase/Messaging'
```

Run: `cd ios && pod install`

### Step 5: Request Permission & Get Token

```javascript
// App.js or useEffect in main component
import messaging from "@react-native-firebase/messaging";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Request permission
async function requestUserPermission() {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log("✅ Notification permission granted");
    return true;
  }

  console.log("❌ Notification permission denied");
  return false;
}

// Get FCM token
async function getFCMToken() {
  try {
    const token = await messaging().getToken();
    console.log("📱 FCM Token:", token);
    return token;
  } catch (error) {
    console.error("Error getting FCM token:", error);
    return null;
  }
}

// Register token with backend
async function registerFCMToken(userToken) {
  const fcmToken = await getFCMToken();
  if (!fcmToken) return;

  try {
    const response = await fetch(
      "https://your-api.com/api/notifications/fcm-token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ fcmToken }),
      }
    );

    const result = await response.json();
    console.log("✅ FCM token registered:", result);
  } catch (error) {
    console.error("❌ Failed to register FCM token:", error);
  }
}

// Initialize on app start (after login)
export default function App() {
  useEffect(() => {
    const initialize = async () => {
      // Request permission
      const hasPermission = await requestUserPermission();
      if (!hasPermission) return;

      // Get user token from storage
      const userToken = await AsyncStorage.getItem("authToken");
      if (userToken) {
        // Register FCM token with backend
        await registerFCMToken(userToken);
      }

      // Listen for token refresh
      messaging().onTokenRefresh(async (newToken) => {
        console.log("🔄 FCM Token refreshed:", newToken);
        const userToken = await AsyncStorage.getItem("authToken");
        if (userToken) {
          await registerFCMToken(userToken);
        }
      });
    };

    initialize();
  }, []);

  return <YourApp />;
}
```

### Step 6: Handle Foreground Notifications

```javascript
// Listen for notifications while app is in foreground
useEffect(() => {
  const unsubscribe = messaging().onMessage(async (remoteMessage) => {
    console.log("🔔 Foreground notification:", remoteMessage);

    // Show local notification or update UI
    Alert.alert(
      remoteMessage.notification.title,
      remoteMessage.notification.body,
      [
        {
          text: "View Job",
          onPress: () => {
            // Navigate to work order details
            navigation.navigate("WorkOrderDetails", {
              woId: remoteMessage.data.woId,
            });
          },
        },
        { text: "Dismiss" },
      ]
    );
  });

  return unsubscribe;
}, []);
```

### Step 7: Handle Background/Quit Notifications

```javascript
// Handle notification when app is opened from notification
messaging().onNotificationOpenedApp((remoteMessage) => {
  console.log("📬 Notification opened app:", remoteMessage);

  // Navigate to work order
  navigation.navigate("WorkOrderDetails", {
    woId: remoteMessage.data.woId,
  });
});

// Check if app was opened from a notification (when app was quit)
messaging()
  .getInitialNotification()
  .then((remoteMessage) => {
    if (remoteMessage) {
      console.log("📬 App opened from notification:", remoteMessage);

      // Navigate to work order
      navigation.navigate("WorkOrderDetails", {
        woId: remoteMessage.data.woId,
      });
    }
  });
```

### Step 8: Background Handler (Android)

**index.js (root file):**

```javascript
import messaging from "@react-native-firebase/messaging";

// Background message handler
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log("🔔 Background notification:", remoteMessage);

  // Handle background logic if needed
  // This runs even when app is quit
});

// Rest of your app initialization
AppRegistry.registerComponent(appName, () => App);
```

---

## 🎯 Backend API Endpoints

### 1. Register FCM Token (After Login)

```bash
POST /api/notifications/fcm-token
Authorization: Bearer {token}
Content-Type: application/json

{
  "fcmToken": "eXaMpLe_fCm_ToKeN_fRoM_fIrEbAsE..."
}
```

**Response:**

```json
{
  "message": "FCM token registered successfully",
  "userId": 5
}
```

### 2. Remove FCM Token (On Logout)

```bash
DELETE /api/notifications/fcm-token
Authorization: Bearer {token}
```

**Response:**

```json
{
  "message": "FCM token removed successfully"
}
```

---

## 🔔 Notification Flow

### When Job is Assigned:

1. **Dispatcher assigns work order** → `POST /api/wos/:woId/assign`
2. **Backend triggers** → `notifyWOAssignment(technicianId, wo)`
3. **System sends:**
   - ✅ SMS notification (to phone number)
   - ✅ Push notification (if FCM token exists)
   - ✅ Database notification (stored in DB)
4. **Mobile app receives:**
   - 🔊 Plays notification sound
   - 📳 Vibrates device
   - 📱 Shows notification banner
   - 🔴 Badge count updates

---

## 🧪 Testing

### Test Push Notification

```bash
# 1. Login as technician
POST /api/auth/login
{
  "phone": "5555555555",
  "password": "tech123"
}

# 2. Register FCM token (from mobile app)
POST /api/notifications/fcm-token
Authorization: Bearer {token}
{
  "fcmToken": "YOUR_FCM_TOKEN_HERE"
}

# 3. Login as dispatcher
POST /api/auth/login
{
  "phone": "2222222222",
  "password": "dispatcher123"
}

# 4. Assign work order to technician
POST /api/wos/1/assign
Authorization: Bearer {dispatcherToken}
{
  "technicianId": 5
}

# 5. Check technician's phone - should receive push notification!
```

---

## 📊 Database Changes

### New Field in User Table:

```sql
ALTER TABLE "User" ADD COLUMN "fcmToken" TEXT;
```

**Migration Applied:** `20251216054029_add_fcm_token`

---

## 🔐 Environment Variables (Already Configured ✅)

```env
FIREBASE_PROJECT_ID=solosphere-ace49
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-88yo6@solosphere-ace49.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...
```

---

## 🎨 Notification Customization

### Change Notification Sound

**Android:**

```javascript
// In firebase.js, change:
android: {
  notification: {
    sound: 'custom_sound', // Place sound file in android/app/src/main/res/raw/
    channelId: 'job_assignments',
  },
}
```

**iOS:**

```javascript
// In firebase.js, change:
apns: {
  payload: {
    aps: {
      sound: 'custom_sound.wav', // Place in iOS project
    },
  },
}
```

### Change Notification Icon

**Android - AndroidManifest.xml:**

```xml
<meta-data
  android:name="com.google.firebase.messaging.default_notification_icon"
  android:resource="@drawable/ic_notification" />
<meta-data
  android:name="com.google.firebase.messaging.default_notification_color"
  android:resource="@color/notification_color" />
```

---

## 🚨 Troubleshooting

### No Notification Received?

1. **Check FCM token registered:**

   ```sql
   SELECT id, name, phone, fcmToken FROM "User" WHERE role IN ('TECH_INTERNAL', 'TECH_FREELANCER');
   ```

2. **Check Firebase console:**

   - Go to Firebase Console → Cloud Messaging
   - Send test message to token
   - Verify token is valid

3. **Check app permissions:**

   - Android: Settings → Apps → Your App → Notifications → Enabled
   - iOS: Settings → Notifications → Your App → Allow Notifications

4. **Check server logs:**
   ```
   ✅ Push notification sent successfully: projects/.../messages/...
   OR
   ❌ Error sending push notification: [error details]
   ```

### Sound Not Playing?

1. **Android:** Check notification channel settings
2. **iOS:** Check sound file exists in project
3. **Both:** Verify device not on silent mode

---

## 📝 Complete Code Files

### Files Created/Modified:

1. ✅ **src/utils/firebase.js** - Firebase Admin SDK setup
2. ✅ **src/services/notification.service.js** - Added push notification
3. ✅ **src/controllers/notification.controller.js** - FCM token endpoints
4. ✅ **src/routes/notification.routes.js** - FCM routes
5. ✅ **src/server.js** - Initialize Firebase on startup
6. ✅ **prisma/schema.prisma** - Added fcmToken field

---

## 🎯 Summary

### ✅ Backend Ready:

- Firebase Admin SDK initialized
- Push notifications integrated with job assignment
- FCM token management endpoints
- Sound & high priority enabled
- Works in background/locked

### 📱 Mobile App TODO:

1. Install Firebase packages
2. Configure Android/iOS
3. Request notification permission
4. Get FCM token on login
5. Register token with backend API
6. Handle foreground/background notifications
7. Navigate to job details when notification tapped

### 🔔 Notification Behavior:

- **App Open:** Alert/banner in app
- **App Background:** Notification in tray with sound
- **App Closed:** Notification in tray with sound
- **Screen Locked:** Notification on lock screen with sound

---

**Last Updated:** December 16, 2025  
**Status:** ✅ Backend Complete - Ready for Mobile Integration
