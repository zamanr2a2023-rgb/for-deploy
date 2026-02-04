/** @format */

// src/server.js
import app from "./app.js";
import { PORT } from "./config/env.js";
import { initializeFirebase } from "./utils/firebase.js";
import { checkDatabaseConnection } from "./prisma.js";

// Initialize Firebase Admin SDK for push notifications
try {
  initializeFirebase();
} catch (error) {
  console.error("❌ Failed to initialize Firebase:", error);
}

// Start server with database connection check
const startServer = async () => {
  // Check database connection before starting
  const dbConnected = await checkDatabaseConnection(3, 2000);

  if (!dbConnected) {
    console.warn(
      "⚠️ Starting server without confirmed database connection. Some features may be unavailable."
    );
  }

  app.listen(PORT, () => {
    console.log(`🚀 FSM Server running on port ${PORT}`);
  });
};

startServer();
