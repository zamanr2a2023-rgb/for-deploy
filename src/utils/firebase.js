/** @format */

// /** @format */

// // src/utils/firebase.js
// import admin from "firebase-admin";

// // Initialize Firebase Admin SDK
// let firebaseApp = null;

// export const initializeFirebase = () => {
//   try {
//     if (!firebaseApp) {
//       const serviceAccount = {
//         projectId: process.env.FIREBASE_PROJECT_ID,
//         clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
//         privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
//       };

//       firebaseApp = admin.initializeApp({
//         credential: admin.credential.cert(serviceAccount),
//       });

//       console.log("✅ Firebase Admin SDK initialized successfully");
//     }
//     return firebaseApp;
//   } catch (error) {
//     console.error("❌ Firebase initialization error:", error);
//     throw error;
//   }
// };

// // Get Firebase Messaging instance
// export const getFirebaseMessaging = () => {
//   if (!firebaseApp) {
//     initializeFirebase();
//   }
//   return admin.messaging();
// };

// /**
//  * Send push notification to a single device
//  * @param {string} fcmToken - Device FCM token
//  * @param {Object} notification - Notification payload (title, body)
//  * @param {Object} data - Data payload (optional)
//  */
// export const sendPushNotification = async (
//   fcmToken,
//   notification,
//   data = {}
// ) => {
//   try {
//     const messaging = getFirebaseMessaging();

//     // Generate a unique notification tag to prevent duplicates
//     const notificationTag = data.notificationId
//       ? `notif_${data.notificationId}`
//       : `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`;

//     const notificationPayload = {
//       title: notification.title,
//       body: notification.body,
//     };

//     // Only add imageUrl if it exists
//     if (notification.imageUrl) {
//       notificationPayload.imageUrl = notification.imageUrl;
//     }

//     const message = {
//       token: fcmToken,
//       notification: notificationPayload,
//       data: {
//         // Include all data as strings
//         ...Object.fromEntries(
//           Object.entries(data).map(([k, v]) => [k, String(v)])
//         ),
//         // Add title and body to data for app to use
//         title: notification.title || "",
//         body: notification.body || "",
//         // Flag to identify this came from push (app should not show duplicate from data)
//         source: "fcm_push",
//         timestamp: new Date().toISOString(),
//         // Include tag in data so app can use it for deduplication
//         notificationTag: notificationTag,
//       },
//       android: {
//         priority: "high",
//         notification: {
//           sound: "default",
//           channelId: "high_importance_channel",
//           priority: "high",
//           defaultSound: true,
//           defaultVibrateTimings: true,
//           // Use notification tag to prevent duplicates - same tag = replace previous notification
//           tag: notificationTag,
//         },
//         // Collapse key for message deduplication (groups messages with same key)
//         collapseKey: data.notificationId
//           ? `collapse_${data.notificationId}`
//           : undefined,
//       },
//       apns: {
//         payload: {
//           aps: {
//             sound: "default",
//             badge: 1,
//             contentAvailable: true,
//             category: data.type || "DEFAULT",
//             // Thread ID to group related notifications
//             threadId: data.woNumber || data.type || "default",
//           },
//         },
//         headers: {
//           // iOS collapse ID header for deduplication
//           ...(data.notificationId && {
//             "apns-collapse-id": `collapse_${data.notificationId}`,
//           }),
//         },
//       },
//     };

//     const response = await messaging.send(message);
//     console.log("✅ Push notification sent successfully:", response);
//     console.log("📱 Notification details:", {
//       title: notification.title,
//       body: notification.body,
//       dataType: data.type,
//       notificationId: data.notificationId,
//       notificationTag: notificationTag,
//     });
//     return response;
//   } catch (error) {
//     // Check if token is invalid before logging
//     const invalidTokenCodes = [
//       "messaging/invalid-registration-token",
//       "messaging/registration-token-not-registered",
//       "messaging/invalid-argument",
//       "messaging/unsupported-registration-token",
//       "messaging/mismatched-credential", // SenderId mismatch - token from different Firebase project
//     ];

//     const isInvalidToken =
//       invalidTokenCodes.includes(error.code) ||
//       error.message?.includes("not a valid FCM registration token") ||
//       error.message?.includes("Invalid registration token");

//     if (isInvalidToken) {
//       console.error("❌ Invalid FCM token detected:", {
//         tokenPreview: fcmToken ? `${fcmToken.substring(0, 30)}...` : "missing",
//         errorCode: error.code,
//         errorMessage: error.message,
//       });
//     } else {
//       console.error("❌ Error sending push notification:", error);
//       console.error("Failed message details:", {
//         token: fcmToken ? `${fcmToken.substring(0, 20)}...` : "missing",
//         title: notification.title,
//         errorCode: error.code,
//         errorMessage: error.message,
//       });
//     }
//     throw error;
//   }
// };

// /**
//  * Send push notification to multiple devices
//  * @param {string[]} fcmTokens - Array of device FCM tokens
//  * @param {Object} notification - Notification payload
//  * @param {Object} data - Data payload (optional)
//  */
// export const sendPushNotificationToMultiple = async (
//   fcmTokens,
//   notification,
//   data = {}
// ) => {
//   try {
//     const messaging = getFirebaseMessaging();

//     const message = {
//       tokens: fcmTokens,
//       notification: {
//         title: notification.title,
//         body: notification.body,
//       },
//       data: {
//         ...data,
//         ...(data.woId && { woId: String(data.woId) }),
//         ...(data.woNumber && { woNumber: String(data.woNumber) }),
//       },
//       android: {
//         priority: "high",
//         notification: {
//           sound: "default",
//           channelId: "high_importance_channel", // Match Flutter app channel ID
//           priority: "high",
//         },
//       },
//       apns: {
//         payload: {
//           aps: {
//             sound: "default",
//             badge: 1,
//           },
//         },
//       },
//     };

//     const response = await messaging.sendEachForMulticast(message);
//     console.log(
//       `✅ Push notifications sent: ${response.successCount} successful, ${response.failureCount} failed`
//     );
//     return response;
//   } catch (error) {
//     console.error("❌ Error sending push notifications:", error);
//     throw error;
//   }
// };

// export default {
//   initializeFirebase,
//   getFirebaseMessaging,
//   sendPushNotification,
//   sendPushNotificationToMultiple,
// };

/** @format */

// src/utils/firebase.js
import admin from "firebase-admin";

// Initialize Firebase Admin SDK
let firebaseApp = null;

export const initializeFirebase = () => {
  try {
    if (!firebaseApp) {
      // Get and fix the private key format
      let privateKey;

      // Try base64 encoded key first (most reliable for deployment)
      if (process.env.FIREBASE_PRIVATE_KEY_BASE64) {
        try {
          privateKey = Buffer.from(
            process.env.FIREBASE_PRIVATE_KEY_BASE64,
            "base64"
          ).toString("utf8");
          console.log("✅ Using base64-encoded private key");
        } catch (error) {
          console.log("⚠️  Failed to decode base64 key, trying regular key");
        }
      }

      // Fall back to regular private key
      if (!privateKey && process.env.FIREBASE_PRIVATE_KEY) {
        privateKey = process.env.FIREBASE_PRIVATE_KEY;

        // Remove surrounding quotes if present
        privateKey = privateKey.replace(/^["']|["']$/g, "");

        // Replace escaped newlines with actual newlines
        privateKey = privateKey.replace(/\\n/g, "\n");

        console.log("✅ Using regular private key from FIREBASE_PRIVATE_KEY");
      }

      // Validate private key if we have one
      if (privateKey) {
        // Log the last 50 characters to see what's there
        console.log("🔑 Private key format check:");
        console.log(
          `   Starts with BEGIN: ${privateKey.startsWith(
            "-----BEGIN PRIVATE KEY-----"
          )}`
        );
        console.log(
          `   Ends with END: ${privateKey
            .trim()
            .endsWith("-----END PRIVATE KEY-----")}`
        );
        console.log(`   Key length: ${privateKey.length} characters`);
        console.log(`   Last 60 chars: "${privateKey.slice(-60)}"`);

        // If key doesn't end properly, it might be truncated - try to fix it
        if (!privateKey.trim().endsWith("-----END PRIVATE KEY-----")) {
          // Check if it ends with a partial "END PRIVATE KEY" string
          const trimmedKey = privateKey.trim();
          console.log(
            "⚠️  Key appears truncated, checking for partial ending..."
          );

          // If the key content looks complete (ends with = or ==), add the missing footer
          if (
            trimmedKey.endsWith("=") ||
            trimmedKey.endsWith("==") ||
            /[A-Za-z0-9+/]$/.test(trimmedKey)
          ) {
            // The base64 content is there but footer is missing
            if (!trimmedKey.includes("-----END PRIVATE KEY-----")) {
              privateKey = trimmedKey + "\n-----END PRIVATE KEY-----\n";
              console.log("🔧 Added missing END PRIVATE KEY footer");
            }
          }
        }
      } else {
        console.log("⚠️  FIREBASE_PRIVATE_KEY environment variable is not set");
      }

      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      };

      console.log("🔥 Firebase config:");
      console.log(`   Project ID: ${serviceAccount.projectId || "NOT SET"}`);
      console.log(
        `   Client Email: ${serviceAccount.clientEmail || "NOT SET"}`
      );

      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      console.log("✅ Firebase Admin SDK initialized successfully");
    }
    return firebaseApp;
  } catch (error) {
    console.error("❌ Firebase initialization error:", error);
    throw error;
  }
};

// Get Firebase Messaging instance
export const getFirebaseMessaging = () => {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.messaging();
};

/**
 * Send push notification to a single device
 * @param {string} fcmToken - Device FCM token
 * @param {Object} notification - Notification payload (title, body)
 * @param {Object} data - Data payload (optional)
 */
export const sendPushNotification = async (
  fcmToken,
  notification,
  data = {}
) => {
  try {
    const messaging = getFirebaseMessaging();

    // Generate a unique notification tag to prevent duplicates
    const notificationTag = data.notificationId
      ? `notif_${data.notificationId}`
      : `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const notificationPayload = {
      title: notification.title,
      body: notification.body,
    };

    // Only add imageUrl if it exists
    if (notification.imageUrl) {
      notificationPayload.imageUrl = notification.imageUrl;
    }

    const message = {
      token: fcmToken,
      notification: notificationPayload,
      data: {
        // Include all data as strings
        ...Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)])
        ),
        // Add title and body to data for app to use
        title: notification.title || "",
        body: notification.body || "",
        // Flag to identify this came from push (app should not show duplicate from data)
        source: "fcm_push",
        timestamp: new Date().toISOString(),
        // Include tag in data so app can use it for deduplication
        notificationTag: notificationTag,
        // Force show notification even when app is in foreground
        forceShow: "true",
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "high_importance_channel",
          priority: "high",
          defaultSound: true,
          defaultVibrateTimings: true,
          // Use notification tag to prevent duplicates - same tag = replace previous notification
          tag: notificationTag,
          // Show notification even when app is in foreground
          visibility: "public",
        },
        // Collapse key for message deduplication (groups messages with same key)
        collapseKey: data.notificationId
          ? `collapse_${data.notificationId}`
          : undefined,
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
            contentAvailable: true,
            mutableContent: true, // Allow app to modify notification before displaying
            category: data.type || "DEFAULT",
            // Thread ID to group related notifications
            threadId: data.woNumber || data.type || "default",
            alert: {
              title: notification.title,
              body: notification.body,
            },
          },
        },
        headers: {
          // iOS collapse ID header for deduplication
          ...(data.notificationId && {
            "apns-collapse-id": `collapse_${data.notificationId}`,
          }),
        },
      },
    };

    const response = await messaging.send(message);
    console.log("✅ Push notification sent successfully:", response);
    console.log("📱 Notification details:", {
      title: notification.title,
      body: notification.body,
      dataType: data.type,
      notificationId: data.notificationId,
      notificationTag: notificationTag,
    });
    return response;
  } catch (error) {
    // Check if token is invalid before logging
    const invalidTokenCodes = [
      "messaging/invalid-registration-token",
      "messaging/registration-token-not-registered",
      "messaging/invalid-argument",
      "messaging/unsupported-registration-token",
      "messaging/mismatched-credential", // SenderId mismatch - token from different Firebase project
    ];

    const isInvalidToken =
      invalidTokenCodes.includes(error.code) ||
      error.message?.includes("not a valid FCM registration token") ||
      error.message?.includes("Invalid registration token");

    if (isInvalidToken) {
      console.error("❌ Invalid FCM token detected:", {
        tokenPreview: fcmToken ? `${fcmToken.substring(0, 30)}...` : "missing",
        errorCode: error.code,
        errorMessage: error.message,
      });
    } else {
      console.error("❌ Error sending push notification:", error);
      console.error("Failed message details:", {
        token: fcmToken ? `${fcmToken.substring(0, 20)}...` : "missing",
        title: notification.title,
        errorCode: error.code,
        errorMessage: error.message,
      });
    }
    throw error;
  }
};

/**
 * Send push notification to multiple devices
 * @param {string[]} fcmTokens - Array of device FCM tokens
 * @param {Object} notification - Notification payload
 * @param {Object} data - Data payload (optional)
 */
export const sendPushNotificationToMultiple = async (
  fcmTokens,
  notification,
  data = {}
) => {
  try {
    const messaging = getFirebaseMessaging();

    const message = {
      tokens: fcmTokens,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        ...data,
        ...(data.woId && { woId: String(data.woId) }),
        ...(data.woNumber && { woNumber: String(data.woNumber) }),
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "high_importance_channel", // Match Flutter app channel ID
          priority: "high",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
    };

    const response = await messaging.sendEachForMulticast(message);
    console.log(
      `✅ Push notifications sent: ${response.successCount} successful, ${response.failureCount} failed`
    );
    return response;
  } catch (error) {
    console.error("❌ Error sending push notifications:", error);
    throw error;
  }
};

export default {
  initializeFirebase,
  getFirebaseMessaging,
  sendPushNotification,
  sendPushNotificationToMultiple,
};
