/** @format */

// src/prisma.js
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// Create Prisma client with connection retry logic
const createPrismaClient = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  return client;
};

export const prisma = createPrismaClient();

// Connection health check with retry
export const checkDatabaseConnection = async (retries = 3, delay = 2000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log("✅ Database connection established");
      return true;
    } catch (error) {
      console.warn(
        `⚠️ Database connection attempt ${attempt}/${retries} failed:`,
        error.message
      );
      if (attempt < retries) {
        console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  console.error("❌ Failed to connect to database after all retries");
  return false;
};

// Graceful shutdown handler
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});
