/** @format */
import app from "./app.js";
import { initializeFirebase } from "./utils/firebase.js";
import { checkDatabaseConnection } from "./prisma.js";

try {
  initializeFirebase();
} catch (error) {
  console.error("❌ Failed to initialize Firebase:", error);
}

const startServer = async () => {
  const PORT = Number(process.env.PORT) || 5000;

  try {
    const dbConnected = await checkDatabaseConnection(3, 2000);
    if (!dbConnected) {
      console.warn("⚠️ DB not confirmed, starting server anyway.");
    }
  } catch (e) {
    console.warn("⚠️ DB check threw error, starting server anyway:", e?.message);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 FSM Server running on port ${PORT}`);
  });
};

startServer();
